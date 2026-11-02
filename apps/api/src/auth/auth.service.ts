import {
    ConflictException,
    Inject,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Credentials } from "./credentials";
import { hashPassword, verifyPassword } from "./password";
import {
    createSessionToken,
    hashSessionToken,
    SESSION_DURATION_MS,
} from "./session-token";

/** Ce que le serveur renvoie au sujet d'un joueur (jamais son mot de passe). */
export type PublicUser = {
    id: string;
    email: string;
};

export type AuthResult = {
    user: PublicUser;
    /** Jeton secret à placer dans le cookie de session. */
    token: string;
};

@Injectable()
export class AuthService {
    constructor(
        @Inject(PrismaService) private readonly prisma: PrismaService,
    ) {}

    /** Crée un compte, sa Forge de départ, puis ouvre une session. */
    async register({ email, password }: Credentials): Promise<AuthResult> {
        const existing = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existing) {
            throw new ConflictException(
                "Cette adresse e-mail est déjà utilisée.",
            );
        }

        const user = await this.prisma.user.create({
            data: {
                email,
                passwordHash: await hashPassword(password),
                // Forge de départ : Force 0, aucune Braise, 0 Écho.
                forge: {
                    create: {
                        upgrades: {
                            create: [
                                { upgradeKey: "STRIKE_POWER", level: 0 },
                                { upgradeKey: "AWAKENED_EMBER", level: 0 },
                            ],
                        },
                    },
                },
                balances: {
                    create: [{ resource: "ECHOES", amountMilli: 0n }],
                },
            },
        });

        return this.openSession(user);
    }

    /** Vérifie l'e-mail et le mot de passe, puis ouvre une session. */
    async login({ email, password }: Credentials): Promise<AuthResult> {
        const user = await this.prisma.user.findUnique({ where: { email } });

        // Même message dans les deux cas : on ne révèle pas si le compte existe.
        if (!user || !(await verifyPassword(password, user.passwordHash))) {
            throw new UnauthorizedException(
                "E-mail ou mot de passe incorrect.",
            );
        }

        return this.openSession(user);
    }

    /** Ferme la session : le jeton ne fonctionnera plus jamais. */
    async logout(token: string): Promise<void> {
        await this.prisma.session.deleteMany({
            where: { tokenHash: hashSessionToken(token) },
        });
    }

    /** Retrouve le joueur à partir du jeton du cookie (null si invalide). */
    async getUserFromToken(token: string): Promise<PublicUser | null> {
        const session = await this.prisma.session.findUnique({
            where: { tokenHash: hashSessionToken(token) },
            include: { user: true },
        });

        if (!session) return null;

        if (session.expiresAt.getTime() <= Date.now()) {
            await this.prisma.session.delete({ where: { id: session.id } });
            return null;
        }

        return { id: session.user.id, email: session.user.email };
    }

    private async openSession(user: PublicUser): Promise<AuthResult> {
        const token = createSessionToken();
        await this.prisma.session.create({
            data: {
                userId: user.id,
                tokenHash: hashSessionToken(token),
                expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
            },
        });
        return { user: { id: user.id, email: user.email }, token };
    }
}
