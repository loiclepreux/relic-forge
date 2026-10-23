import { createInitialForgeStateV2 } from "./forgeState";
import { buyAwakenedEmberWithProductionV2 } from "./forgeActionsV2";

const forge = createInitialForgeStateV2(1000);

// Le joueur fictif possède 10 Échos et une Braise.
forge.echoesMilli = 10000;
forge.producers.awakenedEmber = 1;

// Dix secondes plus tard, il tente un achat.
const updatedForge = buyAwakenedEmberWithProductionV2(forge, 11000);

console.log("Test achat avec production V2 :", {
    echosAvant: forge.echoesMilli,
    braisesAvant: forge.producers.awakenedEmber,
    echosApres: updatedForge.echoesMilli,
    braisesApres: updatedForge.producers.awakenedEmber,
    dernierCalcul: updatedForge.lastProductionAt,
});
