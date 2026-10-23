import { describe, expect, it } from "vitest";
import { createInitialForgeState, type ForgeState } from "./forgeState";
import {
    accrueProduction,
    buyAwakenedEmber,
    checkStrikeLimit,
    strikeForge,
    upgradeForge,
    type StrikeWindow,
} from "./forgeActions";

function forgeWith(patch: Partial<ForgeState>, now = 1000): ForgeState {
    return { ...createInitialForgeState(now), ...patch };
}

const emptyWindow: StrikeWindow = { startedAt: 0, count: 0 };

describe("limite de frappe (5 par seconde)", () => {
    it("compte 5 frappes puis refuse la 6e dans la même seconde", () => {
        let forge = createInitialForgeState(1000);
        let window: StrikeWindow = { startedAt: 1000, count: 0 };
        const gains: number[] = [];
        for (let i = 0; i < 6; i++) {
            const r = strikeForge(forge, window, 1000);
            forge = r.forge;
            window = r.strikeWindow;
            gains.push(r.gainMilli);
        }
        expect(gains).toEqual([1000, 1000, 1000, 1000, 1000, 0]);
        expect(forge.echoesMilli).toBe(5000);
    });

    it("ouvre une nouvelle fenêtre après 1000 ms", () => {
        const r = checkStrikeLimit({ startedAt: 0, count: 5 }, 1000);
        expect(r).toEqual({
            allowed: true,
            strikeWindow: { startedAt: 1000, count: 1 },
        });
    });

    it("verse quand même la production quand la frappe est refusée", () => {
        const forge = forgeWith({ producers: { awakenedEmber: 1 } });
        const r = strikeForge(forge, { startedAt: 10500, count: 5 }, 11000);
        expect(r.gainMilli).toBe(0);
        expect(r.forge.echoesMilli).toBe(10_000);
        expect(r.forge.lastProductionAt).toBe(11000);
    });

    it("inclut 0.10 × P dans la frappe", () => {
        const forge = forgeWith({ producers: { awakenedEmber: 1 } });
        const r = strikeForge(forge, emptyWindow, 1000);
        expect(r.gainMilli).toBe(1100);
    });

    it("refuse une frappe qui dépasserait le solde maximal sûr", () => {
        const forge = forgeWith({ echoesMilli: Number.MAX_SAFE_INTEGER - 500 });
        const r = strikeForge(forge, emptyWindow, 1000);
        expect(r.gainMilli).toBe(0);
        expect(r.forge.echoesMilli).toBe(Number.MAX_SAFE_INTEGER - 500);
    });
});

describe("production passive par horodatage", () => {
    it("produit 1 Écho/s par Braise", () => {
        const forge = forgeWith({ producers: { awakenedEmber: 1 } });
        expect(accrueProduction(forge, 11000).echoesMilli).toBe(10_000);
    });

    it("ne compte pas deux fois le même intervalle", () => {
        const forge = forgeWith({ producers: { awakenedEmber: 1 } });
        const once = accrueProduction(forge, 11000);
        expect(accrueProduction(once, 11000)).toEqual(once);
    });

    it("cumule les fractions de milli-Écho", () => {
        let forge = forgeWith({ producers: { awakenedEmber: 1 } });
        forge = accrueProduction(forge, 1250);
        forge = accrueProduction(forge, 1500);
        expect(forge.echoesMilli).toBe(500);
        expect(forge.lastProductionAt).toBe(1500);
    });

    it("ignore un retour en arrière de l'horloge", () => {
        const forge = forgeWith({ producers: { awakenedEmber: 1 } }, 11000);
        const r = accrueProduction(forge, 6000);
        expect(r.echoesMilli).toBe(0);
        expect(r.lastProductionAt).toBe(11000);
    });

    it("ne dépasse pas le solde maximal sûr", () => {
        const forge = forgeWith({
            echoesMilli: Number.MAX_SAFE_INTEGER - 500,
            producers: { awakenedEmber: 1 },
        });
        const r = accrueProduction(forge, 2000);
        expect(r.echoesMilli).toBe(Number.MAX_SAFE_INTEGER - 500);
        expect(r.lastProductionAt).toBe(2000);
    });
});

describe("amélioration de la Forge", () => {
    it("débite le coût et augmente la Force", () => {
        const r = upgradeForge(forgeWith({ echoesMilli: 30_000 }), 1000);
        expect(r.forgeForce).toBe(1);
        expect(r.echoesMilli).toBe(5000);
    });

    it("refuse si le solde est insuffisant", () => {
        const forge = forgeWith({ echoesMilli: 24_999 });
        expect(upgradeForge(forge, 1000)).toEqual(forge);
    });

    it("compte la production écoulée avant l'achat", () => {
        const forge = forgeWith({
            echoesMilli: 20_000,
            producers: { awakenedEmber: 1 },
        });
        expect(upgradeForge(forge, 6000).forgeForce).toBe(1);
    });

    it("refuse un solde invalide", () => {
        const forge = forgeWith({ echoesMilli: NaN });
        expect(upgradeForge(forge, 1000).forgeForce).toBe(0);
    });
});

describe("achat de Braise éveillée", () => {
    it("est verrouillé sous Force 2", () => {
        const forge = forgeWith({ echoesMilli: 100_000, forgeForce: 1 });
        expect(buyAwakenedEmber(forge, 1000).producers.awakenedEmber).toBe(0);
    });

    it("débite le coût et ajoute une Braise", () => {
        const forge = forgeWith({ echoesMilli: 20_000, forgeForce: 2 });
        const r = buyAwakenedEmber(forge, 1000);
        expect(r.producers.awakenedEmber).toBe(1);
        expect(r.echoesMilli).toBe(5000);
    });

    it("refuse un nombre de Braises invalide", () => {
        const forge = forgeWith({
            echoesMilli: 100_000,
            forgeForce: 2,
            producers: { awakenedEmber: -1 },
        });
        expect(buyAwakenedEmber(forge, 1000).producers.awakenedEmber).toBe(-1);
    });
});
