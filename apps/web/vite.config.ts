import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        // En développement, les appels à /api sont renvoyés vers le serveur
        // NestJS (pnpm dev:api). Pour le navigateur, tout vient de la même
        // adresse : le cookie de session fonctionne sans réglage particulier.
        proxy: {
            "/api": "http://localhost:3000",
        },
    },
});
