import {
    Container,
    Graphics,
    Sprite,
    type Renderer,
    type Texture,
} from "pixi.js";
import type { Ambiance } from "./ambiance";
import {
    DUST_COUNT,
    EMBER_COUNT,
    MoteField,
    moteWeight,
    type Mote,
} from "./motes";

const DUST_COLOR = 0xc9b8a0;
const DUST_ALPHA = 0.35;
const EMBER_ALPHA = 0.9;
/** Animations réduites : tout flotte trois fois plus lentement. */
const REDUCED_SPEED = 0.3;

/**
 * Canaux incandescents au sol, sous l'enclume (unités de l'enclume,
 * zone de 260 ; le socle s'arrête à y = 70).
 */
const CHANNELS: number[][] = [
    [-50, 72, -110, 78, -150, 74, -205, 86],
    [50, 72, 105, 80, 160, 76, 212, 90],
    [-20, 72, -42, 96, -92, 112, -130, 118],
    [25, 72, 62, 100, 122, 116],
    [0, 72, 6, 104, -8, 136],
];

/**
 * L'ambiance d'un stade : canaux au sol (couche du fond), poussière
 * et braises (couche d'ambiance). Les sprites sont créés une fois.
 */
export class AmbianceLayer {
    readonly channels = new Graphics();
    readonly motes = new Container({ label: "motes" });
    private readonly field = new MoteField();
    private readonly dustSprites: Sprite[];
    private readonly emberSprites: Sprite[];
    private elapsed = 0;

    constructor(renderer: Renderer) {
        drawChannels(this.channels);
        this.channels.blendMode = "add";

        const dot = new Graphics();
        for (let i = 4; i >= 1; i--) {
            dot.circle(8, 8, 2 * i).fill({ color: 0xffffff, alpha: 0.25 });
        }
        const texture: Texture = renderer.generateTexture(dot);
        dot.destroy();

        const makeSprites = (count: number, add: boolean) =>
            Array.from({ length: count }, () => {
                const sprite = new Sprite(texture);
                sprite.anchor.set(0.5);
                if (add) sprite.blendMode = "add";
                this.motes.addChild(sprite);
                return sprite;
            });
        this.dustSprites = makeSprites(DUST_COUNT, false);
        this.emberSprites = makeSprites(EMBER_COUNT, true);
    }

    update(
        dt: number,
        ambiance: Ambiance,
        size: { width: number; height: number },
        anvil: { x: number; y: number; scale: number },
        reducedMotion: boolean,
    ) {
        this.elapsed += dt;
        this.field.step(dt, reducedMotion ? REDUCED_SPEED : 1);

        // Canaux : ils respirent lentement quand ils sont allumés.
        const pulse = reducedMotion
            ? 1
            : 0.75 + 0.25 * Math.sin(this.elapsed * 1.3);
        this.channels.position.set(anvil.x, anvil.y);
        this.channels.scale.set(anvil.scale);
        this.channels.tint = ambiance.channelColor;
        this.channels.alpha = ambiance.channels * pulse;
        this.channels.visible = ambiance.channels > 0.01;

        placeMotes(this.dustSprites, this.field.dust, size, (mote, i) => ({
            alpha: DUST_ALPHA * moteWeight(i, DUST_COUNT, ambiance.dust),
            color: DUST_COLOR,
            scale: mote.size / 8,
        }));
        placeMotes(this.emberSprites, this.field.embers, size, (mote, i) => ({
            alpha:
                EMBER_ALPHA *
                MoteField.emberGlow(mote) *
                moteWeight(i, EMBER_COUNT, ambiance.embers),
            color: ambiance.emberColor,
            scale: mote.size / 8,
        }));
    }
}

function placeMotes(
    sprites: Sprite[],
    motes: Mote[],
    size: { width: number; height: number },
    look: (
        mote: Mote,
        index: number,
    ) => {
        alpha: number;
        color: number;
        scale: number;
    },
) {
    for (let i = 0; i < sprites.length; i++) {
        const sprite = sprites[i];
        const mote = motes[i];
        const { alpha, color, scale } = look(mote, i);
        sprite.visible = alpha > 0.01;
        if (!sprite.visible) continue;
        sprite.alpha = alpha;
        sprite.tint = color;
        sprite.scale.set(scale);
        sprite.position.set(mote.x * size.width, mote.y * size.height);
    }
}

/** Dessinés en blanc : la couleur du stade est appliquée par teinte. */
function drawChannels(g: Graphics) {
    for (const points of CHANNELS) {
        // Halo large et pâle, puis filet fin et vif.
        g.poly(points, false).stroke({
            color: 0xffffff,
            width: 9,
            alpha: 0.12,
            cap: "round",
            join: "round",
        });
        g.poly(points, false).stroke({
            color: 0xffffff,
            width: 2.5,
            alpha: 0.85,
            cap: "round",
            join: "round",
        });
    }
}
