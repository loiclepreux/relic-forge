import { createInitialForgeStateV2 } from "./forgeState";

import {
    strikeForgeWithProductionV2,
    type StrikeWindow,
} from "./forgeActionsV2";

// Création d'un joueur fictif.
const forge = createInitialForgeStateV2(1000);

// Le joueur possède une Braise éveillée.
forge.producers.awakenedEmber = 1;

// Le joueur a déjà effectué 5 frappes.
const strikeWindow: StrikeWindow = {
    startedAt: 10500,
    count: 5,
};

// Il tente une sixième frappe à 11 secondes.
const result = strikeForgeWithProductionV2(forge, strikeWindow, 11000);

console.log("Test limite frappe avec production V2 :", {
    echosAvant: forge.echoesMilli,
    echosApres: result.forge.echoesMilli,
    gainFrappe: result.gainMilli,
    frappesComptees: result.strikeWindow.count,
    dernierCalcul: result.forge.lastProductionAt,
});
