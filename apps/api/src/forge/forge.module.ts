import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ForgeController } from "./forge.controller";
import { ForgeService } from "./forge.service";

@Module({
    imports: [AuthModule],
    controllers: [ForgeController],
    providers: [ForgeService],
})
export class ForgeModule {}
