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
