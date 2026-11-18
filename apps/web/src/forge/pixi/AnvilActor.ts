import { Container, Graphics } from "pixi.js";
import {
    ANVIL_AT_REST,
    anvilFrame,
    strikeDurationMs,
    type StrikeKind,
} from "./anvilAnimation";

// L'enclume est dessinée pour une zone de 260 px, puis mise à l'échelle.
const DESIGN_SIZE = 260;
/** Le point de frappe, sur la table de l'enclume. */
const HOTSPOT = { x: 20, y: -46 };

const STEEL = 0x2b2b33;
const STEEL_EDGE = 0x8c7b62;
const STEEL_TOP = 0xd9a45b;
const BASE = 0x1c1a1f;
const HEAT = 0xffb347;
const HEAT_CRITICAL = 0xfff1c9;

/**
 * L'enclume au centre de la Forge. Elle se comprime et s'illumine
 * à chaque frappe ; elle ne sait rien des Échos.
 */
export class AnvilActor {
    readonly view = new Container({ label: "anvil" });
    private readonly body = new Container();
    private readonly halo = new Graphics();
    private readonly heat = new Graphics();
    private strikeAt = -Infinity;
    private strikeKind: StrikeKind = "normal";

    constructor() {
        this.body.addChild(drawStand(), drawAnvil(), this.heat);
        this.view.addChild(this.halo, this.body);
        // Pivot au pied de l'enclume : elle s'écrase vers le sol.
        this.body.pivot.set(0, 70);
        this.body.position.set(0, 70);
        this.drawHeat(HEAT);
        this.applyFrame(ANVIL_AT_REST);
    }

    /** Lance l'animation d'une frappe (une nouvelle frappe relance la précédente). */
    strike(kind: StrikeKind, nowMs: number) {
        // Un critique en cours n'est pas écrasé par une frappe ordinaire.
        const running =
            nowMs - this.strikeAt < strikeDurationMs(this.strikeKind);
        if (running && this.strikeKind === "critical" && kind === "normal") {
            return;
        }
        this.strikeKind = kind;
        this.strikeAt = nowMs;
        this.drawHeat(kind === "critical" ? HEAT_CRITICAL : HEAT);
    }

    update(nowMs: number, reducedMotion: boolean) {
        this.applyFrame(
            anvilFrame(nowMs - this.strikeAt, this.strikeKind, reducedMotion),
        );
    }

    /** Place l'enclume sur la zone de frappe (centre et diamètre en pixels). */
    place(x: number, y: number, size: number) {
        this.view.position.set(x, y);
        this.view.scale.set(size / DESIGN_SIZE);
    }

    /** Le point de frappe, en pixels de la scène, et l'échelle de l'enclume. */
    hotspot(): { x: number; y: number; scale: number } {
        const scale = this.view.scale.x;
        return {
            x: this.view.x + HOTSPOT.x * scale,
            y: this.view.y + HOTSPOT.y * scale,
            scale,
        };
    }

    private applyFrame(frame: {
        scaleX: number;
        scaleY: number;
        flash: number;
    }) {
        this.body.scale.set(frame.scaleX, frame.scaleY);
        this.heat.alpha = 0.15 + 0.85 * frame.flash;
        this.halo.alpha = frame.flash;
    }

    private drawHeat(color: number) {
        this.heat.clear();
        for (let i = 6; i >= 1; i--) {
            this.heat
                .ellipse(HOTSPOT.x, HOTSPOT.y, 7 * i, 2.2 * i)
                .fill({ color, alpha: 0.12 });
        }
        this.halo.clear();
        for (let i = 10; i >= 1; i--) {
            this.halo
                .circle(HOTSPOT.x, HOTSPOT.y, 12 * i)
                .fill({ color, alpha: 0.035 });
        }
    }
}

/** Silhouette de l'enclume : corne à gauche, table, taille, pied. */
function drawAnvil(): Graphics {
    const g = new Graphics();
    g.poly([
        -122,
        -32, // pointe de la corne
        -62,
        -48, // début de la table
        96,
        -48, // fin de la table
        102,
        -22,
        58,
        -12, // taille
        44,
        22,
        76,
        46, // pied droit
        -76,
        46, // pied gauche
        -44,
        22,
        -58,
        -12,
        -92,
        -16, // dessous de la corne
    ])
        .fill(STEEL)
        .stroke({ color: STEEL_EDGE, width: 2, alpha: 0.8 });
    // Arête de la table, polie par les frappes.
    g.moveTo(-60, -47)
        .lineTo(94, -47)
        .stroke({ color: STEEL_TOP, width: 2, alpha: 0.7 });
    // Rune discrète gravée sur le flanc.
    g.circle(0, 8, 9).stroke({ color: STEEL_TOP, width: 1, alpha: 0.35 });
    g.moveTo(0, -1)
        .lineTo(0, 17)
        .stroke({ color: STEEL_TOP, width: 1, alpha: 0.35 });
    return g;
}

/** Socle de pierre sous l'enclume. */
function drawStand(): Graphics {
    const g = new Graphics();
    g.roundRect(-58, 46, 116, 24, 4)
        .fill(BASE)
        .stroke({ color: STEEL_EDGE, width: 1, alpha: 0.4 });
    return g;
}
