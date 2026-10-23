import { createInitialForgeStateV2 } from "./forgeState";
import { accrueProductionV2 } from "./forgeActionsV2";

// Création d'un joueur fictif.
const forge = createInitialForgeStateV2(1000);

// Le joueur possède une Braise éveillée.
forge.producers.awakenedEmber = 1;

// Premier calcul après 10 secondes.
const firstCalculation = accrueProductionV2(forge, 11000);

// Deuxième calcul au même instant.
const secondCalculation = accrueProductionV2(firstCalculation, 11000);

console.log("Test double production V2 :", {
    echosAvant: forge.echoesMilli,
    echosPremierCalcul: firstCalculation.echoesMilli,
    echosDeuxiemeCalcul: secondCalculation.echoesMilli,
    dernierCalcul: secondCalculation.lastProductionAt,
});
