import { describe, expect, it } from "vitest";
import {
    STAGE_AMBIANCES,
    ambianceForStage,
    mixAmbiance,
    mixColor,
} from "./ambiance";
import { DUST_COUNT, EMBER_COUNT, MoteField, moteWeight } from "./motes";

describe("ambiances des stades", () => {
    it("Forge endormie : poussière, canaux éteints", () => {
        const sleeping = ambianceForStage(1);
        expect(sleeping.dust).toBe(1);
        expect(sleeping.channels).toBe(0);
    });

    it("Forge éveillée : canaux allumés, braises qui montent", () => {
        const awake = ambianceForStage(2);
        expect(awake.channels).toBe(1);
        expect(awake.embers).toBeGreaterThan(ambianceForStage(1).embers);
    });

    it("la lueur grandit avec chaque stade", () => {
        const strengths = STAGE_AMBIANCES.map((a) => a.glowStrength);
        expect(strengths).toEqual([...strengths].sort((a, b) => a - b));
    });

    it("un stade hors limites prend le plus proche", () => {
        expect(ambianceForStage(0)).toBe(STAGE_AMBIANCES[0]);
        expect(ambianceForStage(9)).toBe(STAGE_AMBIANCES[3]);
    });
});

describe("transition entre deux stades", () => {
    const from = ambianceForStage(1);
    const to = ambianceForStage(2);

    it("part de l'ancien stade et arrive au nouveau", () => {
        expect(mixAmbiance(from, to, 0)).toEqual(from);
        expect(mixAmbiance(from, to, 1)).toEqual(to);
    });

    it("passe progressivement, sans retour en arrière", () => {
        let previous = -1;
        for (let p = 0; p <= 1; p += 0.05) {
            const channels = mixAmbiance(from, to, p).channels;
            expect(channels).toBeGreaterThanOrEqual(previous);
            previous = channels;
        }
    });

    it("mélange les couleurs canal par canal", () => {
        expect(mixColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
        expect(mixColor(0xff0000, 0x0000ff, 1)).toBe(0x0000ff);
    });
});

describe("poussière et braises", () => {
    it("les braises montent puis renaissent en bas", () => {
        const field = new MoteField();
        const startY = field.embers.map((e) => e.y);
        field.step(0.5);
        const rose = field.embers.filter((e, i) => e.y < startY[i]).length;
        expect(rose).toBeGreaterThan(EMBER_COUNT / 2);
        for (let i = 0; i < 600; i++) field.step(1 / 30);
        for (const ember of field.embers) {
            expect(ember.y).toBeGreaterThanOrEqual(0);
            expect(ember.y).toBeLessThanOrEqual(1);
        }
    });

    it("la poussière reste dans la scène", () => {
        const field = new MoteField();
        for (let i = 0; i < 3000; i++) field.step(1 / 30);
        for (const mote of field.dust) {
            expect(mote.x).toBeGreaterThanOrEqual(0);
            expect(mote.x).toBeLessThan(1);
            expect(mote.y).toBeGreaterThanOrEqual(0);
            expect(mote.y).toBeLessThan(1);
        }
    });

    it("la quantité ajoute les particules une à une", () => {
        expect(moteWeight(0, DUST_COUNT, 0)).toBe(0);
        expect(moteWeight(DUST_COUNT - 1, DUST_COUNT, 1)).toBe(1);
        const half = Array.from({ length: DUST_COUNT }, (_, i) =>
            moteWeight(i, DUST_COUNT, 0.5),
        ).reduce((a, b) => a + b, 0);
        expect(half).toBeCloseTo(DUST_COUNT / 2);
    });
});
