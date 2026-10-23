import { isForgeSaveV2 } from "./forgeSave";

const validSave = {
    forge: {
        version: 2,
        echoesMilli: 125750,
        forgeForce: 5,
        producers: {
            awakenedEmber: 0,
        },
        lastProductionAt: 1000,
        productionRemainderMilli: 0,
    },
    savedAt: 2000,
};

// Test 1 : sauvegarde normale
console.log("Date normale acceptée :", isForgeSaveV2(validSave));

// Test 2 : dernière production après la sauvegarde
console.log(
    "Date future refusée :",
    !isForgeSaveV2({
        ...validSave,
        forge: {
            ...validSave.forge,
            lastProductionAt: 3000,
        },
    }),
);

// Test 3 : date décimale
console.log(
    "Date décimale refusée :",
    !isForgeSaveV2({
        ...validSave,
        savedAt: 2000.5,
    }),
);

// Test 4 : date dépassant la limite des entiers sûrs
console.log(
    "Date trop grande refusée :",
    !isForgeSaveV2({
        ...validSave,
        savedAt: Number.MAX_SAFE_INTEGER + 1,
    }),
);

// Test 5 : dates identiques
console.log(
    "Dates identiques acceptées :",
    isForgeSaveV2({
        ...validSave,
        savedAt: 1000,
    }),
);
