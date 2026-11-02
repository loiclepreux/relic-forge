import { BadRequestException } from "@nestjs/common";

export type Credentials = {
    email: string;
    password: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;

/**
 * Vérifie le corps d'une requête d'inscription ou de connexion.
 * Ne fait jamais confiance à ce qu'envoie le navigateur.
 */
export function readCredentials(body: unknown): Credentials {
    if (typeof body !== "object" || body === null) {
        throw new BadRequestException("Données manquantes.");
    }

    const { email, password } = body as Record<string, unknown>;

    if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
        throw new BadRequestException("Adresse e-mail invalide.");
    }

    if (
        typeof password !== "string" ||
        password.length < MIN_PASSWORD_LENGTH ||
        password.length > MAX_PASSWORD_LENGTH
    ) {
        throw new BadRequestException(
            `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
        );
    }

    return { email: email.trim().toLowerCase(), password };
}
