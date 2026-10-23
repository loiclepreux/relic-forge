import { createInitialForgeStateV2 } from "./forgeState";
import { accrueProductionV2 } from "./forgeActionsV2";

// Création d'un joueur fictif.
const forge = createInitialForgeStateV2(1000);

// Le joueur possède une Braise éveillée.
forge.producers.awakenedEmber = 1;

// Premier calcul après 250 millisecondes.
const firstCalculation = accrueProductionV2(forge, 1250);

// Deuxième calcul après 250 millisecondes supplémentaires.
const secondCalculation = accrueProductionV2(firstCalculation, 1500);

console.log("Test production fractionnaire V2 :", {
    echosAvant: forge.echoesMilli,
    echosPremierCalcul: firstCalculation.echoesMilli,
    echosDeuxiemeCalcul: secondCalculation.echoesMilli,
    dernierCalcul: secondCalculation.lastProductionAt,
});
