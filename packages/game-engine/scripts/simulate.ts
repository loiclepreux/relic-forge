// Lance le simulateur d'équilibrage : pnpm simulate
// Les résultats s'affichent dans le terminal.

import {
    DEFAULT_PROFILES,
    FORCE_MILESTONES,
    simulate,
    simulateDailyLife,
    type SimulationResult,
} from "../src/forgeSimulator";

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

function formatDay(day: number | null): string {
    return day === null ? "—" : `jour ${day}`;
}

// ---------------------------------------------------------------
// Scénario 1 : les premières minutes (critère P01, Bible 12.9).
// ---------------------------------------------------------------

console.log("\n=== Scénario 1 : première session (1 h de jeu continu) ===\n");

const firstSession: SimulationResult[] = DEFAULT_PROFILES.map((profile) =>
    simulate(profile, { durationSeconds: 3600, critical: true, seed: SEED }),
);

console.table(
    firstSession.map((r) => ({
        Profil: r.profile,
        "1er achat": formatDuration(r.firstPurchaseAt),
        "1re Braise": formatDuration(r.firstEmberAt),
        "Éveillée (F11)": formatDuration(r.forceReachedAt[11]),
        "Force après 1 h": r.finalForce,
        "% critiques": `${((r.criticalStrikes / Math.max(1, r.strikesCounted)) * 100).toFixed(1)} %`,
    })),
);

console.log("Critère P01 : premier achat en moins de 3 minutes");
for (const r of firstSession) {
    const ok = r.firstPurchaseAt !== null && r.firstPurchaseAt <= 180;
    console.log(
        `  ${ok ? "✅" : "❌"} ${r.profile} : ${formatDuration(r.firstPurchaseAt)}`,
    );
}

// ---------------------------------------------------------------
// Scénario 2 : une vraie vie de joueur sur 160 jours.
// 2 sessions de 30 minutes par jour (9 h et 20 h), jeu fermé entre.
// ---------------------------------------------------------------

const DAYS = 160;
console.log(
    `\n=== Scénario 2 : ${DAYS} jours, 2 sessions de 30 min par jour ===\n`,
);

const dailyLife = DEFAULT_PROFILES.map((profile) =>
    simulateDailyLife(profile, {
        days: DAYS,
        sessionStartHours: [9, 20],
        sessionMinutes: 30,
        critical: true,
        seed: SEED,
    }),
);

console.table(
    dailyLife.map((r) => {
        const row: Record<string, string | number> = { Profil: r.profile };
        for (const force of FORCE_MILESTONES.slice(1)) {
            row[`Force ${force}`] =
                `${formatDuration(r.forceReachedAt[force])} (${formatDay(r.forceReachedOnDay[force])})`;
        }
        row["Braises"] = r.finalEmbers;
        return row;
    }),
);

console.log(
    "Objectifs (joueur régulier) : Éveillée (F11) 15–20 min · Ancestrale (F26) 3–5 h · Transcendante (F41) 15–20 h · Force 50 vers la fin du Cycle I",
);
