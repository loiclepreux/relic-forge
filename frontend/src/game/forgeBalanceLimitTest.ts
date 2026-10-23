import { createInitialForgeStateV2 } from "./forgeState";
import { strikeForgeV2 } from "./forgeActionsV2";

// Création d'un joueur fictif.
const forge = createInitialForgeStateV2(1000);

// Solde proche de la limite des entiers sûrs.
forge.echoesMilli = Number.MAX_SAFE_INTEGER - 500;

// Fenêtre de frappe fictive.
const strikeWindow = {
    startedAt: 1000,
    count: 0,
};

// Simulation d'une frappe.
const result = strikeForgeV2(forge, strikeWindow, 1000);

console.log("Test limite du solde V2 :", {
    soldeInitial: forge.echoesMilli,
    gainFrappe: result.gainMilli,
    soldeFinal: result.forge.echoesMilli,
    soldeValide: Number.isSafeInteger(result.forge.echoesMilli),
});
