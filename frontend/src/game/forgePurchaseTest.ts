import { createInitialForgeStateV2 } from "./forgeState";
import { buyAwakenedEmberV2 } from "./forgeActionsV2";
import { calculateAwakenedEmberCostMilli } from "./forgeEconomy";

const forge = createInitialForgeStateV2(1000);

// Nous donnons 20 Échos au joueur fictif.
forge.echoesMilli = 20000;

// Prix de la première Braise.
const firstCost = calculateAwakenedEmberCostMilli(
    forge.producers.awakenedEmber,
);

// Achat de la première Braise.
const afterPurchase = buyAwakenedEmberV2(forge);

// Tentative d'un deuxième achat sans assez d'Échos.
const afterSecondPurchase = buyAwakenedEmberV2(afterPurchase);

console.log("Test achat Braise éveillée V2 :", {
    prixPremiereBraise: firstCost,
    echosAvant: forge.echoesMilli,
    echosApres: afterPurchase.echoesMilli,
    braisesApres: afterPurchase.producers.awakenedEmber,
    deuxiemeAchatRefuse: afterSecondPurchase === afterPurchase,
});
