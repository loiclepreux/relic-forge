import { calculateElapsedProductionWithRemainder } from "./forgeEconomy";

// Production de 0,1 Écho par seconde.
const productionPerSecond = 0.1;

// Simulation d'une heure, par intervalles de 7 ms.
const totalDurationMs = 3_600_000;
const intervalMs = 7;

let accumulatedMilli = 0;
let remainderMilli = 0;
let elapsedMs = 0;

while (elapsedMs < totalDurationMs) {
    const duration = Math.min(intervalMs, totalDurationMs - elapsedMs);

    const result = calculateElapsedProductionWithRemainder(
        productionPerSecond,
        duration,
        remainderMilli,
    );

    accumulatedMilli += result.gainMilli;
    remainderMilli = result.remainderMilli;
    elapsedMs += duration;
}

const expectedMilli = productionPerSecond * totalDurationMs;

console.log("Test production longue V2 :", {
    dureeTotaleMs: elapsedMs,
    gainMilli: accumulatedMilli,
    reserveMilli: remainderMilli,
    totalAvecReserve: accumulatedMilli + remainderMilli,
    gainAttenduMilli: expectedMilli,
    differenceMilli: accumulatedMilli + remainderMilli - expectedMilli,
});
