import { describe, expect, it } from "vitest";
import { FORGE_LAYERS } from "./layers";

describe("FORGE_LAYERS", () => {
    it("suit l'ordre de la Bible, du fond vers l'avant", () => {
        expect(FORGE_LAYERS).toEqual([
            "background",
            "ambiance",
            "machinery",
            "anvil",
            "effects",
            "events",
        ]);
    });
});
