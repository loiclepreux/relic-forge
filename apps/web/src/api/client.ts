// Petit module d'appel au serveur. Toutes les requêtes passent par ici.

/** Erreur renvoyée par le serveur (code HTTP + message lisible). */
export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

type RequestOptions = {
    method?: "GET" | "POST";
    body?: unknown;
};

/** Appelle le serveur et renvoie sa réponse JSON. */
export async function apiFetch<T>(
    path: string,
    { method = "GET", body }: RequestOptions = {},
): Promise<T> {
    let response: Response;

    try {
        response = await fetch(`/api${path}`, {
            method,
            // Envoie le cookie de session avec chaque requête.
            credentials: "same-origin",
            headers:
                body === undefined
                    ? undefined
                    : { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new ApiError(0, "Serveur injoignable. Vérifie ta connexion.");
    }

    const data: unknown = await response.json().catch(() => null);

    if (!response.ok) {
        const message =
            typeof data === "object" &&
            data !== null &&
            "message" in data &&
            typeof data.message === "string"
                ? data.message
                : "Erreur inattendue du serveur.";
        throw new ApiError(response.status, message);
    }

    return data as T;
}

/** Identifiant unique d'une demande (pour ne jamais la traiter deux fois). */
export function newRequestId(): string {
    return crypto.randomUUID();
}
