import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Accès à la base de données PostgreSQL, partagé par tout le serveur.
 * L'adresse de la base vient de DATABASE_URL (fichier apps/api/.env).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
    constructor() {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error(
                "DATABASE_URL manquante : copie apps/api/.env.example en apps/api/.env",
            );
        }
        super({ adapter: new PrismaPg({ connectionString }) });
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
