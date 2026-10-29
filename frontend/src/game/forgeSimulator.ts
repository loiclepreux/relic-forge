import { createInitialForgeState, type ForgeState } from "./forgeState";
import {
    accrueProduction,
    buyAwakenedEmber,
    strikeForge,
    upgradeForge,
    type StrikeWindow,
} from "./forgeActions";
import {
    calculateAwakenedEmberCostMilli,
    calculateForgeUpgradeCostMilli,
    calculateProducerProduction,
} from "./forgeEconomy";

// ---------------------------------------------------------------
// Simulateur d'équilibrage de la Forge.
// Il utilise exactement le même moteur que le jeu : si une règle
// change dans le moteur, le simulateur la prend en compte.
// ---------------------------------------------------------------

/** Un profil de joueur : combien de fois il clique par seconde. */
export type SimulationProfile = {
    name: string;
    strikesPerSecond: number;
};

export type SimulationOptions = {
    /** Durée de jeu actif simulée, en secondes. */
    durationSeconds: number;
    /** Coup critique activé (10 %, ×2) ou désactivé, pour comparer. */
    critical: boolean;
    /** Graine du hasard : même graine = mêmes résultats. */
    seed: number;
};

export type SimulationResult = {
    profile: string;
    critical: boolean;
    /** Secondes avant le premier achat (null si jamais atteint). */
    firstPurchaseAt: number | null;
    /** Secondes avant la première Braise éveillée. */
    firstEmberAt: number | null;
    /** Secondes avant d'atteindre chaque Force de Forge. */
    forceReachedAt: Record<number, number | null>;
    finalForce: number;
    finalEmbers: number;
    /** Production passive à la fin, en Échos par seconde. */
    finalProduction: number;
    strikesCounted: number;
    criticalStrikes: number;
};

/** Paliers de Force mesurés (stades provisoires + Braise). */
export const FORCE_MILESTONES = [2, 5, 10, 20] as const;

/** Les profils de la Bible (13.14), traduits en cadence de clics. */
export const DEFAULT_PROFILES: SimulationProfile[] = [
    { name: "Très actif (8 clics/s)", strikesPerSecond: 8 },
    { name: "Régulier (3 clics/s)", strikesPerSecond: 3 },
    { name: "Occasionnel (1 clic/s)", strikesPerSecond: 1 },
    { name: "Tranquille (1 clic / 3 s)", strikesPerSecond: 1 / 3 },
];

/**
 * Générateur aléatoire à graine (mulberry32).
 * Il donne toujours la même suite de nombres pour une même graine,
 * ce qui rend les simulations reproductibles.
 */
export function createSeededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Tirage qui ne donne jamais de critique (critique désactivé). */
const neverCritical = () => 1;

/**
 * Stratégie d'achat simple : tant que c'est possible,
 * acheter l'option la moins chère (amélioration ou Braise).
 */
function buyEverythingAffordable(forge: ForgeState, now: number): ForgeState {
    for (;;) {
        const upgradeCost = calculateForgeUpgradeCostMilli(forge.forgeForce);
        const emberCost = calculateAwakenedEmberCostMilli(
            forge.producers.awakenedEmber,
        );

        const next =
            forge.forgeForce >= 2 && emberCost < upgradeCost
                ? buyAwakenedEmber(forge, now)
                : upgradeForge(forge, now);

        // Rien n'a changé : plus assez d'Échos.
        if (next === forge || next.echoesMilli === forge.echoesMilli) {
            return forge;
        }

        forge = next;
    }
}

export function simulate(
    profile: SimulationProfile,
    options: SimulationOptions,
): SimulationResult {
    const startAt = 0;
    const random = options.critical
        ? createSeededRandom(options.seed)
        : neverCritical;

    let forge = createInitialForgeState(startAt);
    let strikeWindow: StrikeWindow = { startedAt: -1000, count: 0 };
    let pendingStrikes = 0;

    const result: SimulationResult = {
        profile: profile.name,
        critical: options.critical,
        firstPurchaseAt: null,
        firstEmberAt: null,
        forceReachedAt: Object.fromEntries(
            FORCE_MILESTONES.map((force) => [force, null]),
        ),
        finalForce: 0,
        finalEmbers: 0,
        finalProduction: 0,
        strikesCounted: 0,
        criticalStrikes: 0,
    };

    for (let second = 0; second < options.durationSeconds; second++) {
        const secondStart = startAt + second * 1000;

        // 1. Les clics de cette seconde, répartis régulièrement.
        pendingStrikes += profile.strikesPerSecond;
        const strikes = Math.floor(pendingStrikes);
        pendingStrikes -= strikes;

        for (let i = 0; i < strikes; i++) {
            const now = secondStart + Math.floor((i * 1000) / strikes);
            const strike = strikeForge(forge, strikeWindow, now, random);
            forge = strike.forge;
            strikeWindow = strike.strikeWindow;
            if (strike.gainMilli > 0) result.strikesCounted++;
            if (strike.isCritical) result.criticalStrikes++;
        }

        // 2. Production passive jusqu'à la fin de la seconde, puis achats.
        const endOfSecond = secondStart + 1000;
        forge = accrueProduction(forge, endOfSecond);

        const before = forge;
        forge = buyEverythingAffordable(forge, endOfSecond);
        const elapsed = second + 1;

        // 3. Enregistrer les paliers atteints.
        if (result.firstPurchaseAt === null && forge !== before) {
            result.firstPurchaseAt = elapsed;
        }
        if (result.firstEmberAt === null && forge.producers.awakenedEmber > 0) {
            result.firstEmberAt = elapsed;
        }
        for (const force of FORCE_MILESTONES) {
            if (
                result.forceReachedAt[force] === null &&
                forge.forgeForce >= force
            ) {
                result.forceReachedAt[force] = elapsed;
            }
        }
    }

    result.finalForce = forge.forgeForce;
    result.finalEmbers = forge.producers.awakenedEmber;
    result.finalProduction = calculateProducerProduction(forge.producers);
    return result;
}
