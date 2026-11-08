import { describe, expect, it } from "vitest";
import {
    toEngineState,
    toRecord,
    toView,
    type ForgeRecord,
} from "./forge-mapper";

const record: ForgeRecord = {
    lastProductionAt: new Date(1_000_000),
    productionRemainderMilli: 0.25,
    strikeWindowStartedAt: null,
    strikeWindowCount: 0,
    echoesMilli: 150_000n,
    strikeLevel: 3,
    emberLevel: 2,
};

describe("conversion base ↔ moteur", () => {
    it("traduit la base en état du moteur", () => {
        const { forge, strikeWindow } = toEngineState(record);
        expect(forge).toEqual({
            version: 2,
            echoesMilli: 150_000,
            forgeForce: 3,
            producers: { awakenedEmber: 2 },
            lastProductionAt: 1_000_000,
            productionRemainderMilli: 0.25,
        });
        expect(strikeWindow).toEqual({ startedAt: 0, count: 0 });
    });

    it("fait l'aller-retour sans rien perdre", () => {
        const { forge, strikeWindow } = toEngineState(record);
        expect(toRecord(forge, strikeWindow)).toEqual(record);
    });

    it("conserve la fenêtre de frappes", () => {
        const { forge } = toEngineState(record);
        const back = toRecord(forge, { startedAt: 2_000_000, count: 4 });
        expect(back.strikeWindowStartedAt).toEqual(new Date(2_000_000));
        expect(back.strikeWindowCount).toBe(4);
    });
});

describe("vue envoyée au navigateur", () => {
    it("contient les coûts et le stade calculés par le moteur", () => {
        const { forge } = toEngineState(record);
        const view = toView(forge, 5000);
        expect(view).toMatchObject({
            echoesMilli: 150_000,
            forgeForce: 3,
            awakenedEmber: 2,
            productionPerSecond: 2,
            nextUpgradeCostMilli: 252_000,
            nextEmberCostMilli: 339_000,
            stage: 1,
            stageName: "Endormie",
            serverTime: 5000,
        });
    });

    it("n'affiche plus de coût d'amélioration à Force 50", () => {
        const { forge } = toEngineState({ ...record, strikeLevel: 50 });
        expect(toView(forge, 0).nextUpgradeCostMilli).toBeNull();
    });
});
