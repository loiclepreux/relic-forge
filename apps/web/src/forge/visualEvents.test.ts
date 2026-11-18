import { describe, expect, it, vi } from "vitest";
import type { ForgeView } from "../api/forgeApi";
import {
    createVisualEventBus,
    detectStageChange,
    type ForgeVisualEvent,
} from "./visualEvents";

const view = (stage: number): ForgeView => ({
    echoesMilli: 5_000,
    forgeForce: stage === 1 ? 3 : 12,
    maxForgeForce: 50,
    awakenedEmber: 1,
    productionPerSecond: 0.2,
    nextUpgradeCostMilli: 120_000,
    nextEmberCostMilli: 260_000,
    stage,
    stageName: stage === 1 ? "Forge endormie" : "Forge éveillée",
    serverTime: 0,
});

describe("createVisualEventBus", () => {
    it("prévient chaque abonné, dans l'ordre d'abonnement", () => {
        const bus = createVisualEventBus();
        const received: string[] = [];
        bus.subscribe((e) => received.push(`a:${e.type}`));
        bus.subscribe((e) => received.push(`b:${e.type}`));

        bus.emit({ type: "STRIKE", stage: 1 });

        expect(received).toEqual(["a:STRIKE", "b:STRIKE"]);
    });

    it("ne prévient plus un abonné qui s'est désabonné", () => {
        const bus = createVisualEventBus();
        const listener = vi.fn();
        const unsubscribe = bus.subscribe(listener);

        unsubscribe();
        bus.emit({ type: "STRIKE", stage: 1 });

        expect(listener).not.toHaveBeenCalled();
    });

    it("continue si un effet plante", () => {
        const bus = createVisualEventBus();
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const after = vi.fn();
        bus.subscribe(() => {
            throw new Error("effet cassé");
        });
        bus.subscribe(after);

        bus.emit({ type: "CRITICAL", count: 1, stage: 1 });

        expect(after).toHaveBeenCalledOnce();
        error.mockRestore();
    });

    it("rejouer un événement ne change pas l'état de la Forge", () => {
        const bus = createVisualEventBus();
        const forge = view(1);
        const snapshot = structuredClone(forge);
        bus.subscribe(() => {});
        const event: ForgeVisualEvent = {
            type: "UPGRADE_PURCHASED",
            upgradeKey: "STRIKE_POWER",
            stage: 1,
        };

        for (let i = 0; i < 10; i++) bus.emit(event);

        expect(forge).toEqual(snapshot);
    });
});

describe("detectStageChange", () => {
    it("rien au premier chargement", () => {
        expect(detectStageChange(null, view(2))).toBeNull();
    });

    it("rien si le stade est le même", () => {
        expect(detectStageChange(view(1), view(1))).toBeNull();
    });

    it("signale le passage à un nouveau stade", () => {
        expect(detectStageChange(view(1), view(2))).toEqual({
            type: "STAGE_CHANGED",
            stage: 2,
            previousStage: 1,
        });
    });
});
