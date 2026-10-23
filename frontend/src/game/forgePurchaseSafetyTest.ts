import { createInitialForgeStateV2 } from "./forgeState";
import { upgradeForgeV2, buyAwakenedEmberV2 } from "./forgeActionsV2";

// Test 1 : achat avec un solde invalide.
const forgeInvalidBalance = createInitialForgeStateV2(1000);
forgeInvalidBalance.echoesMilli = Number.NaN;

const upgradeResult = upgradeForgeV2(forgeInvalidBalance);

console.log("Test achat forge V2 :", {
    achatRefuse: upgradeResult === forgeInvalidBalance,
    niveauFinal: upgradeResult.forgeForce,
});

// Test 2 : achat avec un nombre de producteurs invalide.
const forgeInvalidProducer = createInitialForgeStateV2(1000);
forgeInvalidProducer.echoesMilli = 100000;
forgeInvalidProducer.producers.awakenedEmber = -1;

const producerResult = buyAwakenedEmberV2(forgeInvalidProducer);

console.log("Test achat producteur V2 :", {
    achatRefuse: producerResult === forgeInvalidProducer,
    producteursFinaux: producerResult.producers.awakenedEmber,
});
