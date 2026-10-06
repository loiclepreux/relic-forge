import type { ForgeState } from "./forgeState";

const FORGE_SAVE_KEY = "relic-forge-save";

function isForgeState(value: unknown): value is ForgeState {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const forge = value as Record<string, unknown>;

    return (
        typeof forge.echoes === "number" &&
        Number.isFinite(forge.echoes) &&
        forge.echoes >= 0 &&
        typeof forge.forgeForce === "number" &&
        Number.isInteger(forge.forgeForce) &&
        forge.forgeForce >= 0
    );
}

export function saveForgeState(forge: ForgeState): void {
    localStorage.setItem(FORGE_SAVE_KEY, JSON.stringify(forge));
}

export function loadForgeState(): ForgeState | null {
    const savedForge = localStorage.getItem(FORGE_SAVE_KEY);

    if (savedForge === null) {
        return null;
    }

    try {
        const parsedForge: unknown = JSON.parse(savedForge);

        if (!isForgeState(parsedForge)) {
            return null;
        }

        return parsedForge;
    } catch {
        return null;
    }
}
