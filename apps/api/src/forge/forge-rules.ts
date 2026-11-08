import {
    accrueProduction,
    buyAwakenedEmber,
    resumeAfterAbsence,
    strikeForge,
    upgradeForge,
    type ForgeState,
    type StrikeWindow,
} from "@relic-forge/game-engine";

// ---------------------------------------------------------------
// Règles propres au serveur. Les calculs du jeu restent dans le
// moteur partagé : ce fichier décide seulement QUAND et COMMENT
// les appliquer à partir des demandes du navigateur.
// ---------------------------------------------------------------

/**
 * Au-delà de 60 s sans aucun signal du navigateur, le joueur est
 * considéré hors ligne : le temps écoulé est payé à 50 % (Bible 13.4).
 */
export const ACTIVE_GAP_MS = 60_000;

/** Un lot de frappes couvre au plus les 2 dernières secondes (Bible 13.2). */
export const STRIKE_BATCH_SPAN_MS = 2_000;

/** Nombre maximal de frappes déclarées dans un lot. */
export const MAX_STRIKES_PER_BATCH = 20;

/**
 * Verse la production depuis le dernier calcul : à 100 % si le joueur
 * était actif récemment, sinon au taux hors ligne (50 %, 8 h max).
 */
export function syncProduction(forge: ForgeState, now: number): ForgeState {
    const elapsed = now - forge.lastProductionAt;
    if (elapsed <= ACTIVE_GAP_MS) {
        return accrueProduction(forge, now);
    }
    return resumeAfterAbsence(forge, now).forge;
}

/**
 * Le navigateur dit seulement « j'ai frappé N fois ». Le serveur répartit
 * ces frappes régulièrement sur la période écoulée depuis la dernière
 * (2 s au plus), puis la limite de 5 frappes par seconde s'applique.
 * Envoyer plus de frappes ne rapporte donc jamais plus que 5 par seconde.
 */
export function planStrikeTimes(
    lastStrikeAt: number,
    now: number,
    count: number,
): number[] {
    const from = Math.max(lastStrikeAt, now - STRIKE_BATCH_SPAN_MS);
    const span = Math.max(0, now - from);
    return Array.from(
        { length: count },
        (_, i) => from + Math.floor(((i + 1) * span) / count),
    );
}

export type StrikeBatchResult = {
    accepted: number;
    ignored: number;
    gainMilli: number;
    criticals: number;
};

/** Applique un lot de frappes avec le moteur partagé. */
export function applyStrikeBatch(
    forge: ForgeState,
    strikeWindow: StrikeWindow,
    count: number,
    now: number,
    random: () => number = Math.random,
): {
    forge: ForgeState;
    strikeWindow: StrikeWindow;
    result: StrikeBatchResult;
} {
    const result: StrikeBatchResult = {
        accepted: 0,
        ignored: 0,
        gainMilli: 0,
        criticals: 0,
    };

    for (const at of planStrikeTimes(strikeWindow.startedAt, now, count)) {
        const strike = strikeForge(forge, strikeWindow, at, random);
        forge = strike.forge;
        strikeWindow = strike.strikeWindow;
        if (strike.gainMilli > 0) {
            result.accepted++;
            result.gainMilli += strike.gainMilli;
            if (strike.isCritical) result.criticals++;
        } else {
            result.ignored++;
        }
    }

    return { forge, strikeWindow, result };
}

export type UpgradeKey = "STRIKE_POWER" | "AWAKENED_EMBER";

/** Applique un achat. Renvoie null si l'achat est impossible. */
export function applyPurchase(
    forge: ForgeState,
    upgradeKey: UpgradeKey,
    now: number,
): ForgeState | null {
    const next =
        upgradeKey === "STRIKE_POWER"
            ? upgradeForge(forge, now)
            : buyAwakenedEmber(forge, now);

    const bought =
        next.forgeForce !== forge.forgeForce ||
        next.producers.awakenedEmber !== forge.producers.awakenedEmber;

    return bought ? next : null;
}
