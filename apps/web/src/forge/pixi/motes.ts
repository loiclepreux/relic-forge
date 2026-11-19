// ---------------------------------------------------------------
// Poussière et braises qui flottent dans la Forge. Logique pure.
// Positions de 0 à 1 dans la largeur et la hauteur de la scène :
// elles restent justes quand la fenêtre change de taille.
// ---------------------------------------------------------------

export type Mote = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Âge et durée de vie (braises seulement), en secondes. */
    age: number;
    life: number;
    size: number;
    /** Décalage du balancement, pour que tout ne bouge pas ensemble. */
    phase: number;
};

export const DUST_COUNT = 30;
export const EMBER_COUNT = 40;

/** Hauteur (part de la scène) où les braises naissent, et où elles s'éteignent au plus tard. */
const EMBER_SPAWN_TOP = 0.65;
const EMBER_CEILING = 0.1;

export class MoteField {
    readonly dust: Mote[];
    readonly embers: Mote[];
    private readonly random: () => number;

    constructor(random: () => number = Math.random) {
        this.random = random;
        this.dust = Array.from({ length: DUST_COUNT }, () => this.newDust());
        this.embers = Array.from({ length: EMBER_COUNT }, () => {
            const ember = this.newEmber();
            // Au départ, des braises à tous les âges : pas de vague synchronisée.
            ember.age = this.random() * ember.life;
            return ember;
        });
    }

    /** Avance de `dt` secondes ; `speed` ralentit tout (animations réduites). */
    step(dt: number, speed = 1) {
        const t = dt * speed;
        for (const mote of this.dust) {
            mote.phase += t;
            mote.x = wrap(
                mote.x + (mote.vx + 0.004 * Math.sin(mote.phase)) * t,
            );
            mote.y = wrap(mote.y + mote.vy * t);
        }
        for (let i = 0; i < this.embers.length; i++) {
            const ember = this.embers[i];
            ember.age += t;
            ember.phase += t * 2;
            ember.x += (ember.vx + 0.01 * Math.sin(ember.phase)) * t;
            ember.y += ember.vy * t;
            if (ember.age >= ember.life || ember.y < EMBER_CEILING) {
                this.embers[i] = this.newEmber();
            }
        }
    }

    /** Opacité d'une braise selon son âge : elle s'allume puis s'éteint. */
    static emberGlow(ember: Mote): number {
        return Math.sin(Math.PI * Math.min(ember.age / ember.life, 1));
    }

    private newDust(): Mote {
        const r = this.random;
        return {
            x: r(),
            y: r(),
            vx: (r() - 0.5) * 0.012,
            vy: (r() - 0.5) * 0.008,
            age: 0,
            life: Infinity,
            size: 1 + r() * 1.5,
            phase: r() * Math.PI * 2,
        };
    }

    private newEmber(): Mote {
        const r = this.random;
        return {
            // Plutôt au centre, autour de l'enclume.
            x: 0.25 + r() * 0.5,
            y: EMBER_SPAWN_TOP + r() * (1 - EMBER_SPAWN_TOP),
            vx: (r() - 0.5) * 0.02,
            vy: -(0.04 + r() * 0.06),
            age: 0,
            life: 4 + r() * 4,
            size: 1.5 + r() * 2,
            phase: r() * Math.PI * 2,
        };
    }
}

/** Ce qui sort d'un côté revient de l'autre. */
function wrap(value: number): number {
    return value - Math.floor(value);
}

/**
 * Part visible de la `index`-ième particule quand la quantité vaut
 * `amount` (0 à 1) : les particules s'ajoutent une à une, en fondu.
 */
export function moteWeight(
    index: number,
    count: number,
    amount: number,
): number {
    return Math.min(Math.max(amount * count - index, 0), 1);
}
