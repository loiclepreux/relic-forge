// ---------------------------------------------------------------
// Réactions de la Forge aux achats et aux changements de stade
// (Bible 24.7). Hiérarchie : une frappe (mineure) < un achat
// (intermédiaire) < un changement de stade (majeure). Logique pure :
// l'aspect d'une réaction t millisecondes après son départ.
// Rayons en unités de l'enclume (zone de 260).
// ---------------------------------------------------------------

export type ReactionKind = "upgrade" | "ember" | "stage";

type ReactionStyle = {
    durationMs: number;
    /** Anneau de lumière qui s'élargit : rayon de départ et d'arrivée. */
    ringFrom: number;
    ringTo: number;
    /** Lueur d'ensemble au plus fort (0 à 1). */
    lightPeak: number;
    /** Tour complet de la rune en radians sur toute la réaction. */
    runeTurn: number;
    color: number;
};

export const REACTION_STYLES: Record<ReactionKind, ReactionStyle> = {
    // Amélioration : une rune dorée s'allume autour de l'enclume.
    upgrade: {
        durationMs: 700,
        ringFrom: 60,
        ringTo: 220,
        lightPeak: 0.45,
        runeTurn: 0.5,
        color: 0xffd27a,
    },
    // Braise éveillée : la même idée, couleur de braise.
    ember: {
        durationMs: 800,
        ringFrom: 60,
        ringTo: 200,
        lightPeak: 0.45,
        runeTurn: -0.5,
        color: 0xff7a3c,
    },
    // Nouveau stade : la lumière envahit la Forge, la rune fait un tour.
    stage: {
        durationMs: 1600,
        ringFrom: 80,
        ringTo: 520,
        lightPeak: 0.8,
        runeTurn: Math.PI,
        color: 0xfff1c9,
    },
};

export type ReactionFrame = {
    ringRadius: number;
    ringAlpha: number;
    runeAlpha: number;
    runeRotation: number;
    lightAlpha: number;
};

/** L'aspect de la réaction, ou null quand elle est terminée. */
export function reactionFrame(
    kind: ReactionKind,
    msSinceStart: number,
    reducedMotion: boolean,
): ReactionFrame | null {
    const style = REACTION_STYLES[kind];
    if (msSinceStart < 0 || msSinceStart >= style.durationMs) return null;
    const p = msSinceStart / style.durationMs;

    // L'anneau part vite puis ralentit, et s'efface en s'élargissant.
    const ringProgress = 1 - Math.pow(1 - p, 3);
    // La rune apparaît (premier quart), reste, puis s'éteint (derniers 40 %).
    const runeAlpha = p < 0.25 ? p / 0.25 : p > 0.6 ? (1 - p) / 0.4 : 1;
    // La lueur monte jusqu'à 20 % puis redescend.
    const light = p < 0.2 ? p / 0.2 : (1 - p) / 0.8;

    return {
        ringRadius:
            style.ringFrom + (style.ringTo - style.ringFrom) * ringProgress,
        // Animations réduites : pas d'anneau qui s'élargit, pas de rotation.
        ringAlpha: reducedMotion ? 0 : 1 - p,
        runeAlpha,
        runeRotation: reducedMotion ? 0 : style.runeTurn * ringProgress,
        lightAlpha: style.lightPeak * light,
    };
}
