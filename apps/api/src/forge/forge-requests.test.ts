import { describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { readPurchase, readStrikeBatch } from "./forge-requests";

const requestId = "demande-0001";

describe("lots de frappes", () => {
    it("accepte un lot valide", () => {
        expect(readStrikeBatch({ requestId, count: 6 })).toEqual({
            requestId,
            count: 6,
        });
    });

    it.each([
        ["sans identifiant", { count: 3 }],
        ["identifiant trop court", { requestId: "abc", count: 3 }],
        ["zéro frappe", { requestId, count: 0 }],
        ["trop de frappes", { requestId, count: 21 }],
        ["nombre décimal", { requestId, count: 2.5 }],
        ["texte", { requestId, count: "5" }],
    ])("refuse : %s", (_label, body) => {
        expect(() => readStrikeBatch(body)).toThrow(BadRequestException);
    });
});

describe("achats", () => {
    it("accepte les deux améliorations connues", () => {
        expect(readPurchase({ requestId, upgradeKey: "STRIKE_POWER" })).toEqual(
            {
                requestId,
                upgradeKey: "STRIKE_POWER",
            },
        );
        expect(
            readPurchase({ requestId, upgradeKey: "AWAKENED_EMBER" })
                .upgradeKey,
        ).toBe("AWAKENED_EMBER");
    });

    it("refuse une amélioration inconnue", () => {
        expect(() =>
            readPurchase({ requestId, upgradeKey: "INFINITE_GOLD" }),
        ).toThrow(BadRequestException);
    });
});
