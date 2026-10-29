import { describe, expect, it, vi } from "vitest";
import { createInitialForgeState, type ForgeState } from "./forgeState";
import {
    accrueProduction,
    buyAwakenedEmber,
    checkStrikeLimit,
    resumeAfterAbsence,
    strikeForge,
    upgradeForge,
    type StrikeWindow,
} from "./forgeActions";

function forgeWith(patch: Partial<ForgeState>, now = 1000): ForgeState {
    return { ...createInitialForgeState(now), ...patch };
}

const emptyWindow: StrikeWindow = { startedAt: 0, count: 0 };

// Tirages fixes pour des tests reproductibles (critique si tirage < 0,1).
const noCritical = () => 0.99;
const alwaysCritical = () => 0;

describe("limite de frappe (5 par seconde)", () => {
    it("compte 5 frappes puis refuse la 6e dans la même seconde", () => {
        let forge = createInitialForgeState(1000);
        let window: StrikeWindow = { startedAt: 1000, count: 0 };
        const gains: number[] = [];
        for (let i = 0; i < 6; i++) {
            const r = strikeForge(forge, window, 1000, noCritical);
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
        const r = strikeForge(
            forge,
            { startedAt: 10500, count: 5 },
            11000,
            noCritical,
        );
        expect(r.gainMilli).toBe(0);
        expect(r.forge.echoesMilli).toBe(10_000);
        expect(r.forge.lastProductionAt).toBe(11000);
    });

    it("inclut 0.10 × P dans la frappe", () => {
        const forge = forgeWith({ producers: { awakenedEmber: 1 } });
        const r = strikeForge(forge, emptyWindow, 1000, noCritical);
        expect(r.gainMilli).toBe(1100);
    });

    it("refuse une frappe qui dépasserait le solde maximal sûr", () => {
        const forge = forgeWith({ echoesMilli: Number.MAX_SAFE_INTEGER - 500 });
        const r = strikeForge(forge, emptyWindow, 1000, noCritical);
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
        const r = upgradeForge(forgeWith({ echoesMilli: 150_000 }), 1000);
        expect(r.forgeForce).toBe(1);
        expect(r.echoesMilli).toBe(30_000);
    });

    it("refuse si le solde est insuffisant", () => {
        const forge = forgeWith({ echoesMilli: 119_999 });
        expect(upgradeForge(forge, 1000)).toEqual(forge);
    });

    it("compte la production écoulée avant l'achat", () => {
        const forge = forgeWith({
            echoesMilli: 115_000,
            producers: { awakenedEmber: 1 },
        });
        expect(upgradeForge(forge, 6000).forgeForce).toBe(1);
    });

    it("refuse un solde invalide", () => {
        const forge = forgeWith({ echoesMilli: NaN });
        expect(upgradeForge(forge, 1000).forgeForce).toBe(0);
    });

    it("s'arrête à Force 50", () => {
        const forge = forgeWith({
            echoesMilli: Number.MAX_SAFE_INTEGER - 1_000_000,
            forgeForce: 50,
        });
        expect(upgradeForge(forge, 1000).forgeForce).toBe(50);
    });
});

describe("achat de Braise éveillée", () => {
    it("est verrouillé sous Force 2", () => {
        const forge = forgeWith({ echoesMilli: 100_000, forgeForce: 1 });
        expect(buyAwakenedEmber(forge, 1000).producers.awakenedEmber).toBe(0);
    });

    it("débite le coût et ajoute une Braise", () => {
        const forge = forgeWith({ echoesMilli: 250_000, forgeForce: 2 });
        const r = buyAwakenedEmber(forge, 1000);
        expect(r.producers.awakenedEmber).toBe(1);
        expect(r.echoesMilli).toBe(50_000);
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

describe("coup critique (V9)", () => {
    it("double le gain d'une frappe comptée", () => {
        const forge = forgeWith({ forgeForce: 5 });
        const r = strikeForge(forge, emptyWindow, 1000, alwaysCritical);
        expect(r.isCritical).toBe(true);
        expect(r.gainMilli).toBe(3500);
    });

    it("n'arrive pas quand le tirage est ≥ 10 %", () => {
        const r = strikeForge(forgeWith({}), emptyWindow, 1000, () => 0.1);
        expect(r.isCritical).toBe(false);
        expect(r.gainMilli).toBe(1000);
    });

    it("ne contourne pas la limite de 5 frappes par seconde", () => {
        const random = vi.fn(alwaysCritical);
        const r = strikeForge(
            forgeWith({}),
            { startedAt: 1000, count: 5 },
            1000,
            random,
        );
        expect(r.gainMilli).toBe(0);
        expect(r.isCritical).toBe(false);
        expect(random).not.toHaveBeenCalled();
    });

    it("rapporte environ 10 % de plus en moyenne", () => {
        let seed = 42;
        const random = () => {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
        };
        let total = 0;
        for (let i = 0; i < 10_000; i++) {
            total += strikeForge(
                forgeWith({}),
                emptyWindow,
                1000,
                random,
            ).gainMilli;
        }
        expect(total / 10_000).toBeGreaterThan(1080);
        expect(total / 10_000).toBeLessThan(1120);
    });
});

describe("retour après une absence (onglet caché, V9)", () => {
    const HOUR = 3_600_000;

    it("paie le temps caché à 50 %", () => {
        const forge = forgeWith({ producers: { awakenedEmber: 2 } });
        const r = resumeAfterAbsence(forge, 1000 + HOUR);
        expect(r.gainMilli).toBe(3_600_000);
        expect(r.forge.echoesMilli).toBe(3_600_000);
        expect(r.forge.lastProductionAt).toBe(1000 + HOUR);
    });

    it("plafonne à 8 h", () => {
        const forge = forgeWith({ producers: { awakenedEmber: 1 } });
        const r = resumeAfterAbsence(forge, 1000 + 24 * HOUR);
        expect(r.gainMilli).toBe(8 * 1_800_000);
    });

    it("abandonne le reste de production en cours", () => {
        const forge = forgeWith({ productionRemainderMilli: 0.5 });
        expect(
            resumeAfterAbsence(forge, 2000).forge.productionRemainderMilli,
        ).toBe(0);
    });

    it("ignore un retour en arrière de l'horloge", () => {
        const forge = forgeWith({ producers: { awakenedEmber: 1 } }, 5000);
        const r = resumeAfterAbsence(forge, 3000);
        expect(r.gainMilli).toBe(0);
        expect(r.forge).toBe(forge);
    });

    it("ne dépasse pas le solde maximal sûr", () => {
        const forge = forgeWith({
            echoesMilli: Number.MAX_SAFE_INTEGER - 10,
            producers: { awakenedEmber: 1 },
        });
        const r = resumeAfterAbsence(forge, 1000 + HOUR);
        expect(r.gainMilli).toBe(0);
        expect(r.forge.echoesMilli).toBe(Number.MAX_SAFE_INTEGER - 10);
    });
});
