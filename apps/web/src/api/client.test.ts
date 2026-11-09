import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, newRequestId } from "./client";

function mockFetch(status: number, body: unknown) {
    const fn = vi.fn(
        async () => new Response(JSON.stringify(body), { status }),
    );
    vi.stubGlobal("fetch", fn);
    return fn;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("appels au serveur", () => {
    it("envoie le JSON et renvoie la réponse", async () => {
        const fetchMock = mockFetch(200, { ok: true });
        const data = await apiFetch<{ ok: boolean }>("/forge/upgrades", {
            method: "POST",
            body: { upgradeKey: "STRIKE_POWER" },
        });

        expect(data).toEqual({ ok: true });
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/forge/upgrades",
            expect.objectContaining({
                method: "POST",
                credentials: "same-origin",
                body: JSON.stringify({ upgradeKey: "STRIKE_POWER" }),
            }),
        );
    });

    it("transforme une erreur du serveur en ApiError lisible", async () => {
        mockFetch(401, { message: "Connexion requise.", statusCode: 401 });
        await expect(apiFetch("/auth/me")).rejects.toMatchObject({
            status: 401,
            message: "Connexion requise.",
        });
    });

    it("signale un serveur injoignable", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new TypeError("Failed to fetch");
            }),
        );
        const error = await apiFetch("/forge").catch((e: unknown) => e);
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(0);
    });

    it("crée des identifiants de demande uniques et valides", () => {
        const a = newRequestId();
        expect(a).not.toBe(newRequestId());
        expect(a).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    });
});
