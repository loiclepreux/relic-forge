import { createInitialForgeStateV2 } from "./forgeState";
import { isForgeStateV2 } from "./forgeSave";

// État V2 valide servant de référence.
const validForge = createInitialForgeStateV2(1000);

// Test 1 : état parfaitement valide.
console.log("Test sauvegarde V2 - état valide :", isForgeStateV2(validForge));

// Test 2 : solde négatif.
console.log(
    "Test sauvegarde V2 - solde négatif :",
    isForgeStateV2({
        ...validForge,
        echoesMilli: -1000,
    }),
);

// Test 3 : solde supérieur à la limite des entiers sûrs.
console.log(
    "Test sauvegarde V2 - solde trop grand :",
    isForgeStateV2({
        ...validForge,
        echoesMilli: Number.MAX_SAFE_INTEGER + 1,
    }),
);

// Test 4 : reste de production négatif.
console.log(
    "Test sauvegarde V2 - reste négatif :",
    isForgeStateV2({
        ...validForge,
        productionRemainderMilli: -0.5,
    }),
);

// Test 5 : reste de production égal à 1.
console.log(
    "Test sauvegarde V2 - reste égal à 1 :",
    isForgeStateV2({
        ...validForge,
        productionRemainderMilli: 1,
    }),
);

// Test 6 : date de production négative.
console.log(
    "Test sauvegarde V2 - date négative :",
    isForgeStateV2({
        ...validForge,
        lastProductionAt: -1000,
    }),
);
