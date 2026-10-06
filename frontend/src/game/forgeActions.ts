import { calculateStrikeGain, normalizeEchoes } from "./forgeEconomy";
import type { ForgeState } from "./forgeState";

export function strikeForge(
    forge: ForgeState,
    baseStrikeGain: number,
): ForgeState {
    const strikeGain = calculateStrikeGain(baseStrikeGain, forge.forgeForce);

    return {
        ...forge,
        echoes: normalizeEchoes(forge.echoes + strikeGain),
    };
}

export function upgradeForge(
    forge: ForgeState,
    upgradeCost: number,
): ForgeState {
    if (forge.echoes < upgradeCost) {
        return forge;
    }

    return {
        ...forge,
        echoes: normalizeEchoes(forge.echoes - upgradeCost),
        forgeForce: forge.forgeForce + 1,
    };
}
