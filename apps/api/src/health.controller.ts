import { Controller, Get } from "@nestjs/common";
import {
    calculateForgeUpgradeCost,
    MAX_FORGE_FORCE,
} from "@relic-forge/game-engine";

/**
 * Route de santé : permet de vérifier que le serveur répond
 * et qu'il utilise bien le moteur de jeu partagé.
 */
@Controller("health")
export class HealthController {
    @Get()
    getHealth() {
        return {
            status: "ok",
            service: "relic-forge-api",
            engine: {
                maxForgeForce: MAX_FORGE_FORCE,
                firstUpgradeCost: calculateForgeUpgradeCost(0),
            },
            time: new Date().toISOString(),
        };
    }
}
