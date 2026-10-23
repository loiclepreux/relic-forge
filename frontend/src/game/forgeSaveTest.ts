import { saveForgeStateV2 } from "./forgeSave";
import type { ForgeStateV2 } from "./forgeState";

// État fictif d'une forge V2.
const fakeForge: ForgeStateV2 = {
    version: 2,
    echoesMilli: 125750,
    forgeForce: 5,
    producers: {
        awakenedEmber: 2,
    },
    lastProductionAt: 1000,
    productionRemainderMilli: 0,
};

// Variable pour récupérer la sauvegarde enregistrée.
let savedKey = "";
let savedValue = "";

// Stockage fictif.
const fakeStorage = {
    setItem(key: string, value: string): void {
        savedKey = key;
        savedValue = value;
    },
};

// Exécuter la sauvegarde avec le stockage fictif.
saveForgeStateV2(fakeForge, fakeStorage);

// Examiner les données enregistrées.
const parsedSave = JSON.parse(savedValue);

console.log("Test enregistrement V2 :", {
    bonneCle: savedKey === "relic-forge-save-v2",

    soldeConserve: parsedSave.forge.echoesMilli === 125750,

    puissanceConservee: parsedSave.forge.forgeForce === 5,

    producteursConserves: parsedSave.forge.producers.awakenedEmber === 2,

    dateEnregistree: Number.isSafeInteger(parsedSave.savedAt),
});

// Simulation d'un stockage qui refuse les écritures.
const failingStorage = {
    setItem(): void {
        throw new Error("Stockage indisponible");
    },
};

let errorHandled = true;

try {
    saveForgeStateV2(fakeForge, failingStorage);
} catch {
    errorHandled = false;
}

console.log("Test erreur enregistrement V2 :", {
    erreurInterceptee: errorHandled,
});
