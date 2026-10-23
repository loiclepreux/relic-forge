import type { LegacyForgeStateV1, ForgeState } from "./forgeState";
import { migrateForgeStateFromV1 } from "./forgeState";

const SAVE_KEY_V1 = "relic-forge-save";
const SAVE_KEY = "relic-forge-save-v2";

type LegacyForgeSaveV1 = {
    forge: LegacyForgeStateV1;
    savedAt: number;
};

type ForgeSave = {
    forge: ForgeState;
    savedAt: number;
};

export type LoadedForgeSave = {
    forge: ForgeState;
    savedAt: number;
};

export type ForgeLoadResult =
    | {
          status: "loaded";
          data: LoadedForgeSave;
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

export function isForgeState(value: unknown): value is ForgeState {
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

function isLegacyForgeStateV1(value: unknown): value is LegacyForgeStateV1 {
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

export function isForgeSave(value: unknown): value is ForgeSave {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const save = value as Record<string, unknown>;

    if (!isForgeState(save.forge)) {
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

function isLegacyForgeSaveV1(value: unknown): value is LegacyForgeSaveV1 {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const save = value as Record<string, unknown>;

    return (
        isLegacyForgeStateV1(save.forge) &&
        typeof save.savedAt === "number" &&
        Number.isFinite(save.savedAt) &&
        save.savedAt >= 0
    );
}

export function saveForgeState(
    forge: ForgeState,
    storage: Pick<Storage, "setItem"> = localStorage,
): void {
    const save: ForgeSave = {
        forge,
        savedAt: Date.now(),
    };

    // Vérifier la cohérence de la sauvegarde complète.
    if (!isForgeSave(save)) {
        console.error("Sauvegarde V2 refusée : données ou dates invalides.");
        return;
    }

    // Protéger l'écriture contre les erreurs de stockage.
    try {
        storage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (error) {
        console.error("Impossible d'enregistrer la sauvegarde V2 :", error);
    }
}

export function loadForgeState(
    storage: Pick<Storage, "getItem"> = localStorage,
): ForgeLoadResult {
    try {
        const savedForge = storage.getItem(SAVE_KEY);

        if (savedForge !== null) {
            const parsedV2: unknown = JSON.parse(savedForge);

            if (!isForgeSave(parsedV2)) {
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

        const savedForgeV1 = storage.getItem(SAVE_KEY_V1);

        if (savedForgeV1 === null) {
            return { status: "missing" };
        }

        const parsedV1: unknown = JSON.parse(savedForgeV1);

        if (!isLegacyForgeSaveV1(parsedV1)) {
            console.error("Sauvegarde V1 invalide.");
            return { status: "error" };
        }

        const migratedForge = migrateForgeStateFromV1(
            parsedV1.forge,
            parsedV1.savedAt,
        );

        if (!isForgeState(migratedForge)) {
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
