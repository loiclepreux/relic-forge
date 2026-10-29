import { Controller, Get, Inject } from "@nestjs/common";
import {
    calculateForgeUpgradeCost,
    MAX_FORGE_FORCE,
} from "@relic-forge/game-engine";
import { PrismaService } from "./prisma/prisma.service";

/**
 * Route de santé : vérifie que le serveur répond, qu'il utilise
 * le moteur de jeu partagé et qu'il joint la base de données.
 */
@Controller("health")
export class HealthController {
    // @Inject explicite : fonctionne aussi dans les tests (Vitest).
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    @Get()
    async getHealth() {
        return {
            status: "ok",
            service: "relic-forge-api",
            database: await this.checkDatabase(),
            engine: {
                maxForgeForce: MAX_FORGE_FORCE,
                firstUpgradeCost: calculateForgeUpgradeCost(0),
            },
            time: new Date().toISOString(),
        };
    }

    private async checkDatabase(): Promise<"ok" | "unreachable"> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return "ok";
        } catch {
            return "unreachable";
        }
    }
}
