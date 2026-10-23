import { calculateElapsedProductionMilli } from "./forgeEconomy";

// Production fictive de 0,1 Écho par seconde.
const productionPerSecond = 0.1;

// Calcul effectué toutes les 7 millisecondes.
const intervalMilliseconds = 7;

// Simulation de 100 calculs successifs.
let accumulatedMilli = 0;

for (let i = 0; i < 100; i++) {
    accumulatedMilli += calculateElapsedProductionMilli(
        productionPerSecond,
        intervalMilliseconds,
    );
}

// Calcul de la même durée en une seule opération.
const totalMilliseconds = intervalMilliseconds * 100;

const expectedMilli = calculateElapsedProductionMilli(
    productionPerSecond,
    totalMilliseconds,
);

console.log("Test arrondis production V2 :", {
    dureeTotaleMs: totalMilliseconds,
    productionParSeconde: productionPerSecond,
    gainCalculsSuccessifs: accumulatedMilli,
    gainCalculUnique: expectedMilli,
    perteMilli: expectedMilli - accumulatedMilli,
});
