import { createHash, randomBytes } from "node:crypto";

/** Nom du cookie de session. */
export const SESSION_COOKIE = "rf_session";

/** Durée de vie d'une session : 30 jours. */
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/** Crée un jeton secret, envoyé au navigateur dans le cookie. */
export function createSessionToken(): string {
    return randomBytes(32).toString("base64url");
}

/**
 * Empreinte du jeton : c'est elle qui est stockée en base.
 * Si la base fuitait, les jetons eux-mêmes resteraient inconnus.
 */
export function hashSessionToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

/** Lit la valeur d'un cookie dans l'en-tête « Cookie » d'une requête. */
export function readCookie(
    cookieHeader: string | undefined,
    name: string,
): string | null {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(";")) {
        const [key, ...rest] = part.trim().split("=");
        if (key === name) return decodeURIComponent(rest.join("="));
    }
    return null;
}
