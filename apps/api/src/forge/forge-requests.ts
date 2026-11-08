import { BadRequestException } from "@nestjs/common";
import { MAX_STRIKES_PER_BATCH, type UpgradeKey } from "./forge-rules";

// Vérification des demandes du navigateur : rien n'est cru sur parole.

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

function asObject(body: unknown): Record<string, unknown> {
    if (typeof body !== "object" || body === null) {
        throw new BadRequestException("Données manquantes.");
    }
    return body as Record<string, unknown>;
}

/**
 * Identifiant unique de la demande, créé par le navigateur.
 * Si la même demande arrive deux fois, elle n'est appliquée qu'une fois.
 */
function readRequestId(data: Record<string, unknown>): string {
    const { requestId } = data;
    if (typeof requestId !== "string" || !REQUEST_ID_PATTERN.test(requestId)) {
        throw new BadRequestException("Identifiant de demande invalide.");
    }
    return requestId;
}

export function readStrikeBatch(body: unknown): {
    requestId: string;
    count: number;
} {
    const data = asObject(body);
    const { count } = data;
    if (
        typeof count !== "number" ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > MAX_STRIKES_PER_BATCH
    ) {
        throw new BadRequestException(
            `Le lot doit contenir entre 1 et ${MAX_STRIKES_PER_BATCH} frappes.`,
        );
    }
    return { requestId: readRequestId(data), count };
}

export function readPurchase(body: unknown): {
    requestId: string;
    upgradeKey: UpgradeKey;
} {
    const data = asObject(body);
    const { upgradeKey } = data;
    if (upgradeKey !== "STRIKE_POWER" && upgradeKey !== "AWAKENED_EMBER") {
        throw new BadRequestException("Amélioration inconnue.");
    }
    return { requestId: readRequestId(data), upgradeKey };
}
