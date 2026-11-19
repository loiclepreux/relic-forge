import { useEffect, useId } from "react";
import type { AudioSettings } from "../audio/audioRules";
import {
    QUALITY_LABELS,
    type DisplaySettings,
    type GraphicsQuality,
} from "./displaySettings";

type Props = {
    display: DisplaySettings;
    onDisplayChange: (display: DisplaySettings) => void;
    audio: AudioSettings;
    onAudioChange: (audio: AudioSettings) => void;
    onClose: () => void;
};

const VOLUMES = [
    { key: "master", label: "Volume général" },
    { key: "music", label: "Musique" },
    { key: "ambience", label: "Ambiance" },
    { key: "effects", label: "Effets" },
] as const;

/** Réglages graphiques, de confort et de son (Bible 24.15 et 24.16). */
export function SettingsPanel({
    display,
    onDisplayChange,
    audio,
    onAudioChange,
    onClose,
}: Props) {
    const titleId = useId();

    // Échap ferme les réglages.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const setDisplay = <K extends keyof DisplaySettings>(
        key: K,
        value: DisplaySettings[K],
    ) => onDisplayChange({ ...display, [key]: value });

    return (
        <div className="settings-backdrop" onClick={onClose}>
            <section
                className="settings-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(event) => event.stopPropagation()}
            >
                <header className="settings-header">
                    <h2 id={titleId}>Réglages</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fermer les réglages"
                        autoFocus
                    >
                        ✕
                    </button>
                </header>

                <fieldset>
                    <legend>Graphismes</legend>
                    <div className="settings-choices" role="radiogroup">
                        {(Object.keys(QUALITY_LABELS) as GraphicsQuality[]).map(
                            (quality) => (
                                <label key={quality}>
                                    <input
                                        type="radio"
                                        name="quality"
                                        checked={display.quality === quality}
                                        onChange={() =>
                                            setDisplay("quality", quality)
                                        }
                                    />
                                    {QUALITY_LABELS[quality]}
                                </label>
                            ),
                        )}
                    </div>
                    <p className="settings-hint">
                        Moins d'étincelles, de poussière et de braises si le
                        jeu ralentit.
                    </p>
                </fieldset>

                <fieldset>
                    <legend>Confort</legend>
                    <label>
                        <input
                            type="checkbox"
                            checked={display.reduceMotion}
                            onChange={(e) =>
                                setDisplay("reduceMotion", e.target.checked)
                            }
                        />
                        Animations réduites (le marteau reste immobile)
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={display.flashes}
                            onChange={(e) =>
                                setDisplay("flashes", e.target.checked)
                            }
                        />
                        Éclats de lumière
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={display.shake}
                            onChange={(e) =>
                                setDisplay("shake", e.target.checked)
                            }
                        />
                        Secousse à chaque frappe
                    </label>
                </fieldset>

                <fieldset>
                    <legend>Son</legend>
                    <label>
                        <input
                            type="checkbox"
                            checked={audio.muted}
                            onChange={(e) =>
                                onAudioChange({
                                    ...audio,
                                    muted: e.target.checked,
                                })
                            }
                        />
                        Couper le son
                    </label>
                    {VOLUMES.map(({ key, label }) => (
                        <label key={key} className="settings-volume">
                            <span>{label}</span>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={Math.round(audio[key] * 100)}
                                disabled={audio.muted}
                                onChange={(e) =>
                                    onAudioChange({
                                        ...audio,
                                        [key]: Number(e.target.value) / 100,
                                    })
                                }
                            />
                            <span className="settings-volume-value">
                                {Math.round(audio[key] * 100)} %
                            </span>
                        </label>
                    ))}
                </fieldset>

                <p className="settings-hint">
                    Astuce : la touche Espace frappe l'enclume.
                </p>
            </section>
        </div>
    );
}
