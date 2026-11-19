import { useEffect, useRef, useState } from "react";
import type { ForgeVisualEvents } from "../visualEvents";
import { DEFAULT_AUDIO_SETTINGS, type AudioSettings } from "./audioRules";
import { ForgeAudio } from "./ForgeAudio";

/** Préférence de ce navigateur (le son n'a aucun effet sur la partie). */
const STORAGE_KEY = "relic-forge-audio";

function loadSettings(): AudioSettings {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
        const settings = { ...DEFAULT_AUDIO_SETTINGS };
        for (const key of ["master", "music", "ambience", "effects"] as const) {
            if (typeof saved[key] === "number") settings[key] = saved[key];
        }
        if (typeof saved.muted === "boolean") settings.muted = saved.muted;
        return settings;
    } catch {
        return { ...DEFAULT_AUDIO_SETTINGS };
    }
}

/** Les réglages du son, retenus d'une visite à l'autre. */
export function useAudioSettings() {
    const [settings, setSettings] = useState<AudioSettings>(loadSettings);
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {
            // Stockage indisponible (navigation privée…) : réglages non retenus.
        }
    }, [settings]);
    return [settings, setSettings] as const;
}

/** Branche le son de la Forge sur les événements visuels. */
export function useForgeAudio(
    visualEvents: ForgeVisualEvents,
    settings: AudioSettings,
) {
    const audioRef = useRef<ForgeAudio | null>(null);
    const settingsRef = useRef(settings);

    useEffect(() => {
        settingsRef.current = settings;
        audioRef.current?.setSettings(settings);
    }, [settings]);

    useEffect(() => {
        const audio = new ForgeAudio(visualEvents, settingsRef.current);
        audioRef.current = audio;
        return () => {
            audio.destroy();
            audioRef.current = null;
        };
    }, [visualEvents]);
}
