import type { ForgeState } from "./forgeState";

const FORGE_SAVE_KEY = "relic-forge-save";

type ForgeSave = {
    forge: ForgeState;
    savedAt: number;
};

export type LoadedForgeSave = {
    forge: ForgeState;
    savedAt: number;
};

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

function isForgeSave(value: unknown): value is ForgeSave {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const save = value as Record<string, unknown>;

    return (
        isForgeState(save.forge) &&
        typeof save.savedAt === "number" &&
        Number.isFinite(save.savedAt) &&
        save.savedAt >= 0
    );
}

export function saveForgeState(forge: ForgeState): void {
    const save: ForgeSave = {
        forge,
        savedAt: Date.now(),
    };

    localStorage.setItem(FORGE_SAVE_KEY, JSON.stringify(save));
}

export function loadForgeState(): LoadedForgeSave | null {
    const savedForge = localStorage.getItem(FORGE_SAVE_KEY);

    if (savedForge === null) {
        return null;
    }

    try {
        const parsedSave: unknown = JSON.parse(savedForge);

        if (!isForgeSave(parsedSave)) {
            return null;
        }

        return {
            forge: parsedSave.forge,
            savedAt: parsedSave.savedAt,
        };
    } catch {
        return null;
    }
}

const MAX_OFFLINE_SECONDS = 8 * 60 * 60;

export function calculateOfflineSeconds(savedAt: number): number {
    const elapsedMilliseconds = Date.now() - savedAt;
    const elapsedSeconds = Math.max(0, elapsedMilliseconds / 1000);

    return Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS);
}
