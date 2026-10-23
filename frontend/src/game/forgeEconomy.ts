import type { ForgeProducers } from "./forgeState";

export function echoesToMilli(echoes: number): number {
    // Refuser les valeurs négatives ou non finies.
    if (!Number.isFinite(echoes) || echoes < 0) {
        return Number.NaN;
    }

    const milli = Math.round(echoes * 1000);

    // Refuser les résultats dépassant les entiers sûrs.
    if (!Number.isSafeInteger(milli)) {
        return Number.NaN;
    }

    return milli;
}

export function milliToEchoes(milli: number): number {
    return milli / 1000;
}

export function calculateStrikeGainMilli(
    baseStrikeGain: number,
    forgeForce: number,
    passiveProduction: number,
    multiplier: number = 1,
): number {
    const strikeGain =
        baseStrikeGain * (1 + 0.15 * forgeForce) + 0.1 * passiveProduction;

    return Math.floor(strikeGain * multiplier * 1000);
}

export function calculateProducerProduction(producers: ForgeProducers): number {
    const awakenedEmberProduction = 1;

    return producers.awakenedEmber * awakenedEmberProduction;
}

export function calculateElapsedProductionMilli(
    passiveProduction: number,
    elapsedMilliseconds: number,
): number {
    const safeElapsedMilliseconds = Math.max(0, elapsedMilliseconds);

    return Math.floor(passiveProduction * safeElapsedMilliseconds);
}

export function calculateOfflineGainMilli(
    passiveProduction: number,
    offlineSeconds: number,
): number {
    const MAX_OFFLINE_SECONDS = 8 * 60 * 60;
    const OFFLINE_EFFICIENCY = 0.5;

    const safeOfflineSeconds = Math.min(
        Math.max(0, offlineSeconds),
        MAX_OFFLINE_SECONDS,
    );

    return Math.floor(
        passiveProduction * safeOfflineSeconds * OFFLINE_EFFICIENCY * 1000,
    );
}

export function calculateForgeUpgradeCost(forgeForce: number): number {
    return Math.ceil(25 * 1.18 ** forgeForce);
}

export function calculateForgeUpgradeCostMilli(forgeForce: number): number {
    return calculateForgeUpgradeCost(forgeForce) * 1000;
}

export function calculateStrikeGain(
    baseStrikeGain: number,
    forgeForce: number,
): number {
    return baseStrikeGain * (1 + 0.15 * forgeForce);
}

export function calculatePassiveProduction(forgeForce: number): number {
    return forgeForce * 0.1;
}

export function calculateAwakenedEmberCostMilli(owned: number): number {
    const baseCost = 15;
    const growthRate = 1.15;

    const costEchoes = Math.ceil(baseCost * growthRate ** owned);

    return costEchoes * 1000;
}

export function calculateOfflineGain(
    passiveProduction: number,
    offlineSeconds: number,
): number {
    const offlineEfficiency = 0.5;

    return passiveProduction * offlineSeconds * offlineEfficiency;
}

export function normalizeEchoes(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getForgeStage(forgeForce: number): number {
    if (forgeForce >= 20) {
        return 4;
    }

    if (forgeForce >= 10) {
        return 3;
    }

    if (forgeForce >= 5) {
        return 2;
    }

    return 1;
}

export function getForgeStageName(forgeStage: number): string {
    switch (forgeStage) {
        case 1:
            return "Endormie";

        case 2:
            return "Éveillée";

        case 3:
            return "Ancestrale";

        case 4:
            return "Transcendante";

        default:
            return "Endormie";
    }
}

export function isCriticalStrike(chance: number = 0.1): boolean {
    return Math.random() < chance;
}

export function calculateCriticalStrikeGain(
    strikeGain: number,
    multiplier: number = 2,
): number {
    return normalizeEchoes(strikeGain * multiplier);
}

export function calculateElapsedProductionWithRemainder(
    passiveProduction: number,
    elapsedMilliseconds: number,
    previousRemainderMilli: number,
): {
    gainMilli: number;
    remainderMilli: number;
} {
    // Protection contre les valeurs numériques invalides.
    if (
        !Number.isFinite(passiveProduction) ||
        !Number.isFinite(elapsedMilliseconds) ||
        !Number.isFinite(previousRemainderMilli)
    ) {
        return {
            gainMilli: 0,
            remainderMilli: 0,
        };
    }

    const safeElapsedMilliseconds = Math.max(0, elapsedMilliseconds);

    const totalMilli =
        passiveProduction * safeElapsedMilliseconds + previousRemainderMilli;

    // Vérifier que le résultat du calcul reste valide.
    if (
        !Number.isFinite(totalMilli) ||
        totalMilli < 0 ||
        !Number.isSafeInteger(Math.floor(totalMilli))
    ) {
        return {
            gainMilli: 0,
            remainderMilli: 0,
        };
    }

    const gainMilli = Math.floor(totalMilli);

    const remainderMilli = totalMilli - gainMilli;

    return {
        gainMilli,
        remainderMilli,
    };
}

export function calculateOfflineGainMilliV2(
    passiveProduction: number,
    offlineMilliseconds: number,
): number {
    const MAX_OFFLINE_MILLISECONDS = 8 * 60 * 60 * 1000;
    const OFFLINE_EFFICIENCY = 0.5;

    if (
        !Number.isFinite(passiveProduction) ||
        passiveProduction < 0 ||
        !Number.isFinite(offlineMilliseconds)
    ) {
        return 0;
    }

    const safeOfflineMilliseconds = Math.min(
        Math.max(0, offlineMilliseconds),
        MAX_OFFLINE_MILLISECONDS,
    );

    const gainMilli = Math.floor(
        passiveProduction * safeOfflineMilliseconds * OFFLINE_EFFICIENCY,
    );

    if (!Number.isSafeInteger(gainMilli)) {
        return 0;
    }

    return gainMilli;
}
