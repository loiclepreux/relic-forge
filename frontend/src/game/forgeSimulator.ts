import { createInitialForgeState, type ForgeState } from "./forgeState";
import {
    accrueProduction,
    buyAwakenedEmber,
    resumeAfterAbsence,
    strikeForge,
    upgradeForge,
    type StrikeWindow,
} from "./forgeActions";
import {
    calculateAwakenedEmberCostMilli,
    calculateForgeUpgradeCostMilli,
    calculateProducerProduction,
    MAX_FORGE_FORCE,
} from "./forgeEconomy";

// ---------------------------------------------------------------
// Simulateur d'équilibrage de la Forge.
// Il utilise exactement le même moteur que le jeu : si une règle
// change dans le moteur, le simulateur la prend en compte.
// ---------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

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

export type DailyLifeOptions = {
    /** Nombre de jours simulés. */
    days: number;
    /** Heures de début des sessions de chaque jour (ex. [9, 20]). */
    sessionStartHours: number[];
    /** Durée de chaque session, en minutes. */
    sessionMinutes: number;
    critical: boolean;
    seed: number;
};

export type SimulationResult = {
    profile: string;
    critical: boolean;
    /** Secondes de jeu avant le premier achat (null si jamais atteint). */
    firstPurchaseAt: number | null;
    /** Secondes de jeu avant la première Braise éveillée. */
    firstEmberAt: number | null;
    /** Secondes de jeu avant d'atteindre chaque Force de Forge. */
    forceReachedAt: Record<number, number | null>;
    /** Jour calendaire (1 = premier jour) où chaque Force est atteinte. */
    forceReachedOnDay: Record<number, number | null>;
    finalForce: number;
    finalEmbers: number;
    /** Production passive à la fin, en Échos par seconde. */
    finalProduction: number;
    /** Total des secondes réellement jouées. */
    playedSeconds: number;
    strikesCounted: number;
    criticalStrikes: number;
};

/**
 * Paliers de Force mesurés : déblocage de la Braise, entrée dans
 * chaque stade (11, 26, 41) et Force maximale (50).
 */
export const FORCE_MILESTONES = [2, 11, 26, 41, MAX_FORGE_FORCE] as const;

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
        const forceIsMax = forge.forgeForce >= MAX_FORGE_FORCE;

        const next =
            forge.forgeForce >= 2 && (forceIsMax || emberCost < upgradeCost)
                ? buyAwakenedEmber(forge, now)
                : upgradeForge(forge, now);

        // Rien n'a changé : plus assez d'Échos.
        if (next.echoesMilli === forge.echoesMilli) {
            return forge;
        }

        forge = next;
    }
}

// ---------------------------------------------------------------
// Une partie en cours de simulation.
// ---------------------------------------------------------------

type Run = {
    profile: SimulationProfile;
    forge: ForgeState;
    strikeWindow: StrikeWindow;
    pendingStrikes: number;
    random: () => number;
    result: SimulationResult;
};

function createRun(
    profile: SimulationProfile,
    critical: boolean,
    seed: number,
    startAt: number,
): Run {
    return {
        profile,
        forge: createInitialForgeState(startAt),
        strikeWindow: { startedAt: startAt - 1000, count: 0 },
        pendingStrikes: 0,
        random: critical ? createSeededRandom(seed) : neverCritical,
        result: {
            profile: profile.name,
            critical,
            firstPurchaseAt: null,
            firstEmberAt: null,
            forceReachedAt: Object.fromEntries(
                FORCE_MILESTONES.map((force) => [force, null]),
            ),
            forceReachedOnDay: Object.fromEntries(
                FORCE_MILESTONES.map((force) => [force, null]),
            ),
            finalForce: 0,
            finalEmbers: 0,
            finalProduction: 0,
            playedSeconds: 0,
            strikesCounted: 0,
            criticalStrikes: 0,
        },
    };
}

/** Joue une seconde : clics, production, achats, paliers. */
function playOneSecond(run: Run, secondStart: number, startAt: number) {
    const { result } = run;

    // 1. Les clics de cette seconde, répartis régulièrement.
    run.pendingStrikes += run.profile.strikesPerSecond;
    const strikes = Math.floor(run.pendingStrikes);
    run.pendingStrikes -= strikes;

    for (let i = 0; i < strikes; i++) {
        const now = secondStart + Math.floor((i * 1000) / strikes);
        const strike = strikeForge(
            run.forge,
            run.strikeWindow,
            now,
            run.random,
        );
        run.forge = strike.forge;
        run.strikeWindow = strike.strikeWindow;
        if (strike.gainMilli > 0) result.strikesCounted++;
        if (strike.isCritical) result.criticalStrikes++;
    }

    // 2. Production passive jusqu'à la fin de la seconde, puis achats.
    const endOfSecond = secondStart + 1000;
    run.forge = accrueProduction(run.forge, endOfSecond);

    const before = run.forge;
    run.forge = buyEverythingAffordable(run.forge, endOfSecond);
    result.playedSeconds++;
    const played = result.playedSeconds;
    const day = Math.floor((endOfSecond - startAt) / DAY_MS) + 1;

    // 3. Enregistrer les paliers atteints.
    if (result.firstPurchaseAt === null && run.forge !== before) {
        result.firstPurchaseAt = played;
    }
    if (result.firstEmberAt === null && run.forge.producers.awakenedEmber > 0) {
        result.firstEmberAt = played;
    }
    for (const force of FORCE_MILESTONES) {
        if (
            result.forceReachedAt[force] === null &&
            run.forge.forgeForce >= force
        ) {
            result.forceReachedAt[force] = played;
            result.forceReachedOnDay[force] = day;
        }
    }
}

function finish(run: Run): SimulationResult {
    run.result.finalForce = run.forge.forgeForce;
    run.result.finalEmbers = run.forge.producers.awakenedEmber;
    run.result.finalProduction = calculateProducerProduction(
        run.forge.producers,
    );
    return run.result;
}

// ---------------------------------------------------------------
// Scénario 1 : jeu actif sans interruption.
// ---------------------------------------------------------------

export function simulate(
    profile: SimulationProfile,
    options: SimulationOptions,
): SimulationResult {
    const run = createRun(profile, options.critical, options.seed, 0);

    for (let second = 0; second < options.durationSeconds; second++) {
        playOneSecond(run, second * 1000, 0);
    }

    return finish(run);
}

// ---------------------------------------------------------------
// Scénario 2 : une vraie vie de joueur.
// Quelques sessions par jour ; entre deux sessions, le jeu est fermé
// et la Forge produit au taux hors ligne (50 %, 8 h maximum).
// ---------------------------------------------------------------

export function simulateDailyLife(
    profile: SimulationProfile,
    options: DailyLifeOptions,
): SimulationResult {
    const startAt = options.sessionStartHours[0] * HOUR_MS;
    const run = createRun(profile, options.critical, options.seed, startAt);
    const sessionSeconds = options.sessionMinutes * 60;

    for (let day = 0; day < options.days; day++) {
        for (const hour of options.sessionStartHours) {
            const sessionStart = day * DAY_MS + hour * HOUR_MS;

            // Retour du joueur : le temps d'absence est payé hors ligne.
            run.forge = resumeAfterAbsence(run.forge, sessionStart).forge;

            for (let second = 0; second < sessionSeconds; second++) {
                playOneSecond(run, sessionStart + second * 1000, startAt);
            }
        }
    }

    return finish(run);
}
