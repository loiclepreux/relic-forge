import { describe, expect, it } from "vitest";
import {
    HAMMER_IMPACT_ANGLE,
    HAMMER_IMPACT_MS,
    HAMMER_REST_ANGLE,
    HAMMER_RETURN_END_MS,
    hammerAngle,
} from "./hammerAnimation";

const REST = HAMMER_REST_ANGLE;

describe("hammerAngle", () => {
    it("commence à descendre tout de suite", () => {
        expect(hammerAngle(10, REST, false)).toBeLessThan(REST);
    });

    it("touche l'enclume à l'instant de l'impact", () => {
        expect(hammerAngle(HAMMER_IMPACT_MS, REST, false)).toBe(
            HAMMER_IMPACT_ANGLE,
        );
    });

    it("est remonté avant la frappe suivante (5 par seconde)", () => {
        expect(HAMMER_RETURN_END_MS).toBeLessThanOrEqual(200);
        expect(hammerAngle(HAMMER_RETURN_END_MS, REST, false)).toBe(REST);
    });

    it("repart d'où il est si on reclique pendant la remontée", () => {
        const halfway = hammerAngle(130, REST, false);
        expect(halfway).toBeGreaterThan(HAMMER_IMPACT_ANGLE);
        expect(halfway).toBeLessThan(REST);
        expect(hammerAngle(0, halfway, false)).toBe(halfway);
        expect(hammerAngle(HAMMER_IMPACT_MS, halfway, false)).toBe(
            HAMMER_IMPACT_ANGLE,
        );
    });

    it("ne sort jamais de sa course", () => {
        for (let t = 0; t <= 300; t += 5) {
            const angle = hammerAngle(t, REST, false);
            expect(angle).toBeGreaterThanOrEqual(HAMMER_IMPACT_ANGLE);
            expect(angle).toBeLessThanOrEqual(REST);
        }
    });

    it("animations réduites : le marteau ne bouge pas", () => {
        expect(hammerAngle(HAMMER_IMPACT_MS, REST, true)).toBe(REST);
    });
});
