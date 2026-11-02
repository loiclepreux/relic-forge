import {
    type CanActivate,
    type ExecutionContext,
    Inject,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService, type PublicUser } from "./auth.service";
import { readCookie, SESSION_COOKIE } from "./session-token";

/** Requête dont le joueur a été identifié par AuthGuard. */
export type AuthenticatedRequest = Request & { user: PublicUser };

/**
 * Protège une route : seul un joueur connecté peut l'appeler.
 * Usage : @UseGuards(AuthGuard) au-dessus d'une route.
 */
@Injectable()
export class AuthGuard implements CanActivate {
    constructor(@Inject(AuthService) private readonly auth: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = readCookie(request.headers.cookie, SESSION_COOKIE);
        const user = token ? await this.auth.getUserFromToken(token) : null;

        if (!user) {
            throw new UnauthorizedException("Connexion requise.");
        }

        (request as AuthenticatedRequest).user = user;
        return true;
    }
}
