import { migrateForgeStateV1ToV2 } from "./forgeState";
import { isForgeStateV2 } from "./forgeSave";

// Simulation d'une ancienne sauvegarde V1.
const oldForge = {
    echoes: 125.75,
    forgeForce: 5,
};

const savedAt = 1000;

// Migration vers le moteur V2.
const migratedForge = migrateForgeStateV1ToV2(oldForge, savedAt);

console.log("Test migration V1 vers V2 :", {
    soldeConserve: migratedForge.echoesMilli === 125750,
    puissanceConservee: migratedForge.forgeForce === 5,
    producteursInitialises: migratedForge.producers.awakenedEmber === 0,
    dateConservee: migratedForge.lastProductionAt === 1000,
    resteInitialise: migratedForge.productionRemainderMilli === 0,
    etatValide: isForgeStateV2(migratedForge),
});

// Test d'une ancienne sauvegarde avec un solde trop élevé.
const oversizedForge = {
    echoes: 10_000_000_000_000,
    forgeForce: 5,
};

const oversizedMigration = migrateForgeStateV1ToV2(oversizedForge, savedAt);

console.log("Test migration V1 trop élevée :", {
    soldeConverti: oversizedMigration.echoesMilli,
    conversionRefusee: Number.isNaN(oversizedMigration.echoesMilli),
    etatValide: isForgeStateV2(oversizedMigration),
});
