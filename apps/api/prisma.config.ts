/// <reference types="node" />

// Configuration de Prisma : où trouver le schéma, les migrations et la base.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        // Facultatif pour « prisma generate », obligatoire pour les migrations.
        url: process.env.DATABASE_URL,
    },
});
