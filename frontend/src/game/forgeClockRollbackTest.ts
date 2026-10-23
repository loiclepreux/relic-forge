import { createInitialForgeStateV2 } from "./forgeState";
import { accrueProductionV2 } from "./forgeActionsV2";

// Création d'un joueur fictif.
const forge = createInitialForgeStateV2(11000);

// Le joueur possède une Braise éveillée.
forge.producers.awakenedEmber = 1;

// Simulation d'une horloge revenue 5 secondes en arrière.
const updatedForge = accrueProductionV2(forge, 6000);

console.log("Test retour horloge V2 :", {
    echosAvant: forge.echoesMilli,
    echosApres: updatedForge.echoesMilli,
    dernierCalculAvant: forge.lastProductionAt,
    dernierCalculApres: updatedForge.lastProductionAt,
});
