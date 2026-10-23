import { createInitialForgeStateV2 } from "./forgeState";
import { upgradeForgeWithProductionV2 } from "./forgeActionsV2";

// Création d'un joueur fictif.
const forge = createInitialForgeStateV2(1000);

// Le joueur possède 20 Échos et une Braise éveillée.
forge.echoesMilli = 20000;
forge.producers.awakenedEmber = 1;

// Après 10 secondes, il tente une amélioration.
const updatedForge = upgradeForgeWithProductionV2(forge, 11000);

console.log("Test amélioration avec production V2 :", {
    echosAvant: forge.echoesMilli,
    forceAvant: forge.forgeForce,
    echosApres: updatedForge.echoesMilli,
    forceApres: updatedForge.forgeForce,
    dernierCalcul: updatedForge.lastProductionAt,
});
