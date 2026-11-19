import { describe, expect, it } from "vitest";
import {
    defaultDisplaySettings,
    flashScale,
    qualityProfile,
    sanitizeDisplaySettings,
    sparkDensity,
} from "./displaySettings";
import { isStrikeKey } from "./keyboard";

describe("réglages d'affichage", () => {
    it("suivent par défaut la préférence de l'ordinateur", () => {
        expect(defaultDisplaySettings(false).reduceMotion).toBe(false);
        const calm = defaultDisplaySettings(true);
        expect(calm.reduceMotion).toBe(true);
        expect(calm.shake).toBe(false);
    });

    it("ignorent les valeurs enregistrées invalides", () => {
        const defaults = defaultDisplaySettings(false);
        expect(sanitizeDisplaySettings("n'importe quoi", defaults)).toEqual(defaults);
        expect(
            sanitizeDisplaySettings({ quality: "ultra", flashes: "non" }, defaults),
        ).toEqual(defaults);
        expect(
            sanitizeDisplaySettings({ quality: "low", flashes: false }, defaults),
        ).toEqual({ ...defaults, quality: "low", flashes: false });
    });

    it("chaque qualité allège un peu plus les effets", () => {
        const order = ["high", "medium", "low", "reduced"] as const;
        const sparks = order.map((q) => qualityProfile(q).sparks);
        const motes = order.map((q) => qualityProfile(q).motes);
        expect(sparks).toEqual([...sparks].sort((a, b) => b - a));
        expect(motes).toEqual([...motes].sort((a, b) => b - a));
        expect(qualityProfile("reduced").motes).toBe(0);
    });

    it("animations réduites : moitié moins d'étincelles", () => {
        const settings = defaultDisplaySettings(false);
        expect(sparkDensity({ ...settings, reduceMotion: true })).toBe(
            sparkDensity(settings) / 2,
        );
    });

    it("éclats désactivés : fortement atténués", () => {
        const settings = defaultDisplaySettings(false);
        expect(flashScale(settings)).toBe(1);
        expect(flashScale({ ...settings, flashes: false })).toBeLessThan(0.5);
    });
});

describe("frappe au clavier", () => {
    const press = { code: "Space", repeat: false, targetIsInteractive: false };

    it("Espace frappe la Forge", () => {
        expect(isStrikeKey(press)).toBe(true);
    });

    it("garder la touche enfoncée ne frappe pas en boucle", () => {
        expect(isStrikeKey({ ...press, repeat: true })).toBe(false);
    });

    it("Espace garde son rôle dans un champ ou sur un bouton", () => {
        expect(isStrikeKey({ ...press, targetIsInteractive: true })).toBe(false);
    });

    it("les autres touches ne frappent pas", () => {
        expect(isStrikeKey({ ...press, code: "KeyA" })).toBe(false);
    });
});
