import type { ForgeState } from "./forgeState";

const FORGE_SAVE_KEY = "relic-forge-save";

export function saveForgeState(forge: ForgeState): void {
    localStorage.setItem(FORGE_SAVE_KEY, JSON.stringify(forge));
}

export function loadForgeState(): ForgeState | null {
    const savedForge = localStorage.getItem(FORGE_SAVE_KEY);

    if (savedForge === null) {
        return null;
    }

    return JSON.parse(savedForge) as ForgeState;
}
