import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("mots de passe", () => {
    it("accepte le bon mot de passe", async () => {
        const stored = await hashPassword("forge-ancienne-42");
        expect(await verifyPassword("forge-ancienne-42", stored)).toBe(true);
    });

    it("refuse un mauvais mot de passe", async () => {
        const stored = await hashPassword("forge-ancienne-42");
        expect(await verifyPassword("forge-ancienne-43", stored)).toBe(false);
    });

    it("ne stocke jamais le mot de passe en clair", async () => {
        const stored = await hashPassword("forge-ancienne-42");
        expect(stored).not.toContain("forge-ancienne-42");
        expect(stored.startsWith("scrypt$")).toBe(true);
    });

    it("donne une empreinte différente à chaque fois (sel aléatoire)", async () => {
        const a = await hashPassword("même-mot-de-passe");
        const b = await hashPassword("même-mot-de-passe");
        expect(a).not.toBe(b);
    });

    it("refuse une empreinte mal formée", async () => {
        expect(await verifyPassword("x", "n'importe-quoi")).toBe(false);
    });
});
