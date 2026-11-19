import { useEffect, useState } from "react";

/**
 * Des réglages retenus dans ce navigateur. Ce sont des préférences
 * d'affichage et de son : elles n'ont aucun effet sur la partie.
 */
export function usePersistentSettings<T>(
    storageKey: string,
    load: (saved: unknown) => T,
) {
    const [settings, setSettings] = useState<T>(() => {
        try {
            return load(JSON.parse(localStorage.getItem(storageKey) ?? "null"));
        } catch {
            return load(null);
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(settings));
        } catch {
            // Stockage indisponible (navigation privée…) : réglages non retenus.
        }
    }, [storageKey, settings]);

    return [settings, setSettings] as const;
}
