import { echoesToMilli } from "./forgeEconomy";

export type ForgeProducers = {
    awakenedEmber: number;
};

export type ForgeStateV2 = {
    version: 2;
    echoesMilli: number;
    forgeForce: number;
    producers: ForgeProducers;
    lastProductionAt: number;
    productionRemainderMilli: number;
};

export type ForgeState = {
    echoes: number;
    forgeForce: number;
};

export const initialForgeState: ForgeState = {
    echoes: 0,
    forgeForce: 0,
};

export function createInitialForgeStateV2(
    now: number = Date.now(),
): ForgeStateV2 {
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

export function migrateForgeStateV1ToV2(
    oldForge: ForgeState,
    savedAt: number,
): ForgeStateV2 {
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
