import type { ForgeProducers } from "./forgeState";

// Coup critique (V9, provisoire) : 10 % de chance, gain de la frappe ×2.
export const CRITICAL_CHANCE = 0.1;
export const CRITICAL_MULTIPLIER = 2;

// Force de Forge maximale (Bible 13.2).
export const MAX_FORGE_FORCE = 50;

/** Tire au sort un coup critique. `random` est remplaçable dans les tests. */
export function rollCriticalStrike(
    random: () => number = Math.random,
): boolean {
    return random() < CRITICAL_CHANCE;
}

export function echoesToMilli(echoes: number): number {
    // Refuser les valeurs négatives ou non finies.
    if (!Number.isFinite(echoes) || echoes < 0) {
        return Number.NaN;
    }

    const milli = Math.round(echoes * 1000);

    // Refuser les résultats dépassant les entiers sûrs.
    if (!Number.isSafeInteger(milli)) {
        return Number.NaN;
    }

    return milli;
}

export function milliToEchoes(milli: number): number {
    return milli / 1000;
}

export function calculateStrikeGainMilli(
    baseStrikeGain: number,
    forgeForce: number,
    passiveProduction: number,
    multiplier: number = 1,
): number {
    const strikeGain =
        baseStrikeGain * (1 + 0.15 * forgeForce) + 0.1 * passiveProduction;

    return Math.floor(strikeGain * multiplier * 1000);
}

export function calculateProducerProduction(producers: ForgeProducers): number {
    const awakenedEmberProduction = 1;

    return producers.awakenedEmber * awakenedEmberProduction;
}

export function calculateForgeUpgradeCost(forgeForce: number): number {
    return Math.ceil(120 * 1.28 ** forgeForce);
}

export function calculateForgeUpgradeCostMilli(forgeForce: number): number {
    return calculateForgeUpgradeCost(forgeForce) * 1000;
}

export function calculateAwakenedEmberCostMilli(owned: number): number {
    const baseCost = 200;
    const growthRate = 1.3;

    const costEchoes = Math.ceil(baseCost * growthRate ** owned);

    return costEchoes * 1000;
}

// Stades calqués sur les tranches de niveaux de la Bible (24.3) :
// 0–10 Endormie, 11–25 Éveillée, 26–40 Ancestrale, 41–50 Transcendante.
export function getForgeStage(forgeForce: number): number {
    if (forgeForce >= 41) {
        return 4;
    }

    if (forgeForce >= 26) {
        return 3;
    }

    if (forgeForce >= 11) {
        return 2;
    }

    return 1;
}

export function getForgeStageName(forgeStage: number): string {
    switch (forgeStage) {
        case 1:
            return "Endormie";

        case 2:
            return "Éveillée";

        case 3:
            return "Ancestrale";

        case 4:
            return "Transcendante";

        default:
            return "Endormie";
    }
}

export function calculateElapsedProductionWithRemainder(
    passiveProduction: number,
    elapsedMilliseconds: number,
    previousRemainderMilli: number,
): {
    gainMilli: number;
    remainderMilli: number;
} {
    // Protection contre les valeurs numériques invalides.
    if (
        !Number.isFinite(passiveProduction) ||
        !Number.isFinite(elapsedMilliseconds) ||
        !Number.isFinite(previousRemainderMilli)
    ) {
        return {
            gainMilli: 0,
            remainderMilli: 0,
        };
    }

    const safeElapsedMilliseconds = Math.max(0, elapsedMilliseconds);

    const totalMilli =
        passiveProduction * safeElapsedMilliseconds + previousRemainderMilli;

    // Vérifier que le résultat du calcul reste valide.
    if (
        !Number.isFinite(totalMilli) ||
        totalMilli < 0 ||
        !Number.isSafeInteger(Math.floor(totalMilli))
    ) {
        return {
            gainMilli: 0,
            remainderMilli: 0,
        };
    }

    const gainMilli = Math.floor(totalMilli);

    const remainderMilli = totalMilli - gainMilli;

    return {
        gainMilli,
        remainderMilli,
    };
}

export function calculateOfflineGainMilli(
    passiveProduction: number,
    offlineMilliseconds: number,
): number {
    const MAX_OFFLINE_MILLISECONDS = 8 * 60 * 60 * 1000;
    const OFFLINE_EFFICIENCY = 0.5;

    if (
        !Number.isFinite(passiveProduction) ||
        passiveProduction < 0 ||
        !Number.isFinite(offlineMilliseconds)
    ) {
        return 0;
    }

    const safeOfflineMilliseconds = Math.min(
        Math.max(0, offlineMilliseconds),
        MAX_OFFLINE_MILLISECONDS,
    );

    const gainMilli = Math.floor(
        passiveProduction * safeOfflineMilliseconds * OFFLINE_EFFICIENCY,
    );

    if (!Number.isSafeInteger(gainMilli)) {
        return 0;
    }

    return gainMilli;
}
