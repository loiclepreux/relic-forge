// ---------------------------------------------------------------
// Réglages d'affichage et de confort (Bible 24.15 et 24.16).
// Ils ne changent que l'apparence : jamais la partie.
// ---------------------------------------------------------------

export type GraphicsQuality = "high" | "medium" | "low" | "reduced";

export type DisplaySettings = {
    quality: GraphicsQuality;
    /** Animations réduites : pas de mouvement ample (marteau, rotation, anneaux). */
    reduceMotion: boolean;
    /** Éclats de lumière (frappe, achats). */
    flashes: boolean;
    /** Légère secousse de la Forge à chaque frappe. */
    shake: boolean;
};

export const QUALITY_LABELS: Record<GraphicsQuality, string> = {
    high: "Élevée",
    medium: "Moyenne",
    low: "Faible",
    reduced: "Réduite",
};

/** Par défaut : tous les effets, sauf si l'ordinateur demande moins d'animations. */
export function defaultDisplaySettings(
    systemPrefersReducedMotion: boolean,
): DisplaySettings {
    return {
        quality: "high",
        reduceMotion: systemPrefersReducedMotion,
        flashes: true,
        shake: !systemPrefersReducedMotion,
    };
}

/** Relit des réglages enregistrés, en ignorant ce qui n'est pas valable. */
export function sanitizeDisplaySettings(
    saved: unknown,
    defaults: DisplaySettings,
): DisplaySettings {
    const settings = { ...defaults };
    if (typeof saved !== "object" || saved === null) return settings;
    const value = saved as Record<string, unknown>;
    if (
        typeof value.quality === "string" &&
        value.quality in QUALITY_LABELS
    ) {
        settings.quality = value.quality as GraphicsQuality;
    }
    for (const key of ["reduceMotion", "flashes", "shake"] as const) {
        if (typeof value[key] === "boolean") settings[key] = value[key];
    }
    return settings;
}

export type QualityProfile = {
    /** Part des étincelles conservées. */
    sparks: number;
    /** Part de la poussière et des braises d'ambiance. */
    motes: number;
};

const PROFILES: Record<GraphicsQuality, QualityProfile> = {
    high: { sparks: 1, motes: 1 },
    medium: { sparks: 0.6, motes: 0.6 },
    low: { sparks: 0.35, motes: 0.3 },
    reduced: { sparks: 0.2, motes: 0 },
};

export function qualityProfile(quality: GraphicsQuality): QualityProfile {
    return PROFILES[quality];
}

/** Intensité des éclats de lumière : atténués (jamais supprimés) si désactivés. */
export function flashScale(settings: DisplaySettings): number {
    return settings.flashes ? 1 : 0.25;
}

/** Part des étincelles d'une frappe, réglages et confort compris. */
export function sparkDensity(settings: DisplaySettings): number {
    const base = qualityProfile(settings.quality).sparks;
    return settings.reduceMotion ? base * 0.5 : base;
}
