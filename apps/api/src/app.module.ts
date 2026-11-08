import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ForgeModule } from "./forge/forge.module";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
    imports: [PrismaModule, AuthModule, ForgeModule],
    controllers: [HealthController],
})
export class AppModule {}
