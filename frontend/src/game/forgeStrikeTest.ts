import { createInitialForgeStateV2 } from "./forgeState";
import { strikeForgeV2, type StrikeWindow } from "./forgeActionsV2";

let forge = createInitialForgeStateV2(1000);

let strikeWindow: StrikeWindow = {
    startedAt: 1000,
    count: 0,
};

for (let i = 1; i <= 6; i++) {
    const result = strikeForgeV2(forge, strikeWindow, 1000);

    forge = result.forge;
    strikeWindow = result.strikeWindow;

    console.log(`Frappe ${i} : ${result.gainMilli} milli-Échos`);
}

console.log("Solde final :", forge.echoesMilli);
