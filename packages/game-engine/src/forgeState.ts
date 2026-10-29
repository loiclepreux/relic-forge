import { echoesToMilli } from "./forgeEconomy";

export type ForgeProducers = {
    awakenedEmber: number;
};

export type ForgeState = {
    version: 2;
    echoesMilli: number;
    forgeForce: number;
    producers: ForgeProducers;
    lastProductionAt: number;
    productionRemainderMilli: number;
};

export type LegacyForgeStateV1 = {
    echoes: number;
    forgeForce: number;
};

export function createInitialForgeState(now: number = Date.now()): ForgeState {
    return {
        version: 2,
        echoesMilli: 0,
        forgeForce: 0,
        producers: {
            awakenedEmber: 0,
        },
        lastProductionAt: now,
        productionRemainderMilli: 0,
    };
}

export function migrateForgeStateFromV1(
    oldForge: LegacyForgeStateV1,
    savedAt: number,
): ForgeState {
    return {
        version: 2,
        echoesMilli: echoesToMilli(oldForge.echoes),
        forgeForce: oldForge.forgeForce,
        producers: {
            awakenedEmber: 0,
        },
        lastProductionAt: savedAt,
        productionRemainderMilli: 0,
    };
}
