import {
    defaultDisplaySettings,
    sanitizeDisplaySettings,
} from "./displaySettings";
import { usePersistentSettings } from "./usePersistentSettings";

/** Qualité graphique et confort visuel, retenus d'une visite à l'autre. */
export function useDisplaySettings() {
    return usePersistentSettings("relic-forge-display", (saved) =>
        sanitizeDisplaySettings(
            saved,
            defaultDisplaySettings(
                window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            ),
        ),
    );
}
