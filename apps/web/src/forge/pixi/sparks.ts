// ---------------------------------------------------------------
// Étincelles de frappe (Bible 24.6 et 24.9). Logique pure :
// on calcule où sont les étincelles, la scène PixiJS les dessine.
// Positions en unités de l'enclume (zone de 260), autour du point
// de frappe ; y vers le bas, comme à l'écran.
// ---------------------------------------------------------------

import type { StrikeKind } from "./anvilAnimation";

export type Spark = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Temps restant et durée de vie totale, en secondes. */
    life: number;
    maxLife: number;
    /** Longueur de la traînée, en unités. */
    size: number;
    color: number;
};

/** Jamais plus d'étincelles à l'écran, quoi qu'il arrive. */
export const SPARK_BUDGET = 160;

const GRAVITY = 1100;
/** Freinage de l'air (part de vitesse gardée par seconde). */
const AIR_DRAG = 0.25;

/** Nombre d'étincelles d'une frappe ordinaire, par stade (1 à 4). */
const SPARKS_PER_STAGE = [8, 12, 14, 16];
const CRITICAL_FACTOR = 2;

/** Couleurs par stade : de l'étincelle faible à l'énergie dorée et violette. */
const STAGE_COLORS = [
    [0xffd59a, 0xe8b27a, 0xc9a27e],
    [0xffe08a, 0xffb347, 0xfff1c9],
    [0xff9a3c, 0xffd27a, 0xffb347],
    [0xffd27a, 0xffe7a8, 0xc59bff],
];
const CRITICAL_COLOR = 0xfff6e0;

/**
 * Variantes d'impact, tirées au hasard pour éviter la répétition (24.8) :
 * angle central, ouverture et vitesse. Angles en radians, 0 = droite,
 * -π/2 = vers le haut.
 */
const PATTERNS = [
    { angle: -Math.PI / 2, spread: 2.4, speed: [320, 620] }, // gerbe
    { angle: -Math.PI / 2, spread: 3.4, speed: [260, 520] }, // éventail large
    { angle: -Math.PI / 3, spread: 1.4, speed: [420, 740] }, // jet vers la droite
    { angle: (-2 * Math.PI) / 3, spread: 1.4, speed: [420, 740] }, // jet vers la gauche
] as const;

export type BurstOptions = {
    kind: StrikeKind;
    /** Stade de la Forge, de 1 à 4. */
    stage: number;
    /** 1 = tous les effets ; plus bas = moins d'étincelles (réglages, confort). */
    density: number;
    /** Tirage au hasard entre 0 et 1 (remplaçable dans les tests). */
    random?: () => number;
};

/** Les étincelles d'une frappe. */
export function sparkBurst({
    kind,
    stage,
    density,
    random = Math.random,
}: BurstOptions): Spark[] {
    const stageIndex = Math.min(Math.max(stage, 1), 4) - 1;
    const base = SPARKS_PER_STAGE[stageIndex];
    const count = Math.round(
        base * (kind === "critical" ? CRITICAL_FACTOR : 1) * density,
    );
    const pattern = PATTERNS[Math.floor(random() * PATTERNS.length)];
    const colors = STAGE_COLORS[stageIndex];

    const sparks: Spark[] = [];
    for (let i = 0; i < count; i++) {
        const angle = pattern.angle + (random() - 0.5) * pattern.spread;
        const [min, max] = pattern.speed;
        const speed =
            (min + random() * (max - min)) * (kind === "critical" ? 1.2 : 1);
        const life = 0.3 + random() * 0.35;
        const critical = kind === "critical" && random() < 0.4;
        sparks.push({
            x: 0,
            y: 0,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life,
            maxLife: life,
            size: 10 + random() * 12,
            color: critical
                ? CRITICAL_COLOR
                : colors[Math.floor(random() * colors.length)],
        });
    }
    return sparks;
}

/** L'ensemble des étincelles vivantes, plafonné à SPARK_BUDGET. */
export class SparkPool {
    readonly sparks: Spark[] = [];

    /** Ajoute une gerbe ; ce qui dépasse le budget n'est pas créé. */
    emit(burst: Spark[]) {
        const room = SPARK_BUDGET - this.sparks.length;
        if (room <= 0) return;
        this.sparks.push(...burst.slice(0, room));
    }

    /** Fait avancer le temps de `dt` secondes et retire les étincelles éteintes. */
    step(dt: number) {
        const keep = Math.pow(AIR_DRAG, dt);
        let write = 0;
        for (const spark of this.sparks) {
            spark.life -= dt;
            if (spark.life <= 0) continue;
            spark.vx *= keep;
            spark.vy = spark.vy * keep + GRAVITY * dt;
            spark.x += spark.vx * dt;
            spark.y += spark.vy * dt;
            this.sparks[write++] = spark;
        }
        this.sparks.length = write;
    }
}
