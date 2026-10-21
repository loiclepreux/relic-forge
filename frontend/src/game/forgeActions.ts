import {
    calculateStrikeGain,
    normalizeEchoes,
    calculateForgeUpgradeCost,
    calculateCriticalStrikeGain,
} from "./forgeEconomy";
import type { ForgeState } from "./forgeState";

export function strikeForge(
    forge: ForgeState,
    baseStrikeGain: number,
    critical: boolean = false,
): ForgeState {
    const strikeGain = calculateStrikeGain(baseStrikeGain, forge.forgeForce);

    const finalStrikeGain = critical
        ? calculateCriticalStrikeGain(strikeGain)
        : strikeGain;

    return {
        ...forge,
        echoes: normalizeEchoes(forge.echoes + finalStrikeGain),
    };
}

export function upgradeForge(forge: ForgeState): ForgeState {
    const upgradeCost = calculateForgeUpgradeCost(forge.forgeForce);

    if (forge.echoes < upgradeCost) {
        return forge;
    }

    return {
        ...forge,
        echoes: normalizeEchoes(forge.echoes - upgradeCost),
        forgeForce: forge.forgeForce + 1,
    };
}

export function resetForge(): ForgeState {
    return {
        echoes: 0,
        forgeForce: 0,
    };
}
