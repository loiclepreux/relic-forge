import { calculateElapsedProductionWithRemainder } from "./forgeEconomy";

// Production fictive de 0,1 Écho par seconde.
const productionPerSecond = 0.1;

// Simulation de 100 calculs de 7 millisecondes.
let accumulatedMilli = 0;
let remainderMilli = 0;

for (let i = 0; i < 100; i++) {
    const result = calculateElapsedProductionWithRemainder(
        productionPerSecond,
        7,
        remainderMilli,
    );

    accumulatedMilli += result.gainMilli;
    remainderMilli = result.remainderMilli;
}

console.log("Test précision arrondis V2 :", {
    dureeTotaleMs: 700,
    productionParSeconde: productionPerSecond,
    gainTotalMilli: accumulatedMilli,
    reserveMilli: remainderMilli,
    totalAvecReserve: accumulatedMilli + remainderMilli,
});
