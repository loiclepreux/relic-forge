import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "./app.module";

describe("GET /api/health", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleRef.createNestApplication();
        app.setGlobalPrefix("api");
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it("répond que le serveur va bien", async () => {
        const response = await request(app.getHttpServer())
            .get("/api/health")
            .expect(200);

        expect(response.body.status).toBe("ok");
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
});
