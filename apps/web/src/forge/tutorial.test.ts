import { describe, expect, it } from "vitest";
import type { ForgeView } from "../api/forgeApi";
import { getTutorialStep } from "./tutorial";

function view(patch: Partial<ForgeView>): ForgeView {
    return {
        echoesMilli: 0,
        forgeForce: 0,
        maxForgeForce: 50,
        awakenedEmber: 0,
        productionPerSecond: 0,
        nextUpgradeCostMilli: 120_000,
        nextEmberCostMilli: 200_000,
        stage: 1,
        stageName: "Endormie",
        serverTime: 0,
        ...patch,
    };
}

describe("tutoriel", () => {
    it("étape 1 : frapper tant que la première amélioration est trop chère", () => {
        expect(getTutorialStep(view({}), 50_000)).toMatchObject({
            number: 1,
            target: "core",
        });
    });

    it("étape 2 : améliorer dès qu'on a assez d'Échos", () => {
        expect(getTutorialStep(view({}), 120_000)).toMatchObject({
            number: 2,
            target: "upgrade",
        });
    });

    it("étape 3 : atteindre Force 2", () => {
        expect(getTutorialStep(view({ forgeForce: 1 }), 0)).toMatchObject({
            number: 3,
            target: "upgrade",
        });
    });

    it("étape 4 : acheter la première Braise", () => {
        expect(getTutorialStep(view({ forgeForce: 2 }), 0)).toMatchObject({
            number: 4,
            target: "ember",
        });
    });

    it("terminé dès la première Braise", () => {
        expect(
            getTutorialStep(view({ forgeForce: 2, awakenedEmber: 1 }), 0),
        ).toBeNull();
    });
});
