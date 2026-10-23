import { calculateElapsedProductionWithRemainder } from "./forgeEconomy";

const testValues = [NaN, Infinity, -Infinity];

for (const value of testValues) {
    const result = calculateElapsedProductionWithRemainder(value, 1000, 0);

    console.log("Test valeur invalide V2 :", {
        valeurTestee: String(value),
        gainMilli: result.gainMilli,
        reserveMilli: result.remainderMilli,
        gainValide: Number.isFinite(result.gainMilli),
        reserveValide: Number.isFinite(result.remainderMilli),
    });
}
