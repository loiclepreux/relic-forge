import { calculateElapsedProductionWithRemainder } from "./forgeEconomy";

// Simulation d'une durée négative.
const result = calculateElapsedProductionWithRemainder(1, -5000, 0);

console.log("Test durée négative V2 :", {
    gainMilli: result.gainMilli,
    reserveMilli: result.remainderMilli,
    gainAttendu: 0,
    testReussi: result.gainMilli === 0 && result.remainderMilli === 0,
});
