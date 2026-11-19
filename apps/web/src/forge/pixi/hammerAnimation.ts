// ---------------------------------------------------------------
// Mouvement du marteau à chaque frappe. Logique pure : l'angle du
// marteau t millisecondes après le clic. Angle 0 = marteau posé sur
// l'enclume ; angle positif = marteau levé.
// ---------------------------------------------------------------

/** Le marteau touche l'enclume : étincelles et éclat partent à cet instant. */
export const HAMMER_IMPACT_MS = 45;
/** Il reste un instant contre l'enclume… */
const HAMMER_HOLD_MS = 25;
/** …puis remonte, prêt pour la frappe suivante (5 frappes par seconde = 200 ms). */
export const HAMMER_RETURN_END_MS = 190;

export const HAMMER_IMPACT_ANGLE = 0;
export const HAMMER_REST_ANGLE = 1.0;

/**
 * Angle du marteau `msSinceStrike` après le clic, en partant de
 * `fromAngle` (sa position au moment du clic : s'il remontait encore,
 * il redescend de là, sans à-coup).
 */
export function hammerAngle(
    msSinceStrike: number,
    fromAngle: number,
    reducedMotion: boolean,
): number {
    // Animations réduites : le marteau reste immobile.
    if (reducedMotion) return HAMMER_REST_ANGLE;
    if (msSinceStrike < 0) return fromAngle;

    if (msSinceStrike < HAMMER_IMPACT_MS) {
        // Descente qui accélère, comme un vrai coup.
        const p = msSinceStrike / HAMMER_IMPACT_MS;
        return fromAngle + (HAMMER_IMPACT_ANGLE - fromAngle) * p * p;
    }
    const returnStart = HAMMER_IMPACT_MS + HAMMER_HOLD_MS;
    if (msSinceStrike < returnStart) return HAMMER_IMPACT_ANGLE;
    if (msSinceStrike < HAMMER_RETURN_END_MS) {
        // Remontée qui ralentit en arrivant en haut.
        const p =
            (msSinceStrike - returnStart) /
            (HAMMER_RETURN_END_MS - returnStart);
        const eased = 1 - (1 - p) * (1 - p);
        return (
            HAMMER_IMPACT_ANGLE +
            (HAMMER_REST_ANGLE - HAMMER_IMPACT_ANGLE) * eased
        );
    }
    return HAMMER_REST_ANGLE;
}
