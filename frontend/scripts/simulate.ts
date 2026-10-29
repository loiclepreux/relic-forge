// Lance le simulateur d'équilibrage : pnpm simulate
// Les résultats s'affichent dans le terminal.

import {
    DEFAULT_PROFILES,
    FORCE_MILESTONES,
    simulate,
} from "../src/game/forgeSimulator";

const DURATION_SECONDS = 4 * 60 * 60; // 4 heures de jeu actif
const SEED = 42;

/** 75 → "1 min 15 s", 4000 → "1 h 06 min", null → "—". */
function formatDuration(seconds: number | null): string {
    if (seconds === null) return "—";
    if (seconds < 60) return `${seconds} s`;
    if (seconds < 3600) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return sec === 0 ? `${min} min` : `${min} min ${sec} s`;
    }
    const h = Math.floor(seconds / 3600);
    const min = Math.floor((seconds % 3600) / 60);
    return `${h} h ${String(min).padStart(2, "0")} min`;
}

const rows = [];
const results = [];

for (const profile of DEFAULT_PROFILES) {
    for (const critical of [false, true]) {
        const r = simulate(profile, {
            durationSeconds: DURATION_SECONDS,
            critical,
            seed: SEED,
        });
        results.push(r);

        const row: Record<string, string | number> = {
            Profil: r.profile,
            Critique: critical ? "oui" : "non",
            "1er achat": formatDuration(r.firstPurchaseAt),
            "1re Braise": formatDuration(r.firstEmberAt),
        };
        for (const force of FORCE_MILESTONES) {
            row[`Force ${force}`] = formatDuration(r.forceReachedAt[force]);
        }
        row["Force à 4 h"] = r.finalForce;
        row["Braises à 4 h"] = r.finalEmbers;
        row["% critiques"] =
            r.strikesCounted === 0
                ? "—"
                : `${((r.criticalStrikes / r.strikesCounted) * 100).toFixed(1)} %`;
        rows.push(row);
    }
}

console.log(
    `\nSimulateur RELIC FORGE — ${DURATION_SECONDS / 3600} h de jeu actif, graine ${SEED}\n`,
);
console.table(rows);

// Critère P01 (Bible 12.9) : premier achat en moins de 3 minutes.
console.log("\nCritère P01 : premier achat en moins de 3 minutes");
for (const r of results) {
    const ok = r.firstPurchaseAt !== null && r.firstPurchaseAt <= 180;
    console.log(
        `  ${ok ? "✅" : "❌"} ${r.profile} (critique ${r.critical ? "oui" : "non"}) : ${formatDuration(r.firstPurchaseAt)}`,
    );
}
