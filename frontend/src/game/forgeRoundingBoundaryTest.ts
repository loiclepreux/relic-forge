import { calculateElapsedProductionWithRemainder } from "./forgeEconomy";

// Un gain réellement inférieur à 1 milli-Écho.
const result = calculateElapsedProductionWithRemainder(0.9999999995, 1, 0);

console.log("Test limite arrondis V2 :", {
    gainMilli: result.gainMilli,
    reserveMilli: result.remainderMilli,
    total: result.gainMilli + result.remainderMilli,
});
