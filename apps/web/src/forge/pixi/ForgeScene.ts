import { Application, Container, Graphics, type Ticker } from "pixi.js";
import type { ForgeVisualEvent, ForgeVisualEvents } from "../visualEvents";
import { AnvilActor } from "./AnvilActor";
import { HammerActor } from "./HammerActor";
import { HAMMER_IMPACT_MS } from "./hammerAnimation";
import { FORGE_LAYERS, type ForgeLayerName } from "./layers";
import { ReactionLayer } from "./ReactionLayer";
import { SparkLayer } from "./SparkLayer";
import { sparkBurst } from "./sparks";
import type { StrikeKind } from "./anvilAnimation";

/** Lueur des braises : beaucoup de cercles très légers, pour un dégradé sans marches. */
const GLOW_RING_COUNT = 24;
/** Rayon du plus grand cercle, en part de la hauteur de la scène. */
const GLOW_MAX_RADIUS = 0.45;
/** Opacité ajoutée par chaque cercle. */
const GLOW_RING_ALPHA = 0.014;
const GLOW_COLOR = 0xff8a2a;
/** Une respiration lente, pour ne pas fatiguer l'œil (Bible 24.16). */
const GLOW_BREATH_SECONDS = 4;

/** Au-delà, une image en retard ne fait pas « sauter » les étincelles. */
const MAX_FRAME_SECONDS = 0.05;

/** Zone de frappe, en pixels, par rapport au coin haut gauche de la scène. */
export type ForgeAnchor = {
    x: number;
    y: number;
    size: number;
    /** La souris ou le clavier est sur la zone de frappe. */
    hovered?: boolean;
};

/** Un impact prévu : le marteau n'a pas encore touché l'enclume. */
type PendingImpact = { at: number; kind: StrikeKind; stage: number };

export type ForgeSceneOptions = {
    /** Les événements visuels du jeu (frappes, critiques…). */
    visualEvents?: ForgeVisualEvents;
    /** Où se trouve la zone de frappe ; relu à chaque image. */
    getAnchor?: () => ForgeAnchor | null;
};

/**
 * La scène PixiJS de la Forge. Elle ne connaît rien de l'économie :
 * elle dessine seulement ce qu'on lui demande.
 */
export class ForgeScene {
    readonly layers: Record<ForgeLayerName, Container>;
    private readonly app: Application;
    private readonly glow: Graphics;
    private readonly anvil: AnvilActor;
    private readonly hammer: HammerActor;
    private pendingImpacts: PendingImpact[] = [];
    private readonly sparks: SparkLayer;
    private readonly reactions: ReactionLayer;
    private readonly getAnchor: () => ForgeAnchor | null;
    private readonly unsubscribe: () => void;
    private readonly reducedMotion: boolean;
    private elapsedSeconds = 0;
    private destroyed = false;

    private constructor(
        app: Application,
        layers: Record<ForgeLayerName, Container>,
        options: ForgeSceneOptions,
    ) {
        this.app = app;
        this.layers = layers;
        this.getAnchor = options.getAnchor ?? (() => null);
        this.reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        this.glow = new Graphics();
        this.layers.ambiance.addChild(this.glow);
        this.drawGlow();

        this.anvil = new AnvilActor();
        this.hammer = new HammerActor();
        this.layers.anvil.addChild(this.anvil.view, this.hammer.view);

        this.sparks = new SparkLayer(this.app.renderer);
        this.layers.effects.addChild(this.sparks.view);

        this.reactions = new ReactionLayer();
        this.layers.events.addChild(this.reactions.view);

        this.unsubscribe =
            options.visualEvents?.subscribe(this.onVisualEvent) ?? (() => {});

        this.app.ticker.add(this.update);
        this.app.renderer.on("resize", this.drawGlow);
    }

    /** Crée la scène et place son canvas dans `host` (il en prend la taille). */
    static async create(
        host: HTMLElement,
        options: ForgeSceneOptions = {},
    ): Promise<ForgeScene> {
        const app = new Application();
        await app.init({
            resizeTo: host,
            backgroundAlpha: 0,
            antialias: true,
            autoDensity: true,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
        });
        host.appendChild(app.canvas);

        const layers = {} as Record<ForgeLayerName, Container>;
        for (const name of FORGE_LAYERS) {
            const layer = new Container({ label: name });
            app.stage.addChild(layer);
            layers[name] = layer;
        }

        return new ForgeScene(app, layers, options);
    }

    /** Libère tout : canvas, textures, animations. Sans effet si déjà fait. */
    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.unsubscribe();
        this.app.ticker.remove(this.update);
        this.app.renderer.off("resize", this.drawGlow);
        this.app.destroy(
            { removeView: true },
            { children: true, texture: true, textureSource: true },
        );
    }

    private onVisualEvent = (event: ForgeVisualEvent) => {
        const now = performance.now();
        switch (event.type) {
            case "STRIKE":
                // Le marteau part tout de suite ; l'impact suit quand il touche.
                this.hammer.strike(now);
                this.pendingImpacts.push({
                    at: this.reducedMotion ? now : now + HAMMER_IMPACT_MS,
                    kind: "normal",
                    stage: event.stage,
                });
                break;
            case "CRITICAL":
                // Le critique est confirmé par le serveur après coup :
                // l'enclume s'embrase sans nouveau coup de marteau.
                this.impact({ at: now, kind: "critical", stage: event.stage });
                break;
            case "UPGRADE_PURCHASED":
                this.reactions.start(
                    event.upgradeKey === "AWAKENED_EMBER" ? "ember" : "upgrade",
                    now,
                );
                break;
            case "STAGE_CHANGED":
                this.reactions.start("stage", now);
                break;
        }
    };

    private impact(impact: PendingImpact) {
        this.anvil.strike(impact.kind, impact.at);
        this.sparks.emit(
            sparkBurst({
                kind: impact.kind,
                stage: impact.stage,
                // Animations réduites : moitié moins d'étincelles.
                density: this.reducedMotion ? 0.5 : 1,
            }),
        );
    }

    /** La lueur est redessinée seulement quand la scène change de taille. */
    private drawGlow = () => {
        const { height } = this.app.screen;
        this.glow.clear();
        for (let i = GLOW_RING_COUNT; i >= 1; i--) {
            const radius = (i / GLOW_RING_COUNT) * GLOW_MAX_RADIUS * height;
            this.glow
                .circle(0, 0, radius)
                .fill({ color: GLOW_COLOR, alpha: GLOW_RING_ALPHA });
        }
    };

    private update = (ticker: Ticker) => {
        this.elapsedSeconds += ticker.deltaMS / 1000;

        // La lueur et l'enclume suivent la zone de frappe (elle bouge
        // quand la bulle du tutoriel apparaît ou disparaît).
        const { width, height } = this.app.screen;
        const anchor = this.getAnchor() ?? {
            x: width / 2,
            y: height * 0.55,
            size: 240,
        };
        this.glow.position.set(anchor.x, anchor.y);
        this.anvil.place(anchor.x, anchor.y, anchor.size);
        this.anvil.setHovered(anchor.hovered ?? false);

        const phase = (this.elapsedSeconds / GLOW_BREATH_SECONDS) * Math.PI * 2;
        this.glow.alpha = 0.8 + 0.2 * Math.sin(phase);

        const now = performance.now();
        for (const impact of this.pendingImpacts.filter((i) => i.at <= now)) {
            this.impact(impact);
        }
        this.pendingImpacts = this.pendingImpacts.filter((i) => i.at > now);

        this.anvil.update(now, this.reducedMotion);

        const hotspot = this.anvil.hotspot();
        this.hammer.place(anchor.x, anchor.y, hotspot.scale);
        this.hammer.update(now, this.reducedMotion);
        this.reactions.update(
            now,
            anchor.x,
            anchor.y,
            hotspot.scale,
            this.reducedMotion,
        );
        this.sparks.update(
            Math.min(ticker.deltaMS / 1000, MAX_FRAME_SECONDS),
            hotspot.x,
            hotspot.y,
            hotspot.scale,
        );
    };
}
