import {
    Body,
    Controller,
    Get,
    HttpCode,
    Inject,
    Post,
    Req,
    UseGuards,
} from "@nestjs/common";
import { AuthGuard, type AuthenticatedRequest } from "../auth/auth.guard";
import { readPurchase, readStrikeBatch } from "./forge-requests";
import { ForgeService } from "./forge.service";

/** Routes de la Forge (Bible 23.10). Toutes exigent d'être connecté. */
@Controller("forge")
@UseGuards(AuthGuard)
export class ForgeController {
    constructor(@Inject(ForgeService) private readonly forge: ForgeService) {}

    /** État de la Forge. Sert aussi de signal « je suis là » toutes les 15 s. */
    @Get()
    getState(@Req() req: AuthenticatedRequest) {
        return this.forge.getState(req.user.id);
    }

    @Post("strike-batch")
    @HttpCode(200)
    strike(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
        const { requestId, count } = readStrikeBatch(body);
        return this.forge.strike(req.user.id, requestId, count);
    }

    @Post("upgrades")
    @HttpCode(200)
    buy(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
        const { requestId, upgradeKey } = readPurchase(body);
        return this.forge.buy(req.user.id, requestId, upgradeKey);
    }
}
