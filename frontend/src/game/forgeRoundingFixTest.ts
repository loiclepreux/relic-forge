import { createInitialForgeStateV2 } from "./forgeState";
import { accrueProductionV2 } from "./forgeActionsV2";

// Création d'un joueur fictif.
let forge = createInitialForgeStateV2(1000);

// Production fictive de 0,1 Écho par seconde.
// Nous utiliserons directement une Braise avec une production
// de 1 Écho/s, puis des intervalles de 7 ms.
forge.producers.awakenedEmber = 1;

// Simulation de 100 calculs successifs de 7 ms.
for (let i = 1; i <= 100; i++) {
    forge = accrueProductionV2(forge, 1000 + i * 7);
}

console.log("Test correction arrondis V2 :", {
    dureeTotaleMs: 700,
    echosMilli: forge.echoesMilli,
    reserveMilli: forge.productionRemainderMilli,
    dernierCalcul: forge.lastProductionAt,
});
