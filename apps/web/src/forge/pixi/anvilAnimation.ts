// ---------------------------------------------------------------
// Courbes de l'animation d'une frappe sur l'enclume (Bible 24.5).
// Fonctions pures : elles disent à quoi ressemble l'enclume
// t millisecondes après la frappe, sans rien dessiner.
// ---------------------------------------------------------------

export type StrikeKind = "normal" | "critical";

export type AnvilFrame = {
    /** Étirement horizontal (1 = au repos). */
    scaleX: number;
    /** Écrasement vertical (1 = au repos). */
    scaleY: number;
    /** Intensité de l'éclat de lumière, de 0 à 1. */
    flash: number;
};

export const ANVIL_AT_REST: AnvilFrame = { scaleX: 1, scaleY: 1, flash: 0 };

/** Compression légère : de 20 à 70 ms. */
const COMPRESSION_START_MS = 20;
const COMPRESSION_END_MS = 70;
const COMPRESSION_DEPTH = 0.06;
/** Éclat : visible dès 0 ms, maximum vers 50 ms, éteint à 130 ms. */
const FLASH_PEAK_MS = 50;
const FLASH_END_MS = 130;
/** Retour visuel immédiat à 0 ms (part de l'éclat maximal). */
const FLASH_IMMEDIATE = 0.5;
/** Un coup critique dure plus longtemps et brille plus, sans devenir aveuglant. */
const CRITICAL_DURATION = 1.5;
const CRITICAL_STRENGTH = 1.4;

export function anvilFrame(
    msSinceStrike: number,
    kind: StrikeKind,
    reducedMotion: boolean,
): AnvilFrame {
    if (msSinceStrike < 0) return ANVIL_AT_REST;

    const stretch = kind === "critical" ? CRITICAL_DURATION : 1;
    const strength = kind === "critical" ? CRITICAL_STRENGTH : 1;
    const t = msSinceStrike / stretch;

    let compression = 0;
    if (!reducedMotion && t > COMPRESSION_START_MS && t < COMPRESSION_END_MS) {
        const progress =
            (t - COMPRESSION_START_MS) /
            (COMPRESSION_END_MS - COMPRESSION_START_MS);
        compression =
            Math.sin(progress * Math.PI) * COMPRESSION_DEPTH * strength;
    }

    let flash = 0;
    if (t < FLASH_PEAK_MS) {
        flash = FLASH_IMMEDIATE + (1 - FLASH_IMMEDIATE) * (t / FLASH_PEAK_MS);
    } else if (t < FLASH_END_MS) {
        flash = 1 - (t - FLASH_PEAK_MS) / (FLASH_END_MS - FLASH_PEAK_MS);
    }

    return {
        scaleX: 1 + compression / 2,
        scaleY: 1 - compression,
        flash: Math.min(1, flash * (kind === "critical" ? 1 : 0.75)),
    };
}

/** Durée après laquelle l'enclume est revenue au repos. */
export function strikeDurationMs(kind: StrikeKind): number {
    return FLASH_END_MS * (kind === "critical" ? CRITICAL_DURATION : 1);
}
