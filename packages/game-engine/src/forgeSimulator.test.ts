import { describe, expect, it } from "vitest";
import {
    createSeededRandom,
    simulate,
    simulateDailyLife,
} from "./forgeSimulator";

const regular = { name: "Régulier", strikesPerSecond: 3 };

describe("simulateur d'équilibrage", () => {
    it("donne toujours le même résultat avec la même graine", () => {
        const options = { durationSeconds: 600, critical: true, seed: 7 };
        expect(simulate(regular, options)).toEqual(simulate(regular, options));
    });

    it("produit une suite aléatoire reproductible entre 0 et 1", () => {
        const a = createSeededRandom(1);
        const b = createSeededRandom(1);
        for (let i = 0; i < 100; i++) {
            const value = a();
            expect(value).toBe(b());
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        }
    });

    it("n'achète rien si le joueur ne frappe jamais", () => {
        const idle = { name: "Absent", strikesPerSecond: 0 };
        const r = simulate(idle, {
            durationSeconds: 600,
            critical: true,
            seed: 1,
        });
        expect(r.firstPurchaseAt).toBeNull();
        expect(r.finalForce).toBe(0);
    });

    it("ne compte jamais plus de 5 frappes par seconde", () => {
        const spammer = { name: "Autoclicker", strikesPerSecond: 50 };
        const r = simulate(spammer, {
            durationSeconds: 60,
            critical: false,
            seed: 1,
        });
        expect(r.strikesCounted).toBe(5 * 60);
    });

    it("donne environ 10 % de critiques quand ils sont activés", () => {
        const r = simulate(regular, {
            durationSeconds: 3600,
            critical: true,
            seed: 3,
        });
        const rate = r.criticalStrikes / r.strikesCounted;
        expect(rate).toBeGreaterThan(0.09);
        expect(rate).toBeLessThan(0.11);
    });

    it("simule une vie de joueur reproductible, sans dépasser Force 50", () => {
        const options = {
            days: 30,
            sessionStartHours: [9, 20],
            sessionMinutes: 30,
            critical: true,
            seed: 5,
        };
        const r = simulateDailyLife(regular, options);
        expect(r).toEqual(simulateDailyLife(regular, options));
        expect(r.playedSeconds).toBe(30 * 2 * 30 * 60);
        expect(r.finalForce).toBeLessThanOrEqual(50);
    });

    it("fait progresser plus vite un joueur plus actif", () => {
        const options = {
            days: 10,
            sessionStartHours: [9, 20],
            sessionMinutes: 30,
            critical: false,
            seed: 1,
        };
        const calm = simulateDailyLife(
            { name: "Tranquille", strikesPerSecond: 1 / 3 },
            options,
        );
        const active = simulateDailyLife(regular, options);
        expect(active.forceReachedAt[11]!).toBeLessThan(
            calm.forceReachedAt[11]!,
        );
    });
});
