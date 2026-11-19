import { useEffect, useRef } from "react";
import type { ForgeVisualEvents } from "../visualEvents";
import { usePersistentSettings } from "../settings/usePersistentSettings";
import { DEFAULT_AUDIO_SETTINGS, type AudioSettings } from "./audioRules";
import { ForgeAudio } from "./ForgeAudio";

function loadAudioSettings(saved: unknown): AudioSettings {
    const settings = { ...DEFAULT_AUDIO_SETTINGS };
    if (typeof saved !== "object" || saved === null) return settings;
    const value = saved as Record<string, unknown>;
    for (const key of ["master", "music", "ambience", "effects"] as const) {
        const volume = value[key];
        if (typeof volume === "number" && volume >= 0 && volume <= 1) {
            settings[key] = volume;
        }
    }
    if (typeof value.muted === "boolean") settings.muted = value.muted;
    return settings;
}

/** Les réglages du son, retenus d'une visite à l'autre. */
export function useAudioSettings() {
    return usePersistentSettings("relic-forge-audio", loadAudioSettings);
}

/** Branche le son de la Forge sur les événements visuels. */
export function useForgeAudio(
    visualEvents: ForgeVisualEvents,
    settings: AudioSettings,
    reduceMotion: boolean,
) {
    const audioRef = useRef<ForgeAudio | null>(null);
    const settingsRef = useRef(settings);
    const reduceMotionRef = useRef(reduceMotion);

    useEffect(() => {
        settingsRef.current = settings;
        audioRef.current?.setSettings(settings);
    }, [settings]);

    useEffect(() => {
        reduceMotionRef.current = reduceMotion;
    }, [reduceMotion]);

    useEffect(() => {
        const audio = new ForgeAudio(
            visualEvents,
            settingsRef.current,
            () => reduceMotionRef.current,
        );
        audioRef.current = audio;
        return () => {
            audio.destroy();
            audioRef.current = null;
        };
    }, [visualEvents]);
}
