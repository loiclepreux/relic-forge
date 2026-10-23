import { createInitialForgeStateV2 } from "./forgeState";
import { accrueProductionV2 } from "./forgeActionsV2";

const forge = createInitialForgeStateV2(1000);

// Placer le solde près de la limite des entiers sûrs.
forge.echoesMilli = Number.MAX_SAFE_INTEGER - 500;

// Activer un producteur générant 1 Écho par seconde.
forge.producers.awakenedEmber = 1;

// Simuler une seconde de production passive.
const result = accrueProductionV2(forge, 2000);

console.log("Test limite production passive V2 :", {
    soldeInitial: forge.echoesMilli,
    soldeFinal: result.echoesMilli,
    soldeValide: Number.isSafeInteger(result.echoesMilli),
    tempsInitial: forge.lastProductionAt,
    tempsFinal: result.lastProductionAt,
});