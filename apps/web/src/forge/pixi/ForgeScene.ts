import { Application, Container, Graphics, type Ticker } from "pixi.js";
import { FORGE_LAYERS, type ForgeLayerName } from "./layers";

/** Lueur des braises : beaucoup de cercles très légers, pour un dégradé sans marches. */
const GLOW_RING_COUNT = 24;
/** Rayon du plus grand cercle, en part de la hauteur de la scène. */
const GLOW_MAX_RADIUS = 0.45;
/** Opacité ajoutée par chaque cercle. */
const GLOW_RING_ALPHA = 0.014;
const GLOW_COLOR = 0xff8a2a;
/** Une respiration lente, pour ne pas fatiguer l'œil (Bible 24.16). */
const GLOW_BREATH_SECONDS = 4;

/**
 * La scène PixiJS de la Forge. Elle ne connaît rien de l'économie :
 * elle dessine seulement ce qu'on lui demande.
 */
export class ForgeScene {
    readonly layers: Record<ForgeLayerName, Container>;
    private readonly app: Application;
    private readonly glow: Graphics;
    private elapsedSeconds = 0;
    private destroyed = false;

    private constructor(
        app: Application,
        layers: Record<ForgeLayerName, Container>,
    ) {
        this.app = app;
        this.layers = layers;

        this.glow = new Graphics();
        this.layers.ambiance.addChild(this.glow);

        this.app.ticker.add(this.update);
        this.app.renderer.on("resize", this.layout);
        this.layout();
    }

    /** Crée la scène et place son canvas dans `host` (il en prend la taille). */
    static async create(host: HTMLElement): Promise<ForgeScene> {
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

        return new ForgeScene(app, layers);
    }

    /** Libère tout : canvas, textures, animations. Sans effet si déjà fait. */
    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.app.ticker.remove(this.update);
        this.app.renderer.off("resize", this.layout);
        this.app.destroy(
            { removeView: true },
            { children: true, texture: true, textureSource: true },
        );
    }

    /** Recalcule les positions quand la fenêtre change de taille. */
    private layout = () => {
        const { width, height } = this.app.screen;
        this.glow.clear();
        for (let i = GLOW_RING_COUNT; i >= 1; i--) {
            const radius = (i / GLOW_RING_COUNT) * GLOW_MAX_RADIUS * height;
            this.glow
                .circle(0, 0, radius)
                .fill({ color: GLOW_COLOR, alpha: GLOW_RING_ALPHA });
        }
        this.glow.position.set(width / 2, height * 0.55);
    };

    private update = (ticker: Ticker) => {
        this.elapsedSeconds += ticker.deltaMS / 1000;
        const phase = (this.elapsedSeconds / GLOW_BREATH_SECONDS) * Math.PI * 2;
        this.glow.alpha = 0.8 + 0.2 * Math.sin(phase);
    };
}
