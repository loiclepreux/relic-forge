import { saveForgeStateV2, loadForgeStateV2 } from "./forgeSave";

import type { ForgeStateV2 } from "./forgeState";

// Une partie fictive.
const fakeForge: ForgeStateV2 = {
    version: 2,
    echoesMilli: 875250,
    forgeForce: 12,
    producers: {
        awakenedEmber: 4,
    },
    lastProductionAt: 1000,
    productionRemainderMilli: 0.25,
};

// Stockage fictif partagé entre sauvegarde et chargement.
const fakeData = new Map<string, string>();

const fakeStorage = {
    setItem(key: string, value: string): void {
        fakeData.set(key, value);
    },

    getItem(key: string): string | null {
        return fakeData.get(key) ?? null;
    },
};

// Enregistrer la partie.
saveForgeStateV2(fakeForge, fakeStorage);

// Recharger cette même partie.
const loadedForge = loadForgeStateV2(fakeStorage);

// Vérifier les données récupérées.
console.log("Test cycle sauvegarde V2 :", {
    sauvegardeRetrouvee: loadedForge !== null,

    soldeConserve: loadedForge?.forge.echoesMilli === 875250,

    puissanceConservee: loadedForge?.forge.forgeForce === 12,

    producteursConserves: loadedForge?.forge.producers.awakenedEmber === 4,

    resteConserve: loadedForge?.forge.productionRemainderMilli === 0.25,

    dateProductionConservee: loadedForge?.forge.lastProductionAt === 1000,

    dateSauvegardeValide:
        loadedForge !== null && Number.isSafeInteger(loadedForge.savedAt),
});
