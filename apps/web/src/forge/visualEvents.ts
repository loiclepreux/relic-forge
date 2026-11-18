import type { ForgeView, UpgradeKey } from "../api/forgeApi";

// ---------------------------------------------------------------
// Événements visuels de la Forge (Bible 24.14).
// Ils déclenchent des animations et des sons, rien d'autre :
// un événement ne crédite jamais d'Échos et peut être rejoué
// sans changer la progression du joueur.
// ---------------------------------------------------------------

export type ForgeVisualEvent =
    | { type: "STRIKE"; stage: number }
    | { type: "CRITICAL"; count: number; stage: number }
    | { type: "UPGRADE_PURCHASED"; upgradeKey: UpgradeKey; stage: number }
    | { type: "STAGE_CHANGED"; stage: number; previousStage: number };

export type ForgeVisualListener = (event: ForgeVisualEvent) => void;

export type ForgeVisualEvents = {
    /** S'abonner ; renvoie la fonction qui désabonne. */
    subscribe: (listener: ForgeVisualListener) => () => void;
};

export type ForgeVisualEventBus = ForgeVisualEvents & {
    emit: (event: ForgeVisualEvent) => void;
};

export function createVisualEventBus(): ForgeVisualEventBus {
    const listeners = new Set<ForgeVisualListener>();

    return {
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        emit(event) {
            for (const listener of [...listeners]) {
                // Une animation en panne ne doit jamais bloquer le jeu.
                try {
                    listener(event);
                } catch (error) {
                    console.error("Effet visuel en erreur :", error);
                }
            }
        },
    };
}

/** Changement de stade entre deux réponses du serveur (aucun au premier chargement). */
export function detectStageChange(
    before: ForgeView | null,
    after: ForgeView,
): ForgeVisualEvent | null {
    if (!before || before.stage === after.stage) return null;
    return {
        type: "STAGE_CHANGED",
        stage: after.stage,
        previousStage: before.stage,
    };
}
