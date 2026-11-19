import { useEffect, useRef, type RefObject } from "react";
import type { ForgeVisualEvents } from "./visualEvents";
import type { DisplaySettings } from "./settings/displaySettings";
// Type seulement : PixiJS lui-même est chargé à part, en différé (voir plus bas).
import type { ForgeAnchor } from "./pixi/ForgeScene";
import { startScene } from "./pixi/sceneLifecycle";

type Props = {
    /** Les événements qui déclenchent les animations. */
    visualEvents: ForgeVisualEvents;
    /** La zone de frappe : l'enclume se dessine dessous. */
    anchorRef: RefObject<HTMLElement | null>;
    /** Le stade de la Forge (1 à 4), qui choisit l'ambiance. */
    stage: number;
    /** Qualité graphique et confort visuel. */
    display: DisplaySettings;
};

/**
 * Le support de la scène PixiJS, placé derrière le contenu du panneau
 * central. Il ne reçoit aucun clic : la frappe reste sur les boutons.
 */
export function ForgeCanvas({
    visualEvents,
    anchorRef,
    stage,
    display,
}: Props) {
    const hostRef = useRef<HTMLDivElement>(null);
    // La scène lit le stade et les réglages à chaque image : pas besoin de la recréer.
    const stageRef = useRef(stage);
    const displayRef = useRef(display);
    useEffect(() => {
        stageRef.current = stage;
        displayRef.current = display;
    }, [stage, display]);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        const getAnchor = (): ForgeAnchor | null => {
            const target = anchorRef.current;
            if (!target) return null;
            const hostBox = host.getBoundingClientRect();
            const box = target.getBoundingClientRect();
            return {
                x: box.left - hostBox.left + box.width / 2,
                y: box.top - hostBox.top + box.height / 2,
                size: Math.min(box.width, box.height),
                hovered:
                    target.matches(":hover") ||
                    target.matches(":focus-visible"),
            };
        };

        // PixiJS est téléchargé à part : l'écran s'affiche sans l'attendre,
        // l'enclume apparaît dès que la scène est prête.
        return startScene(async () => {
            const { ForgeScene } = await import("./pixi/ForgeScene");
            return ForgeScene.create(host, {
                visualEvents,
                getAnchor,
                getStage: () => stageRef.current,
                getDisplay: () => displayRef.current,
            });
        });
    }, [visualEvents, anchorRef]);

    return <div ref={hostRef} className="forge-canvas" aria-hidden="true" />;
}
