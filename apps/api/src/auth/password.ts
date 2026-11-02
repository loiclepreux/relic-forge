import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Chiffrement des mots de passe avec scrypt (intégré à Node).
// Format stocké : scrypt$N$r$p$sel$empreinte (sel et empreinte en base64).
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function deriveKey(
    password: string,
    salt: Buffer,
    n: number,
    r: number,
    p: number,
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scrypt(password, salt, KEY_LENGTH, { N: n, r, p }, (error, key) => {
            if (error) reject(error);
            else resolve(key);
        });
    });
}

/** Transforme un mot de passe en empreinte à stocker en base. */
export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await deriveKey(password, salt, N, R, P);
    return [
        "scrypt",
        N,
        R,
        P,
        salt.toString("base64"),
        key.toString("base64"),
    ].join("$");
}

/** Vérifie un mot de passe contre l'empreinte stockée. */
export async function verifyPassword(
    password: string,
    stored: string,
): Promise<boolean> {
    const [algo, n, r, p, saltB64, keyB64] = stored.split("$");
    if (algo !== "scrypt" || !saltB64 || !keyB64) return false;

    const expected = Buffer.from(keyB64, "base64");
    const actual = await deriveKey(
        password,
        Buffer.from(saltB64, "base64"),
        Number(n),
        Number(r),
        Number(p),
    );

    // Comparaison en temps constant : ne révèle rien par sa durée.
    return (
        actual.length === expected.length && timingSafeEqual(actual, expected)
    );
}
