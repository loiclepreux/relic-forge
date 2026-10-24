import { createInitialForgeState, type ForgeState } from "./forgeState";
import {
    calculateForgeUpgradeCostMilli,
    calculateStrikeGainMilli,
    calculateProducerProduction,
    calculateAwakenedEmberCostMilli,
    calculateElapsedProductionWithRemainder,
    calculateOfflineGainMilli,
    rollCriticalStrike,
    CRITICAL_MULTIPLIER,
} from "./forgeEconomy";

export type StrikeWindow = {
    startedAt: number;
    count: number;
};

export type StrikeResult = {
    forge: ForgeState;
    gainMilli: number;
    strikeWindow: StrikeWindow;
    isCritical: boolean;
};

export function checkStrikeLimit(
    strikeWindow: StrikeWindow,
    now: number,
): {
    allowed: boolean;
    strikeWindow: StrikeWindow;
} {
    if (now - strikeWindow.startedAt >= 1000) {
        return {
            allowed: true,
            strikeWindow: {
                startedAt: now,
                count: 1,
            },
        };
    }

    if (strikeWindow.count >= 5) {
        return {
            allowed: false,
            strikeWindow,
        };
    }

    return {
        allowed: true,
        strikeWindow: {
            ...strikeWindow,
            count: strikeWindow.count + 1,
        },
    };
}

function applyUpgrade(forge: ForgeState): ForgeState {
    const upgradeCostMilli = calculateForgeUpgradeCostMilli(forge.forgeForce);

    // Vérifier que le solde, le niveau et le coût sont valides.
    if (
        !Number.isSafeInteger(forge.echoesMilli) ||
        forge.echoesMilli < 0 ||
        !Number.isSafeInteger(forge.forgeForce) ||
        forge.forgeForce < 0 ||
        forge.forgeForce >= Number.MAX_SAFE_INTEGER ||
        !Number.isSafeInteger(upgradeCostMilli) ||
        upgradeCostMilli < 0
    ) {
        return forge;
    }

    // Vérifier que le joueur possède assez de ressources.
    if (forge.echoesMilli < upgradeCostMilli) {
        return forge;
    }

    return {
        ...forge,
        echoesMilli: forge.echoesMilli - upgradeCostMilli,
        forgeForce: forge.forgeForce + 1,
    };
}

function applyStrike(
    forge: ForgeState,
    strikeWindow: StrikeWindow,
    now: number,
    random: () => number,
    baseStrikeGain: number = 1,
    multiplier: number = 1,
): StrikeResult {
    const strikeCheck = checkStrikeLimit(strikeWindow, now);

    if (!strikeCheck.allowed) {
        return {
            forge,
            gainMilli: 0,
            strikeWindow: strikeCheck.strikeWindow,
            isCritical: false,
        };
    }

    const passiveProduction = calculateProducerProduction(forge.producers);

    // Le critique ne se tire que pour une frappe comptée (limite de 5/s).
    const isCritical = rollCriticalStrike(random);
    const criticalMultiplier = isCritical ? CRITICAL_MULTIPLIER : 1;

    const gainMilli = calculateStrikeGainMilli(
        baseStrikeGain,
        forge.forgeForce,
        passiveProduction,
        multiplier * criticalMultiplier,
    );

    // Empêcher un dépassement du solde maximal sûr.
    if (
        !Number.isSafeInteger(forge.echoesMilli) ||
        !Number.isSafeInteger(gainMilli) ||
        gainMilli < 0 ||
        gainMilli > Number.MAX_SAFE_INTEGER - forge.echoesMilli
    ) {
        return {
            forge,
            gainMilli: 0,
            strikeWindow: strikeCheck.strikeWindow,
            isCritical: false,
        };
    }

    return {
        forge: {
            ...forge,
            echoesMilli: forge.echoesMilli + gainMilli,
        },
        gainMilli,
        strikeWindow: strikeCheck.strikeWindow,
        isCritical,
    };
}

export function accrueProduction(forge: ForgeState, now: number): ForgeState {
    const elapsedMilliseconds = Math.max(0, now - forge.lastProductionAt);

    const passiveProduction = calculateProducerProduction(forge.producers);

    const production = calculateElapsedProductionWithRemainder(
        passiveProduction,
        elapsedMilliseconds,
        forge.productionRemainderMilli,
    );

    // Vérifier que le gain passif ne dépasse pas le solde maximal sûr.
    const gainIsSafe =
        Number.isSafeInteger(forge.echoesMilli) &&
        forge.echoesMilli >= 0 &&
        Number.isSafeInteger(production.gainMilli) &&
        production.gainMilli >= 0 &&
        production.gainMilli <= Number.MAX_SAFE_INTEGER - forge.echoesMilli;

    if (!gainIsSafe) {
        return {
            ...forge,
            lastProductionAt: Math.max(now, forge.lastProductionAt),
        };
    }

    return {
        ...forge,
        echoesMilli: forge.echoesMilli + production.gainMilli,
        productionRemainderMilli: production.remainderMilli,
        lastProductionAt: Math.max(now, forge.lastProductionAt),
    };
}

export function resetForge(now: number = Date.now()): ForgeState {
    return createInitialForgeState(now);
}

function applyBuyAwakenedEmber(forge: ForgeState): ForgeState {
    // Condition provisoire : Force de Forge 2.
    // À remplacer par le niveau du joueur lorsque ce système existera.
    if (forge.forgeForce < 2) {
        return forge;
    }
    const owned = forge.producers.awakenedEmber;

    // Vérifier que le solde et le nombre de producteurs sont valides.
    if (
        !Number.isSafeInteger(forge.echoesMilli) ||
        forge.echoesMilli < 0 ||
        !Number.isSafeInteger(owned) ||
        owned < 0 ||
        owned >= Number.MAX_SAFE_INTEGER
    ) {
        return forge;
    }

    const costMilli = calculateAwakenedEmberCostMilli(owned);

    // Vérifier que le coût calculé est valide.
    if (!Number.isSafeInteger(costMilli) || costMilli < 0) {
        return forge;
    }

    // Vérifier que le joueur possède assez de ressources.
    if (forge.echoesMilli < costMilli) {
        return forge;
    }

    return {
        ...forge,
        echoesMilli: forge.echoesMilli - costMilli,
        producers: {
            ...forge.producers,
            awakenedEmber: owned + 1,
        },
    };
}

export function buyAwakenedEmber(
    forge: ForgeState,
    now: number = Date.now(),
): ForgeState {
    const updatedForge = accrueProduction(forge, now);

    return applyBuyAwakenedEmber(updatedForge);
}

export function upgradeForge(
    forge: ForgeState,
    now: number = Date.now(),
): ForgeState {
    const updatedForge = accrueProduction(forge, now);

    return applyUpgrade(updatedForge);
}

export function strikeForge(
    forge: ForgeState,
    strikeWindow: StrikeWindow,
    now: number,
    random: () => number = Math.random,
    baseStrikeGain: number = 1,
    multiplier: number = 1,
): StrikeResult {
    const updatedForge = accrueProduction(forge, now);

    return applyStrike(
        updatedForge,
        strikeWindow,
        now,
        random,
        baseStrikeGain,
        multiplier,
    );
}

/**
 * Retour après une absence (onglet caché, V9 option B) :
 * le temps écoulé depuis `lastProductionAt` est payé comme du hors-ligne
 * (50 %, 8 h maximum). Le reste de production en cours est abandonné.
 */
export function resumeAfterAbsence(
    forge: ForgeState,
    now: number,
): {
    forge: ForgeState;
    gainMilli: number;
} {
    // Horloge revenue en arrière : aucun gain, on ne recule pas la date.
    if (now <= forge.lastProductionAt) {
        return { forge, gainMilli: 0 };
    }

    const gainMilli = calculateOfflineGainMilli(
        calculateProducerProduction(forge.producers),
        now - forge.lastProductionAt,
    );

    const gainIsSafe =
        Number.isSafeInteger(forge.echoesMilli) &&
        forge.echoesMilli >= 0 &&
        gainMilli <= Number.MAX_SAFE_INTEGER - forge.echoesMilli;

    return {
        forge: {
            ...forge,
            echoesMilli: forge.echoesMilli + (gainIsSafe ? gainMilli : 0),
            productionRemainderMilli: 0,
            lastProductionAt: now,
        },
        gainMilli: gainIsSafe ? gainMilli : 0,
    };
}
