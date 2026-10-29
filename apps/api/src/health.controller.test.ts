import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma/prisma.service";

// Fausse base de données : ces tests n'ont pas besoin de PostgreSQL.
function fakePrisma(databaseUp: boolean) {
    return {
        $queryRaw: async () => {
            if (!databaseUp) throw new Error("base injoignable");
            return [{ "?column?": 1 }];
        },
        $disconnect: async () => {},
    };
}

async function createApp(databaseUp: boolean) {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(PrismaService)
        .useValue(fakePrisma(databaseUp))
        .compile();
    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
    return app;
}

describe("GET /api/health", () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createApp(true);
    });

    afterAll(async () => {
        await app.close();
    });

    it("répond que le serveur et la base vont bien", async () => {
        const response = await request(app.getHttpServer())
            .get("/api/health")
            .expect(200);

        expect(response.body.status).toBe("ok");
        expect(response.body.database).toBe("ok");
    });

    it("utilise le moteur de jeu partagé", async () => {
        const response = await request(app.getHttpServer())
            .get("/api/health")
            .expect(200);

        expect(response.body.engine).toEqual({
            maxForgeForce: 50,
            firstUpgradeCost: 120,
        });
    });

    it("signale une base injoignable sans planter", async () => {
        const downApp = await createApp(false);
        const response = await request(downApp.getHttpServer())
            .get("/api/health")
            .expect(200);
        expect(response.body.database).toBe("unreachable");
        await downApp.close();
    });
});
