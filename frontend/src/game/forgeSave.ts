import type { ForgeState, ForgeStateV2 } from "./forgeState";
import { migrateForgeStateV1ToV2 } from "./forgeState";

const FORGE_SAVE_KEY = "relic-forge-save";
const FORGE_SAVE_KEY_V2 = "relic-forge-save-v2";

type ForgeSave = {
    forge: ForgeState;
    savedAt: number;
};

type ForgeSaveV2 = {
    forge: ForgeStateV2;
    savedAt: number;
};

export type LoadedForgeSaveV2 = {
    forge: ForgeStateV2;
    savedAt: number;
};

export type ForgeLoadResult =
    | {
          status: "loaded";
          data: LoadedForgeSaveV2;
      }
    | {
          status: "missing";
      }
    | {
          status: "error";
      };

export function canAutoSave(loadStatus: ForgeLoadResult["status"]): boolean {
    return loadStatus === "loaded" || loadStatus === "missing";
}

export function isForgeStateV2(value: unknown): value is ForgeStateV2 {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const forge = value as Record<string, unknown>;

    if (
        forge.version !== 2 ||
        typeof forge.echoesMilli !== "number" ||
        !Number.isSafeInteger(forge.echoesMilli) ||
        forge.echoesMilli < 0 ||
        typeof forge.forgeForce !== "number" ||
        !Number.isSafeInteger(forge.forgeForce) ||
        forge.forgeForce < 0 ||
        typeof forge.lastProductionAt !== "number" ||
        !Number.isSafeInteger(forge.lastProductionAt) ||
        forge.lastProductionAt < 0 ||
        typeof forge.productionRemainderMilli !== "number" ||
        !Number.isFinite(forge.productionRemainderMilli) ||
        forge.productionRemainderMilli < 0 ||
        forge.productionRemainderMilli >= 1
    ) {
        return false;
    }

    if (typeof forge.producers !== "object" || forge.producers === null) {
        return false;
    }

    const producers = forge.producers as Record<string, unknown>;

    return (
        typeof producers.awakenedEmber === "number" &&
        Number.isSafeInteger(producers.awakenedEmber) &&
        producers.awakenedEmber >= 0
    );
}

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

export function isForgeSaveV2(value: unknown): value is ForgeSaveV2 {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const save = value as Record<string, unknown>;

    if (!isForgeStateV2(save.forge)) {
        return false;
    }

    if (
        typeof save.savedAt !== "number" ||
        !Number.isSafeInteger(save.savedAt) ||
        save.savedAt < 0
    ) {
        return false;
    }

    return save.forge.lastProductionAt <= save.savedAt;
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

export function saveForgeState(
    forge: ForgeStateV2,
    storage: Pick<Storage, "setItem"> = localStorage,
): void {
    const save: ForgeSaveV2 = {
        forge,
        savedAt: Date.now(),
    };

    // Vérifier la cohérence de la sauvegarde complète.
    if (!isForgeSaveV2(save)) {
        console.error("Sauvegarde V2 refusée : données ou dates invalides.");
        return;
    }

    // Protéger l'écriture contre les erreurs de stockage.
    try {
        storage.setItem(FORGE_SAVE_KEY_V2, JSON.stringify(save));
    } catch (error) {
        console.error("Impossible d'enregistrer la sauvegarde V2 :", error);
    }
}

export function loadForgeState(
    storage: Pick<Storage, "getItem"> = localStorage,
): ForgeLoadResult {
    try {
        const savedForgeV2 = storage.getItem(FORGE_SAVE_KEY_V2);

        if (savedForgeV2 !== null) {
            const parsedV2: unknown = JSON.parse(savedForgeV2);

            if (!isForgeSaveV2(parsedV2)) {
                console.error("Sauvegarde V2 invalide.");
                return { status: "error" };
            }

            return {
                status: "loaded",
                data: {
                    forge: parsedV2.forge,
                    savedAt: parsedV2.savedAt,
                },
            };
        }

        const savedForgeV1 = storage.getItem(FORGE_SAVE_KEY);

        if (savedForgeV1 === null) {
            return { status: "missing" };
        }

        const parsedV1: unknown = JSON.parse(savedForgeV1);

        if (!isForgeSave(parsedV1)) {
            console.error("Sauvegarde V1 invalide.");
            return { status: "error" };
        }

        const migratedForge = migrateForgeStateV1ToV2(
            parsedV1.forge,
            parsedV1.savedAt,
        );

        if (!isForgeStateV2(migratedForge)) {
            console.error("Migration V1 vers V2 invalide.");
            return { status: "error" };
        }

        return {
            status: "loaded",
            data: {
                forge: migratedForge,
                savedAt: parsedV1.savedAt,
            },
        };
    } catch (error) {
        console.error("Erreur de chargement V2 :", error);
        return { status: "error" };
    }
}
