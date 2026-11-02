import { describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { readCredentials } from "./credentials";

describe("vérification des identifiants", () => {
    it("accepte et normalise une adresse valide", () => {
        expect(
            readCredentials({
                email: "  Loic@Exemple.FR ",
                password: "12345678",
            }),
        ).toEqual({ email: "loic@exemple.fr", password: "12345678" });
    });

    it.each([
        ["corps vide", null],
        ["e-mail manquant", { password: "12345678" }],
        ["e-mail invalide", { email: "pas-un-email", password: "12345678" }],
        ["mot de passe trop court", { email: "a@b.fr", password: "1234" }],
        ["mot de passe non texte", { email: "a@b.fr", password: 12345678 }],
    ])("refuse : %s", (_label, body) => {
        expect(() => readCredentials(body)).toThrow(BadRequestException);
    });
});
