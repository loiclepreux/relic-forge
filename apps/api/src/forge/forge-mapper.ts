import type { ForgeState, StrikeWindow } from "@relic-forge/game-engine";
import {
    calculateAwakenedEmberCostMilli,
    calculateForgeUpgradeCostMilli,
    calculateProducerProduction,
    getForgeStage,
    getForgeStageName,
    MAX_FORGE_FORCE,
} from "@relic-forge/game-engine";

// ---------------------------------------------------------------
// Conversion entre la base de données et le moteur de jeu.
// La base range la Forge dans plusieurs tables ; le moteur, lui,
// travaille sur un seul objet ForgeState. Ce fichier fait le lien.
// ---------------------------------------------------------------

/** Ce que la base contient pour la Forge d'un joueur. */
export type ForgeRecord = {
    lastProductionAt: Date;
    productionRemainderMilli: number;
    strikeWindowStartedAt: Date | null;
    strikeWindowCount: number;
    echoesMilli: bigint;
    strikeLevel: number;
    emberLevel: number;
};

/** Base → moteur. */
export function toEngineState(record: ForgeRecord): {
    forge: ForgeState;
    strikeWindow: StrikeWindow;
} {
    return {
        forge: {
            version: 2,
            echoesMilli: Number(record.echoesMilli),
            forgeForce: record.strikeLevel,
            producers: { awakenedEmber: record.emberLevel },
            lastProductionAt: record.lastProductionAt.getTime(),
            productionRemainderMilli: record.productionRemainderMilli,
        },
        strikeWindow: {
            startedAt: record.strikeWindowStartedAt?.getTime() ?? 0,
            count: record.strikeWindowCount,
        },
    };
}

/** Moteur → base. */
export function toRecord(
    forge: ForgeState,
    strikeWindow: StrikeWindow,
): ForgeRecord {
    return {
        lastProductionAt: new Date(forge.lastProductionAt),
        productionRemainderMilli: forge.productionRemainderMilli,
        strikeWindowStartedAt:
            strikeWindow.startedAt > 0
                ? new Date(strikeWindow.startedAt)
                : null,
        strikeWindowCount: strikeWindow.count,
        echoesMilli: BigInt(forge.echoesMilli),
        strikeLevel: forge.forgeForce,
        emberLevel: forge.producers.awakenedEmber,
    };
}

/** Ce que le serveur renvoie au navigateur : tout est déjà calculé. */
export type ForgeView = {
    echoesMilli: number;
    forgeForce: number;
    maxForgeForce: number;
    awakenedEmber: number;
    productionPerSecond: number;
    nextUpgradeCostMilli: number | null;
    nextEmberCostMilli: number;
    stage: number;
    stageName: string;
    serverTime: number;
};

export function toView(forge: ForgeState, now: number): ForgeView {
    const stage = getForgeStage(forge.forgeForce);
    return {
        echoesMilli: forge.echoesMilli,
        forgeForce: forge.forgeForce,
        maxForgeForce: MAX_FORGE_FORCE,
        awakenedEmber: forge.producers.awakenedEmber,
        productionPerSecond: calculateProducerProduction(forge.producers),
        nextUpgradeCostMilli:
            forge.forgeForce >= MAX_FORGE_FORCE
                ? null
                : calculateForgeUpgradeCostMilli(forge.forgeForce),
        nextEmberCostMilli: calculateAwakenedEmberCostMilli(
            forge.producers.awakenedEmber,
        ),
        stage,
        stageName: getForgeStageName(stage),
        serverTime: now,
    };
}
