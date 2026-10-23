import { loadForgeStateV2 } from "./forgeSave";

// Une sauvegarde V2 fictive.
const fakeSaveV2 = {
    forge: {
        version: 2,
        echoesMilli: 125750,
        forgeForce: 5,
        producers: {
            awakenedEmber: 2,
        },
        lastProductionAt: 1000,
        productionRemainderMilli: 0,
    },
    savedAt: 2000,
};

// Un stockage fictif, indépendant de localStorage.
const fakeStorage = {
    getItem(key: string): string | null {
        if (key === "relic-forge-save-v2") {
            return JSON.stringify(fakeSaveV2);
        }

        return null;
    },
};

// Charger notre sauvegarde fictive.
const loadedSave = loadForgeStateV2(fakeStorage);

console.log("Test chargement V2 :", {
    sauvegardeChargee: loadedSave !== null,
    soldeConserve: loadedSave?.forge.echoesMilli === 125750,
    puissanceConservee: loadedSave?.forge.forgeForce === 5,
    producteursConserves: loadedSave?.forge.producers.awakenedEmber === 2,
    dateConservee: loadedSave?.savedAt === 2000,
});

// Simulation d'une ancienne sauvegarde V1.
const fakeSaveV1 = {
    forge: {
        echoes: 250.5,
        forgeForce: 7,
    },
    savedAt: 3000,
};

// Stockage fictif contenant uniquement la V1.
const fakeStorageV1 = {
    getItem(key: string): string | null {
        if (key === "relic-forge-save") {
            return JSON.stringify(fakeSaveV1);
        }

        return null;
    },
};

// Charger et migrer la sauvegarde V1 en mémoire.
const loadedFromV1 = loadForgeStateV2(fakeStorageV1);

console.log("Test chargement depuis V1 :", {
    migrationReussie: loadedFromV1 !== null,
    soldeConverti: loadedFromV1?.forge.echoesMilli === 250500,
    puissanceConservee: loadedFromV1?.forge.forgeForce === 7,
    producteursInitialises: loadedFromV1?.forge.producers.awakenedEmber === 0,
    dateConservee: loadedFromV1?.savedAt === 3000,
    derniereProductionConservee: loadedFromV1?.forge.lastProductionAt === 3000,
});

// Simulation d'une sauvegarde V2 corrompue.
const fakeCorruptedStorage = {
    getItem(key: string): string | null {
        if (key === "relic-forge-save-v2") {
            return JSON.stringify({
                forge: {
                    version: 2,
                    echoesMilli: -500,
                },
                savedAt: 4000,
            });
        }

        // Une ancienne sauvegarde V1 valide existe aussi.
        if (key === "relic-forge-save") {
            return JSON.stringify(fakeSaveV1);
        }

        return null;
    },
};

// Essayer de charger la sauvegarde corrompue.
const loadedCorrupted = loadForgeStateV2(fakeCorruptedStorage);

console.log("Test sauvegarde V2 corrompue :", {
    chargementRefuse: loadedCorrupted === null,
});

// Simulation d'un nouveau joueur sans sauvegarde.
const emptyStorage = {
    getItem(): string | null {
        return null;
    },
};

// Essayer de charger une sauvegarde inexistante.
const loadedEmpty = loadForgeStateV2(emptyStorage);

console.log("Test aucune sauvegarde :", {
    aucuneSauvegardeDetectee: loadedEmpty === null,
});

// Simulation d'une sauvegarde V2 contenant du JSON invalide.
const malformedStorage = {
    getItem(key: string): string | null {
        if (key === "relic-forge-save-v2") {
            return '{"forge":';
        }

        return null;
    },
};

// Essayer de charger le JSON malformé.
const loadedMalformed = loadForgeStateV2(malformedStorage);

console.log("Test JSON V2 malformé :", {
    chargementRefuse: loadedMalformed === null,
});
