import {
    Container,
    Graphics,
    Sprite,
    type Renderer,
    type Texture,
} from "pixi.js";
import { SPARK_BUDGET, SparkPool, type Spark } from "./sparks";

/**
 * Dessine les étincelles. Les sprites sont créés une fois pour toutes
 * (autant que le budget) puis réutilisés : rien n'est alloué pendant
 * que le joueur frappe. La texture est libérée avec la scène.
 */
export class SparkLayer {
    readonly view = new Container({ label: "sparks" });
    readonly pool = new SparkPool();
    private readonly sprites: Sprite[] = [];
    private readonly texture: Texture;

    constructor(renderer: Renderer) {
        // Un point lumineux doux, étiré ensuite en traînée.
        const dot = new Graphics();
        for (let i = 4; i >= 1; i--) {
            dot.circle(8, 8, 2 * i).fill({ color: 0xffffff, alpha: 0.25 });
        }
        this.texture = renderer.generateTexture(dot);
        dot.destroy();

        for (let i = 0; i < SPARK_BUDGET; i++) {
            const sprite = new Sprite(this.texture);
            sprite.anchor.set(0.5);
            sprite.blendMode = "add";
            sprite.visible = false;
            this.view.addChild(sprite);
            this.sprites.push(sprite);
        }
    }

    emit(burst: Spark[]) {
        this.pool.emit(burst);
    }

    /**
     * Avance de `dt` secondes et place les étincelles autour du point
     * de frappe (`originX`, `originY`), à l'échelle de l'enclume.
     */
    update(dt: number, originX: number, originY: number, scale: number) {
        this.pool.step(dt);
        const { sparks } = this.pool;
        for (let i = 0; i < this.sprites.length; i++) {
            const sprite = this.sprites[i];
            const spark = sparks[i];
            if (!spark) {
                sprite.visible = false;
                continue;
            }
            const fade = spark.life / spark.maxLife;
            sprite.visible = true;
            sprite.tint = spark.color;
            sprite.alpha = fade;
            sprite.position.set(
                originX + spark.x * scale,
                originY + spark.y * scale,
            );
            // Traînée orientée dans le sens du mouvement, qui raccourcit en s'éteignant.
            sprite.rotation = Math.atan2(spark.vy, spark.vx);
            const length = (spark.size * (0.4 + 0.6 * fade) * scale) / 8;
            sprite.scale.set(Math.max(length, 0.25 * scale), 0.25 * scale);
        }
    }
}
