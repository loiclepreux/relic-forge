import { createInitialForgeStateV2 } from "./forgeState";
import { accrueProductionV2 } from "./forgeActionsV2";

const forge = createInitialForgeStateV2(1000);

forge.producers.awakenedEmber = 2;

const updatedForge = accrueProductionV2(forge, 61000);

console.log("Test production passive V2 :", {
    productionInitiale: forge.echoesMilli,
    productionFinale: updatedForge.echoesMilli,
    dernierCalcul: updatedForge.lastProductionAt,
});
