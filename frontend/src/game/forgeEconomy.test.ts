import { describe, expect, it } from "vitest";
import {
    calculateAwakenedEmberCostMilli,
    calculateElapsedProductionWithRemainder,
    calculateForgeUpgradeCost,
    calculateOfflineGainMilli,
    calculateStrikeGainMilli,
    echoesToMilli,
    getForgeStage,
    getForgeStageName,
} from "./forgeEconomy";

describe("conversion Échos / milli-Échos", () => {
    it("convertit et arrondit au milli-Écho", () => {
        expect(echoesToMilli(250.5)).toBe(250500);
        expect(echoesToMilli(0.0004)).toBe(0);
    });

    it("refuse les valeurs invalides", () => {
        for (const v of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
            expect(echoesToMilli(v)).toBeNaN();
        }
    });
});

describe("gain de frappe (V8)", () => {
    it("applique B × (1 + 0.15F) + 0.10P", () => {
        expect(calculateStrikeGainMilli(1, 0, 0)).toBe(1000);
        expect(calculateStrikeGainMilli(1, 5, 0)).toBe(1750);
        expect(calculateStrikeGainMilli(1, 5, 3)).toBe(2050);
    });

    it("applique le multiplicateur après la formule", () => {
        expect(calculateStrikeGainMilli(1, 5, 3, 2)).toBe(4100);
    });
});

describe("coût d'amélioration C(F) = ceil(25 × 1.18^F)", () => {
    it.each([
        [0, 25],
        [1, 30],
        [5, 58],
        [10, 131],
        [20, 685],
        [30, 3585],
        [40, 18760],
    ])("F=%i coûte %i", (force, cost) => {
        expect(calculateForgeUpgradeCost(force)).toBe(cost);
    });
});

describe("Braise éveillée (coût provisoire)", () => {
    it("coûte ceil(15 × 1.15^n)", () => {
        expect(calculateAwakenedEmberCostMilli(0)).toBe(15000);
        expect(calculateAwakenedEmberCostMilli(1)).toBe(18000);
        expect(calculateAwakenedEmberCostMilli(10)).toBe(61000);
    });
});

describe("production avec reste", () => {
    it("conserve la fraction entre deux calculs", () => {
        let gain = 0;
        let remainder = 0;
        for (let i = 0; i < 100; i++) {
            const r = calculateElapsedProductionWithRemainder(
                0.1,
                7,
                remainder,
            );
            gain += r.gainMilli;
            remainder = r.remainderMilli;
        }
        expect(gain + remainder).toBeCloseTo(70, 9);
        expect(Number.isInteger(gain)).toBe(true);
        expect(remainder).toBeLessThan(1);
    });

    it("ne dérive pas sur une heure de petits intervalles", () => {
        let gain = 0;
        let remainder = 0;
        for (let t = 0; t < 3_600_000; t += 7) {
            const step = Math.min(7, 3_600_000 - t);
            const r = calculateElapsedProductionWithRemainder(
                0.1,
                step,
                remainder,
            );
            gain += r.gainMilli;
            remainder = r.remainderMilli;
        }
        expect(Math.abs(gain + remainder - 360_000)).toBeLessThan(1e-3);
    });

    it("garde le reste dans [0, 1) aux limites d'arrondi", () => {
        const r = calculateElapsedProductionWithRemainder(0.9999999995, 1, 0);
        expect(r.gainMilli).toBe(0);
        expect(r.remainderMilli).toBeGreaterThanOrEqual(0);
        expect(r.remainderMilli).toBeLessThan(1);
    });

    it("ignore une durée négative", () => {
        expect(calculateElapsedProductionWithRemainder(1, -5000, 0)).toEqual({
            gainMilli: 0,
            remainderMilli: 0,
        });
    });

    it.each([NaN, Infinity, -Infinity, 1e308])(
        "neutralise une production invalide (%s)",
        (value) => {
            expect(
                calculateElapsedProductionWithRemainder(value, 1000, 0),
            ).toEqual({ gainMilli: 0, remainderMilli: 0 });
        },
    );
});

describe("gain hors ligne", () => {
    const HOUR = 3_600_000;

    it("rapporte 50 % de la production", () => {
        expect(calculateOfflineGainMilli(1, HOUR)).toBe(1_800_000);
    });

    it("plafonne à 8 h", () => {
        expect(calculateOfflineGainMilli(1, 24 * HOUR)).toBe(
            calculateOfflineGainMilli(1, 8 * HOUR),
        );
    });

    it("renvoie 0 pour des entrées invalides", () => {
        expect(calculateOfflineGainMilli(-1, HOUR)).toBe(0);
        expect(calculateOfflineGainMilli(1, NaN)).toBe(0);
        expect(calculateOfflineGainMilli(1, -HOUR)).toBe(0);
    });
});

describe("stades de la Forge", () => {
    it.each([
        [0, 1, "Endormie"],
        [4, 1, "Endormie"],
        [5, 2, "Éveillée"],
        [10, 3, "Ancestrale"],
        [20, 4, "Transcendante"],
    ])("Force %i → stade %i (%s)", (force, stage, name) => {
        expect(getForgeStage(force)).toBe(stage);
        expect(getForgeStageName(stage)).toBe(name);
    });
});
