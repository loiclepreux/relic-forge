import { loadForgeStateV2Safe, canAutoSaveForgeV2 } from "./forgeSave";

// TEST 1 : aucune sauvegarde présente.
const emptyStorage = {
    getItem(): string | null {
        return null;
    },
};

const missingResult = loadForgeStateV2Safe(emptyStorage);

// TEST 2 : sauvegarde V2 corrompue.
const corruptedStorage = {
    getItem(key: string): string | null {
        if (key === "relic-forge-save-v2") {
            return "{ sauvegarde invalide";
        }

        return null;
    },
};

const corruptedResult = loadForgeStateV2Safe(corruptedStorage);

// TEST 3 : sauvegarde V2 valide.
const validStorage = {
    getItem(key: string): string | null {
        if (key === "relic-forge-save-v2") {
            return JSON.stringify({
                forge: {
                    version: 2,
                    echoesMilli: 150000,
                    forgeForce: 3,
                    producers: {
                        awakenedEmber: 1,
                    },
                    lastProductionAt: 1000,
                    productionRemainderMilli: 0,
                },
                savedAt: 2000,
            });
        }

        return null;
    },
};

const validResult = loadForgeStateV2Safe(validStorage);

console.log("Test chargement sécurisé V2 :", {
    absenceDetectee: missingResult.status === "missing",

    corruptionDetectee: corruptedResult.status === "error",

    sauvegardeChargee: validResult.status === "loaded",

    soldeConserve:
        validResult.status === "loaded" &&
        validResult.data.forge.echoesMilli === 150000,

    puissanceConservee:
        validResult.status === "loaded" &&
        validResult.data.forge.forgeForce === 3,
});

// TEST 4 : migration d'une ancienne sauvegarde V1.
const oldSaveStorage = {
    getItem(key: string): string | null {
        if (key === "relic-forge-save") {
            return JSON.stringify({
                forge: {
                    echoes: 125.75,
                    forgeForce: 5,
                },
                savedAt: 1000,
            });
        }

        return null;
    },
};

const migrationResult = loadForgeStateV2Safe(oldSaveStorage);

console.log("Test migration sécurisée V1 vers V2 :", {
    migrationReussie: migrationResult.status === "loaded",

    versionCorrecte:
        migrationResult.status === "loaded" &&
        migrationResult.data.forge.version === 2,

    soldeConverti:
        migrationResult.status === "loaded" &&
        migrationResult.data.forge.echoesMilli === 125750,

    puissanceConservee:
        migrationResult.status === "loaded" &&
        migrationResult.data.forge.forgeForce === 5,

    dateProductionConservee:
        migrationResult.status === "loaded" &&
        migrationResult.data.forge.lastProductionAt === 1000,

    producteursInitialises:
        migrationResult.status === "loaded" &&
        migrationResult.data.forge.producers.awakenedEmber === 0,
});

console.log("Test protection sauvegarde V2 :", {
    sauvegardeValideAutorisee: canAutoSaveForgeV2("loaded") === true,

    nouvellePartieAutorisee: canAutoSaveForgeV2("missing") === true,

    sauvegardeCorrompueProtegee: canAutoSaveForgeV2("error") === false,
});
