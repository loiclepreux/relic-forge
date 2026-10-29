import { afterEach, describe, expect, it, vi } from "vitest";
import {
    canAutoSave,
    isForgeSave,
    loadForgeState,
    saveForgeState,
} from "./forgeSave";
import { createInitialForgeState } from "@relic-forge/game-engine";

// Les mêmes clés que dans forgeSave.ts : si ces tests cassent après
// une modification des clés, c'est que les anciennes sauvegardes seraient perdues.
const SAVE_KEY_V1 = "relic-forge-save";
const SAVE_KEY = "relic-forge-save-v2";

vi.spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
    vi.useRealTimers();
});

function storageWith(entries: Record<string, string>) {
    return { getItem: (key: string) => entries[key] ?? null };
}

const validSave = {
    forge: {
        version: 2 as const,
        echoesMilli: 125750,
        forgeForce: 5,
        producers: { awakenedEmber: 2 },
        lastProductionAt: 1000,
        productionRemainderMilli: 0,
    },
    savedAt: 2000,
};

const v1Save = { forge: { echoes: 250.5, forgeForce: 7 }, savedAt: 3000 };

describe("validation des sauvegardes", () => {
    it("accepte une sauvegarde valide, y compris à dates égales", () => {
        expect(isForgeSave(validSave)).toBe(true);
        expect(isForgeSave({ ...validSave, savedAt: 1000 })).toBe(true);
    });

    it.each([
        [
            "production après la sauvegarde",
            {
                ...validSave,
                forge: { ...validSave.forge, lastProductionAt: 3000 },
            },
        ],
        ["date décimale", { ...validSave, savedAt: 2000.5 }],
        [
            "date trop grande",
            { ...validSave, savedAt: Number.MAX_SAFE_INTEGER + 1 },
        ],
        [
            "solde négatif",
            { ...validSave, forge: { ...validSave.forge, echoesMilli: -1 } },
        ],
        [
            "reste ≥ 1",
            {
                ...validSave,
                forge: { ...validSave.forge, productionRemainderMilli: 1 },
            },
        ],
        [
            "Braises manquantes",
            { ...validSave, forge: { ...validSave.forge, producers: {} } },
        ],
    ])("refuse : %s", (_label, save) => {
        expect(isForgeSave(save)).toBe(false);
    });
});

describe("chargement", () => {
    it("charge une sauvegarde actuelle", () => {
        const r = loadForgeState(
            storageWith({ [SAVE_KEY]: JSON.stringify(validSave) }),
        );
        expect(r).toEqual({ status: "loaded", data: validSave });
    });

    it("migre une sauvegarde V1", () => {
        const r = loadForgeState(
            storageWith({ [SAVE_KEY_V1]: JSON.stringify(v1Save) }),
        );
        expect(r).toEqual({
            status: "loaded",
            data: {
                forge: {
                    version: 2,
                    echoesMilli: 250500,
                    forgeForce: 7,
                    producers: { awakenedEmber: 0 },
                    lastProductionAt: 3000,
                    productionRemainderMilli: 0,
                },
                savedAt: 3000,
            },
        });
    });

    it("ne migre pas la V1 si la sauvegarde actuelle est corrompue", () => {
        const r = loadForgeState(
            storageWith({
                [SAVE_KEY]: JSON.stringify({
                    forge: { version: 2, echoesMilli: -500 },
                    savedAt: 4000,
                }),
                [SAVE_KEY_V1]: JSON.stringify(v1Save),
            }),
        );
        expect(r.status).toBe("error");
    });

    it("signale l'absence de sauvegarde", () => {
        expect(loadForgeState(storageWith({}))).toEqual({ status: "missing" });
    });

    it("signale un JSON malformé comme une erreur", () => {
        expect(
            loadForgeState(storageWith({ [SAVE_KEY]: '{"forge":' })),
        ).toEqual({ status: "error" });
    });

    it("signale une erreur si le stockage est inaccessible", () => {
        const broken = {
            getItem: () => {
                throw new Error("bloqué");
            },
        };
        expect(loadForgeState(broken)).toEqual({ status: "error" });
    });

    it("n'autorise la sauvegarde auto que si rien n'est corrompu", () => {
        expect(canAutoSave("loaded")).toBe(true);
        expect(canAutoSave("missing")).toBe(true);
        expect(canAutoSave("error")).toBe(false);
    });
});

describe("sauvegarde", () => {
    it("écrit sous la clé actuelle et se relit à l'identique", () => {
        vi.useFakeTimers();
        vi.setSystemTime(2000);

        const store: Record<string, string> = {};
        const forge = createInitialForgeState(1000);
        const ok = saveForgeState(forge, {
            setItem: (key, value) => {
                store[key] = value;
            },
        });
        expect(ok).toBe(true);

        expect(Object.keys(store)).toEqual([SAVE_KEY]);
        expect(loadForgeState(storageWith(store))).toEqual({
            status: "loaded",
            data: { forge, savedAt: 2000 },
        });
    });

    it("refuse d'écrire un état invalide", () => {
        const setItem = vi.fn();
        const forge = { ...createInitialForgeState(1000), echoesMilli: NaN };
        expect(saveForgeState(forge, { setItem })).toBe(false);
        expect(setItem).not.toHaveBeenCalled();
    });

    it("signale l'échec sans planter si le stockage est plein", () => {
        const full = {
            setItem: () => {
                throw new Error("QuotaExceededError");
            },
        };
        expect(saveForgeState(createInitialForgeState(1000), full)).toBe(false);
    });
});
