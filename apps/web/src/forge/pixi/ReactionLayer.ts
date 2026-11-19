import { Container, Graphics } from "pixi.js";
import { REACTION_STYLES, reactionFrame, type ReactionKind } from "./reactions";

/** Rayon du cercle de runes, en unités de l'enclume. */
const RUNE_RADIUS = 150;
/** Nombre de signes gravés sur le cercle. */
const RUNE_MARKS = 12;

type ActiveReaction = {
    kind: ReactionKind;
    startedAt: number;
    view: Container;
    light: Graphics;
    ring: Graphics;
    rune: Graphics;
};

/**
 * Dessine les réactions aux achats et aux changements de stade.
 * Une nouvelle réaction remplace celle du même type encore en cours.
 */
export class ReactionLayer {
    readonly view = new Container({ label: "reactions" });
    private active: ActiveReaction[] = [];

    start(kind: ReactionKind, nowMs: number) {
        for (const reaction of this.active.filter((r) => r.kind === kind)) {
            this.remove(reaction);
        }

        const color = REACTION_STYLES[kind].color;
        const light = drawLight(color);
        const ring = new Graphics();
        const rune = drawRune(color);
        const view = new Container();
        view.addChild(light, ring, rune);
        this.view.addChild(view);
        this.active.push({ kind, startedAt: nowMs, view, light, ring, rune });
    }

    /** Place les réactions au centre de l'enclume, à son échelle. */
    update(
        nowMs: number,
        x: number,
        y: number,
        scale: number,
        reducedMotion: boolean,
        /** Atténuation des éclats de lumière (réglage du joueur). */
        flashScale = 1,
    ) {
        for (const reaction of [...this.active]) {
            const frame = reactionFrame(
                reaction.kind,
                nowMs - reaction.startedAt,
                reducedMotion,
            );
            if (!frame) {
                this.remove(reaction);
                continue;
            }
            reaction.view.position.set(x, y);
            reaction.view.scale.set(scale);
            reaction.light.alpha = frame.lightAlpha * flashScale;
            reaction.rune.alpha = frame.runeAlpha;
            reaction.rune.rotation = frame.runeRotation;
            reaction.ring.clear().circle(0, 0, frame.ringRadius).stroke({
                color: REACTION_STYLES[reaction.kind].color,
                width: 3,
                alpha: frame.ringAlpha,
            });
        }
    }

    private remove(reaction: ActiveReaction) {
        this.active = this.active.filter((r) => r !== reaction);
        reaction.view.destroy({ children: true });
    }
}

/** Grande lueur douce, en cercles très légers. */
function drawLight(color: number): Graphics {
    const g = new Graphics();
    // Lumière ajoutée : elle éclaire l'enclume au lieu de la masquer.
    g.blendMode = "add";
    for (let i = 16; i >= 1; i--) {
        g.circle(0, 0, 18 * i).fill({ color, alpha: 0.05 });
    }
    return g;
}

/** Cercle de runes : deux anneaux et des signes réguliers entre eux. */
function drawRune(color: number): Graphics {
    const g = new Graphics();
    g.circle(0, 0, RUNE_RADIUS).stroke({ color, width: 2, alpha: 0.9 });
    g.circle(0, 0, RUNE_RADIUS - 18).stroke({ color, width: 1, alpha: 0.6 });
    for (let i = 0; i < RUNE_MARKS; i++) {
        const angle = (i / RUNE_MARKS) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const inner = RUNE_RADIUS - 14;
        const outer = RUNE_RADIUS - 4;
        // Un trait, et un petit losange un signe sur deux.
        g.moveTo(cos * inner, sin * inner)
            .lineTo(cos * outer, sin * outer)
            .stroke({ color, width: 2, alpha: 0.9 });
        if (i % 2 === 0) {
            const mid = RUNE_RADIUS - 9;
            const px = -sin * 4;
            const py = cos * 4;
            g.poly([
                cos * (mid - 5),
                sin * (mid - 5),
                cos * mid + px,
                sin * mid + py,
                cos * (mid + 5),
                sin * (mid + 5),
                cos * mid - px,
                sin * mid - py,
            ]).fill({ color, alpha: 0.8 });
        }
    }
    return g;
}
