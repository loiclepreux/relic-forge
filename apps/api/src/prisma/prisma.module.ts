import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/** Rend PrismaService disponible dans tous les modules du serveur. */
@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule {}
