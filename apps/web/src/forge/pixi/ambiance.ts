// ---------------------------------------------------------------
// Ambiance de chaque stade de la Forge (Bible 24.3). Logique pure :
// les réglages de chaque stade, et le mélange progressif de l'un
// vers l'autre quand la Forge change de stade.
// ---------------------------------------------------------------

export type Ambiance = {
    /** Lueur derrière l'enclume : couleur et force (1 = normale). */
    glowColor: number;
    glowStrength: number;
    /** Part de poussière en suspension (0 à 1). */
    dust: number;
    /** Part de braises qui montent (0 à 1) et leur couleur. */
    embers: number;
    emberColor: number;
    /** Canaux incandescents au sol (0 = éteints, 1 = allumés). */
    channels: number;
    channelColor: number;
};

/** Stades 1 à 4. Les stades 3 et 4 sont provisoires, complétés avant le MVP. */
export const STAGE_AMBIANCES: readonly Ambiance[] = [
    // 1. Forge endormie : poussière, braises presque éteintes, lueur faible.
    {
        glowColor: 0xa0582a,
        glowStrength: 0.55,
        dust: 1,
        embers: 0.15,
        emberColor: 0xc9733a,
        channels: 0,
        channelColor: 0xff7a2a,
    },
    // 2. Forge éveillée : canaux incandescents, braises qui montent.
    {
        glowColor: 0xff8a2a,
        glowStrength: 1,
        dust: 0.35,
        embers: 0.7,
        emberColor: 0xffa040,
        channels: 1,
        channelColor: 0xff7a2a,
    },
    // 3. Forge ancestrale (provisoire) : plus chaude, plus vive.
    {
        glowColor: 0xff7a3c,
        glowStrength: 1.15,
        dust: 0.2,
        embers: 0.85,
        emberColor: 0xffc060,
        channels: 1,
        channelColor: 0xffb347,
    },
    // 4. Forge transcendante (provisoire) : énergie dorée et violette.
    {
        glowColor: 0xffc46b,
        glowStrength: 1.3,
        dust: 0.1,
        embers: 1,
        emberColor: 0xd9b8ff,
        channels: 1,
        channelColor: 0xffd27a,
    },
];

/** Durée du passage d'une ambiance à la suivante. */
export const STAGE_TRANSITION_MS = 2500;

export function ambianceForStage(stage: number): Ambiance {
    const index = Math.min(Math.max(Math.round(stage), 1), 4) - 1;
    return STAGE_AMBIANCES[index];
}

/** Mélange de deux couleurs 0xRRGGBB. */
export function mixColor(from: number, to: number, p: number): number {
    const channel = (shift: number) => {
        const a = (from >> shift) & 0xff;
        const b = (to >> shift) & 0xff;
        return Math.round(a + (b - a) * p) << shift;
    };
    return channel(16) | channel(8) | channel(0);
}

/** L'ambiance à mi-chemin : `p` de 0 (départ) à 1 (arrivée), adouci aux deux bouts. */
export function mixAmbiance(from: Ambiance, to: Ambiance, p: number): Ambiance {
    const t = Math.min(Math.max(p, 0), 1);
    const eased = t * t * (3 - 2 * t);
    const mix = (a: number, b: number) => a + (b - a) * eased;
    return {
        glowColor: mixColor(from.glowColor, to.glowColor, eased),
        glowStrength: mix(from.glowStrength, to.glowStrength),
        dust: mix(from.dust, to.dust),
        embers: mix(from.embers, to.embers),
        emberColor: mixColor(from.emberColor, to.emberColor, eased),
        channels: mix(from.channels, to.channels),
        channelColor: mixColor(from.channelColor, to.channelColor, eased),
    };
}
