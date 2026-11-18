import { useEffect, useRef } from "react";
import { ForgeScene } from "./pixi/ForgeScene";
import { startScene } from "./pixi/sceneLifecycle";

/**
 * Le support de la scène PixiJS, placé derrière le contenu du panneau
 * central. Il ne reçoit aucun clic : la frappe reste sur les boutons.
 */
export function ForgeCanvas() {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        return startScene(() => ForgeScene.create(host));
    }, []);

    return <div ref={hostRef} className="forge-canvas" aria-hidden="true" />;
}
