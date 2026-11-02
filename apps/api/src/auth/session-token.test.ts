import { describe, expect, it } from "vitest";
import {
    createSessionToken,
    hashSessionToken,
    readCookie,
} from "./session-token";

describe("jetons de session", () => {
    it("crée des jetons différents et assez longs", () => {
        const a = createSessionToken();
        const b = createSessionToken();
        expect(a).not.toBe(b);
        expect(a.length).toBeGreaterThanOrEqual(40);
    });

    it("donne toujours la même empreinte pour un même jeton", () => {
        const token = createSessionToken();
        expect(hashSessionToken(token)).toBe(hashSessionToken(token));
        expect(hashSessionToken(token)).not.toBe(token);
    });
});

describe("lecture des cookies", () => {
    it("trouve le bon cookie parmi plusieurs", () => {
        expect(readCookie("a=1; rf_session=abc; b=2", "rf_session")).toBe(
            "abc",
        );
    });

    it("renvoie null si le cookie est absent", () => {
        expect(readCookie("a=1", "rf_session")).toBeNull();
        expect(readCookie(undefined, "rf_session")).toBeNull();
    });
});
