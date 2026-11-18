import { describe, expect, it } from "vitest";
import { strikeDurationMs } from "./anvilAnimation";
import { REACTION_STYLES, reactionFrame, type ReactionKind } from "./reactions";

const KINDS: ReactionKind[] = ["upgrade", "ember", "stage"];

describe("reactionFrame", () => {
    it("chaque réaction se termine", () => {
        for (const kind of KINDS) {
            const end = REACTION_STYLES[kind].durationMs;
            expect(reactionFrame(kind, end - 1, false)).not.toBeNull();
            expect(reactionFrame(kind, end, false)).toBeNull();
        }
    });

    it("respecte la hiérarchie : frappe < critique < achat < stade", () => {
        const durations = [
            strikeDurationMs("normal"),
            strikeDurationMs("critical"),
            REACTION_STYLES.upgrade.durationMs,
            REACTION_STYLES.stage.durationMs,
        ];
        expect(durations).toEqual([...durations].sort((a, b) => a - b));
        expect(REACTION_STYLES.stage.ringTo).toBeGreaterThan(
            REACTION_STYLES.upgrade.ringTo,
        );
        expect(REACTION_STYLES.stage.lightPeak).toBeGreaterThan(
            REACTION_STYLES.upgrade.lightPeak,
        );
    });

    it("l'anneau s'élargit au fil de la réaction", () => {
        const early = reactionFrame("upgrade", 50, false);
        const late = reactionFrame("upgrade", 600, false);
        expect(late!.ringRadius).toBeGreaterThan(early!.ringRadius);
        expect(late!.ringAlpha).toBeLessThan(early!.ringAlpha);
    });

    it("animations réduites : la rune reste, sans anneau ni rotation", () => {
        const frame = reactionFrame("stage", 800, true)!;
        expect(frame.runeAlpha).toBeGreaterThan(0);
        expect(frame.ringAlpha).toBe(0);
        expect(frame.runeRotation).toBe(0);
    });

    it("toutes les opacités restent entre 0 et 1", () => {
        for (const kind of KINDS) {
            for (let t = 0; t < REACTION_STYLES[kind].durationMs; t += 10) {
                const frame = reactionFrame(kind, t, false)!;
                for (const alpha of [
                    frame.ringAlpha,
                    frame.runeAlpha,
                    frame.lightAlpha,
                ]) {
                    expect(alpha).toBeGreaterThanOrEqual(0);
                    expect(alpha).toBeLessThanOrEqual(1);
                }
            }
        }
    });
});
