// ---------------------------------------------------------------
// Démarrage et arrêt d'une scène dont la création est asynchrone.
// En développement, React (StrictMode) monte, démonte puis remonte
// les composants : la scène créée « en retard » par le premier
// montage doit être détruite aussitôt, pour qu'une seule reste active.
// ---------------------------------------------------------------

export type Destroyable = { destroy: () => void };

/** Lance la création ; renvoie la fonction d'arrêt (pour un useEffect). */
export function startScene<T extends Destroyable>(
    create: () => Promise<T>,
    onReady?: (scene: T) => void,
): () => void {
    let stopped = false;
    let scene: T | null = null;

    create()
        .then((created) => {
            if (stopped) {
                created.destroy();
                return;
            }
            scene = created;
            onReady?.(created);
        })
        .catch((error: unknown) => {
            // Sans scène, le jeu reste jouable : on le signale seulement.
            if (!stopped)
                console.error("Scène de la Forge indisponible :", error);
        });

    return () => {
        stopped = true;
        scene?.destroy();
        scene = null;
    };
}
