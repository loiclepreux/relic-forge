import { describe, expect, it } from "vitest";
import { ANVIL_AT_REST, anvilFrame, strikeDurationMs } from "./anvilAnimation";

describe("anvilFrame", () => {
    it("réagit dès 0 ms, sans attendre le serveur", () => {
        expect(anvilFrame(0, "normal", false).flash).toBeGreaterThan(0);
    });

    it("se comprime entre 20 et 70 ms, au plus fort vers 45 ms", () => {
        expect(anvilFrame(10, "normal", false).scaleY).toBe(1);
        const middle = anvilFrame(45, "normal", false);
        expect(middle.scaleY).toBeLessThan(0.95);
        expect(middle.scaleX).toBeGreaterThan(1);
        expect(anvilFrame(80, "normal", false).scaleY).toBe(1);
    });

    it("revient au repos après la frappe", () => {
        for (const kind of ["normal", "critical"] as const) {
            expect(anvilFrame(strikeDurationMs(kind), kind, false)).toEqual(
                ANVIL_AT_REST,
            );
        }
    });

    it("un critique brille plus fort et plus longtemps", () => {
        expect(anvilFrame(50, "critical", false).flash).toBeGreaterThan(
            anvilFrame(50, "normal", false).flash,
        );
        expect(strikeDurationMs("critical")).toBeGreaterThan(
            strikeDurationMs("normal"),
        );
    });

    it("animations réduites : l'éclat reste, la compression disparaît", () => {
        const frame = anvilFrame(45, "normal", true);
        expect(frame.scaleY).toBe(1);
        expect(frame.flash).toBeGreaterThan(0);
    });

    it("l'éclat ne dépasse jamais 1", () => {
        for (let t = 0; t < 300; t += 5) {
            expect(anvilFrame(t, "critical", false).flash).toBeLessThanOrEqual(
                1,
            );
        }
    });
});
