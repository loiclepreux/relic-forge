import { Container, Graphics } from "pixi.js";
import { HAMMER_REST_ANGLE, hammerAngle } from "./hammerAnimation";

// Dessiné dans les mêmes unités que l'enclume (zone de 260).
/** Bout du manche, autour duquel le marteau pivote (à droite de l'enclume). */
const PIVOT = { x: 175, y: -40 };

const WOOD = 0x8a5a34;
const WOOD_DARK = 0x5a3a22;
const LEATHER = 0x3a2a22;
const STEEL = 0x3a3a44;
const STEEL_EDGE = 0x8c7b62;
const STEEL_FACE = 0xd9a45b;

/**
 * Le marteau qui frappe l'enclume à chaque clic. Dessiné posé sur
 * l'enclume (angle 0), puis tourné autour du bout de son manche.
 */
export class HammerActor {
    readonly view = new Container({ label: "hammer" });
    private readonly arm = new Container();
    private strikeAt = -Infinity;
    private fromAngle = HAMMER_REST_ANGLE;

    constructor() {
        this.arm.addChild(drawHammer());
        this.arm.position.set(PIVOT.x, PIVOT.y);
        this.arm.rotation = HAMMER_REST_ANGLE;
        this.view.addChild(this.arm);
    }

    strike(nowMs: number) {
        this.fromAngle = this.arm.rotation;
        this.strikeAt = nowMs;
    }

    update(nowMs: number, reducedMotion: boolean) {
        this.arm.rotation = hammerAngle(
            nowMs - this.strikeAt,
            this.fromAngle,
            reducedMotion,
        );
    }

    /** Même placement que l'enclume. */
    place(x: number, y: number, scale: number) {
        this.view.position.set(x, y);
        this.view.scale.set(scale);
    }
}

/** Coordonnées relatives au pivot ; la tête tombe sur le point de frappe. */
function drawHammer(): Graphics {
    const g = new Graphics();
    // Manche en bois, un peu plus large vers la main.
    g.poly([0, -7, -140, -34, -140, -24, 0, 7])
        .fill(WOOD)
        .stroke({ color: WOOD_DARK, width: 1.5 });
    // Poignée en cuir au bout du manche.
    g.roundRect(-36, -10, 38, 20, 5).fill(LEATHER);
    // Tête d'acier, verticale à l'impact.
    g.roundRect(-172, -56, 34, 48, 4)
        .fill(STEEL)
        .stroke({ color: STEEL_EDGE, width: 2, alpha: 0.9 });
    // Face de frappe, polie, en bas de la tête.
    g.rect(-170, -13, 30, 3).fill({ color: STEEL_FACE, alpha: 0.8 });
    // Cerclage qui tient la tête sur le manche.
    g.rect(-142, -36, 6, 14).fill(STEEL_EDGE);
    return g;
}
