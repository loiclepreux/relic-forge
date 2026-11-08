import { describe, expect, it } from "vitest";
import {
    createInitialForgeState,
    type ForgeState,
} from "@relic-forge/game-engine";
import {
    ACTIVE_GAP_MS,
    applyPurchase,
    applyStrikeBatch,
    planStrikeTimes,
    syncProduction,
} from "./forge-rules";

const noCritical = () => 0.99;

function forgeWith(patch: Partial<ForgeState>, now = 0): ForgeState {
    return { ...createInitialForgeState(now), ...patch };
}

describe("production selon l'activité", () => {
    const forge = forgeWith({ producers: { awakenedEmber: 2 } });

    it("paie 100 % si le joueur était actif récemment", () => {
        const r = syncProduction(forge, 30_000);
        expect(r.echoesMilli).toBe(60_000);
    });

    it("paie 50 % après une absence (pas de signal depuis plus de 60 s)", () => {
        const r = syncProduction(forge, ACTIVE_GAP_MS + 60_000);
        expect(r.echoesMilli).toBe(120_000);
    });
});

describe("répartition des frappes d'un lot", () => {
    it("répartit les frappes sur les 2 dernières secondes au plus", () => {
        expect(planStrikeTimes(0, 10_000, 4)).toEqual([
            8_500, 9_000, 9_500, 10_000,
        ]);
    });

    it("commence après la frappe précédente si elle est plus récente", () => {
        expect(planStrikeTimes(9_000, 10_000, 2)).toEqual([9_500, 10_000]);
    });
});

describe("lot de frappes", () => {
    it("compte toutes les frappes d'un rythme normal", () => {
        const r = applyStrikeBatch(
            forgeWith({}),
            { startedAt: 0, count: 0 },
            6,
            10_000,
            noCritical,
        );
        expect(r.result).toEqual({
            accepted: 6,
            ignored: 0,
            gainMilli: 6000,
            criticals: 0,
        });
    });

    it("ne compte jamais plus de 5 frappes par seconde", () => {
        const r = applyStrikeBatch(
            forgeWith({}),
            { startedAt: 0, count: 0 },
            20,
            10_000,
            noCritical,
        );
        expect(r.result.accepted).toBeLessThanOrEqual(10);
        expect(r.result.ignored).toBeGreaterThanOrEqual(10);
    });

    it("double le gain d'une frappe critique (tirage du serveur)", () => {
        const r = applyStrikeBatch(
            forgeWith({}),
            { startedAt: 0, count: 0 },
            1,
            10_000,
            () => 0,
        );
        expect(r.result).toMatchObject({ gainMilli: 2000, criticals: 1 });
    });
});

describe("achats", () => {
    it("achète une amélioration si le solde suffit", () => {
        const r = applyPurchase(
            forgeWith({ echoesMilli: 120_000 }),
            "STRIKE_POWER",
            0,
        );
        expect(r?.forgeForce).toBe(1);
        expect(r?.echoesMilli).toBe(0);
    });

    it("refuse si le solde est insuffisant", () => {
        expect(
            applyPurchase(
                forgeWith({ echoesMilli: 119_999 }),
                "STRIKE_POWER",
                0,
            ),
        ).toBeNull();
    });

    it("refuse une Braise avant Force 2", () => {
        expect(
            applyPurchase(
                forgeWith({ echoesMilli: 1_000_000, forgeForce: 1 }),
                "AWAKENED_EMBER",
                0,
            ),
        ).toBeNull();
    });
});
