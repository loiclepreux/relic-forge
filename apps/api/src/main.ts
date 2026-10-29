import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

// Adresse de l'interface en développement (Vite).
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const PORT = Number(process.env.PORT ?? 3000);

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Toutes les routes commencent par /api (ex. /api/health).
    app.setGlobalPrefix("api");

    // Autoriser l'interface à appeler le serveur depuis le navigateur.
    app.enableCors({ origin: WEB_ORIGIN, credentials: true });

    await app.listen(PORT);
    console.log(`Serveur Relic Forge prêt : http://localhost:${PORT}/api/health`);
}

void bootstrap();
