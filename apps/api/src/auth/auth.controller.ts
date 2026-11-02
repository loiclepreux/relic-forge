import {
    Body,
    Controller,
    Get,
    HttpCode,
    Inject,
    Post,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthGuard, type AuthenticatedRequest } from "./auth.guard";
import { AuthService } from "./auth.service";
import { readCredentials } from "./credentials";
import {
    readCookie,
    SESSION_COOKIE,
    SESSION_DURATION_MS,
} from "./session-token";

/** Options du cookie de session. */
const cookieOptions = {
    httpOnly: true, // illisible par le JavaScript de la page
    sameSite: "lax" as const, // pas envoyé par les sites tiers
    secure: process.env.NODE_ENV === "production", // HTTPS en production
    path: "/",
};

@Controller("auth")
export class AuthController {
    constructor(@Inject(AuthService) private readonly auth: AuthService) {}

    @Post("register")
    async register(
        @Body() body: unknown,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { user, token } = await this.auth.register(readCredentials(body));
        res.cookie(SESSION_COOKIE, token, {
            ...cookieOptions,
            maxAge: SESSION_DURATION_MS,
        });
        return { user };
    }

    @Post("login")
    @HttpCode(200)
    async login(
        @Body() body: unknown,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { user, token } = await this.auth.login(readCredentials(body));
        res.cookie(SESSION_COOKIE, token, {
            ...cookieOptions,
            maxAge: SESSION_DURATION_MS,
        });
        return { user };
    }

    @Post("logout")
    @HttpCode(200)
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const token = readCookie(req.headers.cookie, SESSION_COOKIE);
        if (token) await this.auth.logout(token);
        res.clearCookie(SESSION_COOKIE, cookieOptions);
        return { ok: true };
    }

    @Get("me")
    @UseGuards(AuthGuard)
    me(@Req() req: AuthenticatedRequest) {
        return { user: req.user };
    }
}
