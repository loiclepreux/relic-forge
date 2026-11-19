import type { ForgeVisualEvent, ForgeVisualEvents } from "../visualEvents";
import { HAMMER_IMPACT_MS } from "../pixi/hammerAnimation";
import {
    MAX_STRIKE_VOICES,
    STRIKE_VARIANTS,
    channelVolume,
    pickVariant,
    strikeVariation,
    trimVoices,
    type AudioChannel,
    type AudioSettings,
} from "./audioRules";

/** Les sons, dans apps/web/public/audio/ (créés pour Relic Forge). */
const SOUNDS = [
    ...Array.from({ length: STRIKE_VARIANTS }, (_, i) => `strike-${i + 1}`),
    "critical",
    "upgrade",
    "ember",
    "stage",
    "forge-ambience",
    "music",
] as const;

/** Temps de réaction d'un volume qui change (secondes) : pas de saut brutal. */
const VOLUME_SMOOTHING = 0.08;
/** La musique et l'ambiance arrivent en fondu. */
const LOOP_FADE_IN_SECONDS = 3;

type Voice = { source: AudioBufferSourceNode; gain: GainNode };

/**
 * Le son de la Forge. Les navigateurs n'autorisent le son qu'après
 * une action du joueur : tout démarre au premier clic ou à la première
 * touche. Ne connaît rien de l'économie : il écoute les événements visuels.
 */
export class ForgeAudio {
    private context: AudioContext | null = null;
    private buses: Record<AudioChannel, GainNode> | null = null;
    private readonly buffers = new Map<string, AudioBuffer>();
    private strikeVoices: Voice[] = [];
    private lastStrike = -1;
    private settings: AudioSettings;
    private readonly unsubscribe: () => void;
    private readonly reducedMotion: boolean;
    private destroyed = false;

    constructor(visualEvents: ForgeVisualEvents, settings: AudioSettings) {
        this.settings = settings;
        this.reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        this.unsubscribe = visualEvents.subscribe(this.onVisualEvent);
        window.addEventListener("pointerdown", this.unlock);
        window.addEventListener("keydown", this.unlock);
        document.addEventListener("visibilitychange", this.onVisibilityChange);
    }

    setSettings(settings: AudioSettings) {
        this.settings = settings;
        this.applyVolumes();
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.unsubscribe();
        window.removeEventListener("pointerdown", this.unlock);
        window.removeEventListener("keydown", this.unlock);
        document.removeEventListener(
            "visibilitychange",
            this.onVisibilityChange,
        );
        void this.context?.close();
        this.context = null;
    }

    /** Premier geste du joueur : on crée le son et on charge les fichiers. */
    private unlock = () => {
        if (this.destroyed) return;
        if (this.context) {
            if (this.context.state === "suspended") void this.context.resume();
            return;
        }
        const context = new AudioContext();
        this.context = context;

        // Compresseur général : plusieurs sons ensemble ne saturent pas.
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -12;
        compressor.ratio.value = 4;
        compressor.connect(context.destination);
        const bus = () => {
            const gain = context.createGain();
            gain.gain.value = 0;
            gain.connect(compressor);
            return gain;
        };
        this.buses = { music: bus(), ambience: bus(), effects: bus() };
        this.applyVolumes();

        void this.loadAll(context).then(() => {
            if (this.destroyed) return;
            this.startLoop("forge-ambience", "ambience");
            this.startLoop("music", "music");
        });
    };

    private async loadAll(context: AudioContext) {
        const base = import.meta.env.BASE_URL;
        await Promise.all(
            SOUNDS.map(async (name) => {
                try {
                    const response = await fetch(`${base}audio/${name}.ogg`);
                    if (!response.ok) return;
                    const data = await response.arrayBuffer();
                    this.buffers.set(name, await context.decodeAudioData(data));
                } catch {
                    // Un son manquant ne bloque pas le jeu : il ne sera pas joué.
                }
            }),
        );
    }

    private onVisualEvent = (event: ForgeVisualEvent) => {
        switch (event.type) {
            case "STRIKE":
                this.playStrike();
                break;
            case "CRITICAL":
                this.play("critical");
                break;
            case "UPGRADE_PURCHASED":
                this.play(
                    event.upgradeKey === "AWAKENED_EMBER" ? "ember" : "upgrade",
                );
                break;
            case "STAGE_CHANGED":
                this.play("stage");
                break;
        }
    };

    /** Le coup sonne quand le marteau touche l'enclume. */
    private playStrike() {
        this.lastStrike = pickVariant(STRIKE_VARIANTS, this.lastStrike);
        const { rate, gain } = strikeVariation();
        const voice = this.play(`strike-${this.lastStrike + 1}`, {
            delay: this.reducedMotion ? 0 : HAMMER_IMPACT_MS / 1000,
            rate,
            gain,
        });
        if (!voice) return;

        const { keep, stop } = trimVoices(
            [...this.strikeVoices, voice],
            MAX_STRIKE_VOICES,
        );
        for (const old of stop) this.fadeOut(old);
        this.strikeVoices = keep;
        voice.source.addEventListener("ended", () => {
            this.strikeVoices = this.strikeVoices.filter((v) => v !== voice);
        });
    }

    private play(
        name: string,
        options: { delay?: number; rate?: number; gain?: number } = {},
    ): Voice | null {
        const context = this.context;
        const buffer = this.buffers.get(name);
        if (!context || !this.buses || !buffer || context.state !== "running") {
            return null;
        }
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = options.rate ?? 1;
        const gain = context.createGain();
        gain.gain.value = options.gain ?? 1;
        source.connect(gain).connect(this.buses.effects);
        source.start(context.currentTime + (options.delay ?? 0));
        return { source, gain };
    }

    private startLoop(name: string, channel: "music" | "ambience") {
        const context = this.context;
        const buffer = this.buffers.get(name);
        if (!context || !this.buses || !buffer) return;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(
            1,
            context.currentTime + LOOP_FADE_IN_SECONDS,
        );
        source.connect(gain).connect(this.buses[channel]);
        source.start();
    }

    /** Coupe une voix en douceur (un arrêt net ferait un clic). */
    private fadeOut(voice: Voice) {
        const context = this.context;
        if (!context) return;
        voice.gain.gain.setTargetAtTime(0, context.currentTime, 0.015);
        voice.source.stop(context.currentTime + 0.1);
    }

    private applyVolumes() {
        const context = this.context;
        if (!context || !this.buses) return;
        for (const channel of ["music", "ambience", "effects"] as const) {
            this.buses[channel].gain.setTargetAtTime(
                channelVolume(this.settings, channel),
                context.currentTime,
                VOLUME_SMOOTHING,
            );
        }
    }

    /** Onglet caché : la Forge se tait (et repart quand on revient). */
    private onVisibilityChange = () => {
        const context = this.context;
        if (!context) return;
        if (document.visibilityState === "hidden") void context.suspend();
        else void context.resume();
    };
}
