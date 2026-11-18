import { describe, expect, it, vi } from "vitest";
import { startScene } from "./sceneLifecycle";

/** Une fausse scène dont on contrôle le moment où elle est prête. */
function deferredScene() {
    const scene = { destroy: vi.fn() };
    let resolve!: () => void;
    const promise = new Promise<typeof scene>((done) => {
        resolve = () => done(scene);
    });
    return { scene, create: () => promise, resolve };
}

const flush = () => new Promise((done) => setTimeout(done, 0));

describe("startScene", () => {
    it("garde la scène quand elle est prête", async () => {
        const { scene, create, resolve } = deferredScene();
        const onReady = vi.fn();
        startScene(create, onReady);

        resolve();
        await flush();

        expect(onReady).toHaveBeenCalledWith(scene);
        expect(scene.destroy).not.toHaveBeenCalled();
    });

    it("détruit la scène à l'arrêt", async () => {
        const { scene, create, resolve } = deferredScene();
        const stop = startScene(create);
        resolve();
        await flush();

        stop();

        expect(scene.destroy).toHaveBeenCalledOnce();
    });

    it("détruit une scène arrivée après l'arrêt", async () => {
        const { scene, create, resolve } = deferredScene();
        const onReady = vi.fn();
        const stop = startScene(create, onReady);

        stop();
        resolve();
        await flush();

        expect(scene.destroy).toHaveBeenCalledOnce();
        expect(onReady).not.toHaveBeenCalled();
    });

    it("monter, démonter, remonter (StrictMode) laisse une seule scène", async () => {
        const first = deferredScene();
        const second = deferredScene();

        const stopFirst = startScene(first.create);
        stopFirst();
        startScene(second.create);
        first.resolve();
        second.resolve();
        await flush();

        expect(first.scene.destroy).toHaveBeenCalledOnce();
        expect(second.scene.destroy).not.toHaveBeenCalled();
    });

    it("une création ratée ne casse rien", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        startScene(() => Promise.reject(new Error("WebGL indisponible")));
        await flush();

        expect(error).toHaveBeenCalledOnce();
        error.mockRestore();
    });
});
