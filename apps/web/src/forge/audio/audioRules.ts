// ---------------------------------------------------------------
// Règles du son de la Forge (Bible 24.10 et 24.11). Logique pure.
// ---------------------------------------------------------------

export type AudioSettings = {
    /** Volumes de 0 à 1. */
    master: number;
    music: number;
    ambience: number;
    effects: number;
    muted: boolean;
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
    master: 0.8,
    music: 0.35,
    ambience: 0.5,
    effects: 0.8,
    muted: false,
};

export type AudioChannel = "music" | "ambience" | "effects";

/** Volume réel d'un canal : le volume général multiplie celui du canal. */
export function channelVolume(
    settings: AudioSettings,
    channel: AudioChannel,
): number {
    if (settings.muted) return 0;
    return clamp01(settings.master) * clamp01(settings[channel]);
}

/** Nombre de variantes du son de frappe (strike-1 à strike-8). */
export const STRIKE_VARIANTS = 8;
/** Au-delà, la frappe la plus ancienne est coupée : pas de saturation à 5 frappes/s. */
export const MAX_STRIKE_VOICES = 4;

/** Variante suivante : jamais deux fois la même d'affilée (Bible 24.8). */
export function pickVariant(
    count: number,
    last: number,
    random: () => number = Math.random,
): number {
    if (count <= 1) return 0;
    const pick = Math.floor(random() * (count - 1));
    return pick >= last && last >= 0 ? pick + 1 : pick;
}

/** Léger écart de hauteur et de volume, pour que chaque coup sonne vivant. */
export function strikeVariation(random: () => number = Math.random) {
    return {
        rate: 0.96 + random() * 0.08,
        gain: 0.85 + random() * 0.15,
    };
}

/** Sépare les voix à garder et celles à couper (les plus anciennes d'abord). */
export function trimVoices<T>(
    voices: readonly T[],
    max: number,
): { keep: T[]; stop: T[] } {
    const excess = Math.max(voices.length - max, 0);
    return { stop: voices.slice(0, excess), keep: voices.slice(excess) };
}

function clamp01(value: number): number {
    return Math.min(Math.max(value, 0), 1);
}
