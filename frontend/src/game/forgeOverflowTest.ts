import { calculateElapsedProductionWithRemainder } from "./forgeEconomy";

// Deux valeurs finies dont la multiplication dépasse
// les limites numériques de JavaScript.
const result = calculateElapsedProductionWithRemainder(1e308, 1000, 0);

console.log("Test dépassement numérique V2 :", {
    gainMilli: result.gainMilli,
    reserveMilli: result.remainderMilli,
    gainValide: Number.isFinite(result.gainMilli),
    reserveValide: Number.isFinite(result.remainderMilli),
});
