import { createInitialForgeStateV2, type ForgeStateV2 } from "./forgeState";
import {
    calculateForgeUpgradeCostMilli,
    calculateStrikeGainMilli,
    calculateProducerProduction,
    calculateAwakenedEmberCostMilli,
    calculateElapsedProductionWithRemainder,
} from "./forgeEconomy";

export type StrikeWindow = {
    startedAt: number;
    count: number;
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

function applyUpgrade(forge: ForgeStateV2): ForgeStateV2 {
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
    forge: ForgeStateV2,
    strikeWindow: StrikeWindow,
    now: number,
    baseStrikeGain: number = 1,
    multiplier: number = 1,
): {
    forge: ForgeStateV2;
    gainMilli: number;
    strikeWindow: StrikeWindow;
} {
    const strikeCheck = checkStrikeLimit(strikeWindow, now);

    if (!strikeCheck.allowed) {
        return {
            forge,
            gainMilli: 0,
            strikeWindow: strikeCheck.strikeWindow,
        };
    }

    const passiveProduction = calculateProducerProduction(forge.producers);

    const gainMilli = calculateStrikeGainMilli(
        baseStrikeGain,
        forge.forgeForce,
        passiveProduction,
        multiplier,
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
        };
    }

    return {
        forge: {
            ...forge,
            echoesMilli: forge.echoesMilli + gainMilli,
        },
        gainMilli,
        strikeWindow: strikeCheck.strikeWindow,
    };
}

export function accrueProduction(
    forge: ForgeStateV2,
    now: number,
): ForgeStateV2 {
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

export function resetForge(now: number = Date.now()): ForgeStateV2 {
    return createInitialForgeStateV2(now);
}

function applyBuyAwakenedEmber(forge: ForgeStateV2): ForgeStateV2 {
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
    forge: ForgeStateV2,
    now: number = Date.now(),
): ForgeStateV2 {
    const updatedForge = accrueProduction(forge, now);

    return applyBuyAwakenedEmber(updatedForge);
}

export function upgradeForge(
    forge: ForgeStateV2,
    now: number = Date.now(),
): ForgeStateV2 {
    const updatedForge = accrueProduction(forge, now);

    return applyUpgrade(updatedForge);
}

export function strikeForge(
    forge: ForgeStateV2,
    strikeWindow: StrikeWindow,
    now: number,
    baseStrikeGain: number = 1,
    multiplier: number = 1,
): {
    forge: ForgeStateV2;
    gainMilli: number;
    strikeWindow: StrikeWindow;
} {
    const updatedForge = accrueProduction(forge, now);

    return applyStrike(
        updatedForge,
        strikeWindow,
        now,
        baseStrikeGain,
        multiplier,
    );
}
