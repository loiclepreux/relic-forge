import { describe, expect, it } from "vitest";
import {
    DEFAULT_AUDIO_SETTINGS,
    MAX_STRIKE_VOICES,
    STRIKE_VARIANTS,
    channelVolume,
    pickVariant,
    strikeVariation,
    trimVoices,
} from "./audioRules";

describe("channelVolume", () => {
    it("le volume général multiplie celui du canal", () => {
        const settings = {
            ...DEFAULT_AUDIO_SETTINGS,
            master: 0.5,
            effects: 0.8,
        };
        expect(channelVolume(settings, "effects")).toBeCloseTo(0.4);
    });

    it("muet : tout est à zéro", () => {
        const settings = { ...DEFAULT_AUDIO_SETTINGS, muted: true };
        for (const channel of ["music", "ambience", "effects"] as const) {
            expect(channelVolume(settings, channel)).toBe(0);
        }
    });

    it("un réglage hors limites est ramené entre 0 et 1", () => {
        const settings = { ...DEFAULT_AUDIO_SETTINGS, master: 3, music: -1 };
        expect(channelVolume(settings, "music")).toBe(0);
        expect(channelVolume(settings, "effects")).toBeLessThanOrEqual(1);
    });
});

describe("pickVariant", () => {
    it("ne rejoue jamais la même variante deux fois de suite", () => {
        let last = -1;
        for (let i = 0; i < 500; i++) {
            const next = pickVariant(STRIKE_VARIANTS, last);
            expect(next).not.toBe(last);
            expect(next).toBeGreaterThanOrEqual(0);
            expect(next).toBeLessThan(STRIKE_VARIANTS);
            last = next;
        }
    });

    it("finit par utiliser toutes les variantes", () => {
        const seen = new Set<number>();
        let last = -1;
        for (let i = 0; i < 500; i++)
            seen.add((last = pickVariant(STRIKE_VARIANTS, last)));
        expect(seen.size).toBe(STRIKE_VARIANTS);
    });
});

describe("strikeVariation", () => {
    it("reste dans un petit écart", () => {
        for (let i = 0; i < 100; i++) {
            const { rate, gain } = strikeVariation();
            expect(rate).toBeGreaterThanOrEqual(0.96);
            expect(rate).toBeLessThanOrEqual(1.04);
            expect(gain).toBeLessThanOrEqual(1);
        }
    });
});

describe("trimVoices", () => {
    it("coupe les frappes les plus anciennes au-delà du maximum", () => {
        const voices = [1, 2, 3, 4, 5, 6];
        const { keep, stop } = trimVoices(voices, MAX_STRIKE_VOICES);
        expect(stop).toEqual([1, 2]);
        expect(keep).toEqual([3, 4, 5, 6]);
    });

    it("ne coupe rien sous le maximum", () => {
        expect(trimVoices([1, 2], MAX_STRIKE_VOICES).stop).toEqual([]);
    });
});
