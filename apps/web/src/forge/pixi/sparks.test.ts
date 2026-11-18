import { describe, expect, it } from "vitest";
import { SPARK_BUDGET, SparkPool, sparkBurst } from "./sparks";

/** Tirages répétables, pour des tests stables. */
function seeded(seed = 42) {
    let state = seed;
    return () => {
        state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
        return state / 2_147_483_648;
    };
}

describe("sparkBurst", () => {
    it("plus d'étincelles quand la Forge progresse", () => {
        const counts = [1, 2, 3, 4].map(
            (stage) =>
                sparkBurst({
                    kind: "normal",
                    stage,
                    density: 1,
                    random: seeded(),
                }).length,
        );
        expect(counts).toEqual([...counts].sort((a, b) => a - b));
        expect(counts[0]).toBeLessThan(counts[3]);
    });

    it("un critique en projette deux fois plus", () => {
        const options = { stage: 2, density: 1 };
        const normal = sparkBurst({
            ...options,
            kind: "normal",
            random: seeded(),
        });
        const critical = sparkBurst({
            ...options,
            kind: "critical",
            random: seeded(),
        });
        expect(critical.length).toBe(normal.length * 2);
    });

    it("la densité réduit le nombre d'étincelles", () => {
        const full = sparkBurst({
            kind: "normal",
            stage: 4,
            density: 1,
            random: seeded(),
        });
        const half = sparkBurst({
            kind: "normal",
            stage: 4,
            density: 0.5,
            random: seeded(),
        });
        expect(half.length).toBe(full.length / 2);
        expect(
            sparkBurst({
                kind: "normal",
                stage: 4,
                density: 0,
                random: seeded(),
            }),
        ).toHaveLength(0);
    });

    it("les étincelles partent vers le haut et vivent moins d'une seconde", () => {
        const random = seeded(7);
        for (let i = 0; i < 50; i++) {
            for (const spark of sparkBurst({
                kind: "critical",
                stage: 4,
                density: 1,
                random,
            })) {
                expect(spark.maxLife).toBeLessThan(1);
                expect(spark.vy).toBeLessThan(150);
            }
        }
    });
});

describe("SparkPool", () => {
    it("ne dépasse jamais le budget, même à 5 frappes critiques par seconde pendant une minute", () => {
        const pool = new SparkPool();
        const random = seeded(3);
        let peak = 0;
        for (let frame = 0; frame < 60 * 60; frame++) {
            if (frame % 12 === 0) {
                pool.emit(
                    sparkBurst({
                        kind: "critical",
                        stage: 4,
                        density: 1,
                        random,
                    }),
                );
            }
            pool.step(1 / 60);
            peak = Math.max(peak, pool.sparks.length);
        }
        expect(peak).toBeLessThanOrEqual(SPARK_BUDGET);
    });

    it("les étincelles retombent et s'éteignent", () => {
        const pool = new SparkPool();
        pool.emit(
            sparkBurst({
                kind: "normal",
                stage: 2,
                density: 1,
                random: seeded(),
            }),
        );
        pool.step(0.2);
        expect(pool.sparks.length).toBeGreaterThan(0);
        pool.step(1);
        expect(pool.sparks).toHaveLength(0);
    });
});
