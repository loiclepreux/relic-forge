export function calculateForgeUpgradeCost(forgeForce: number): number {
    return Math.ceil(25 * 1.18 ** forgeForce);
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
