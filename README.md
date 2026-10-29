# Relic Forge

Jeu idle / clicker de fantasy. La Bible de Game Design (V9) décrit le jeu complet.

**État actuel : maquette locale en cours de passage au P01.**
Tout tourne encore dans le navigateur (sauvegarde dans `localStorage`).
Le P01 (Bible §40.5) ajoutera un serveur NestJS, PostgreSQL et un compte joueur :
le serveur deviendra seul responsable des calculs.

## Organisation

```
apps/
  web/                  interface React (Vite)
packages/
  game-engine/          règles du jeu + simulateur, partagés par tous
```

Les règles n'existent qu'à un seul endroit : `packages/game-engine`.
L'interface, le simulateur et le futur serveur l'importent sous le nom
`@relic-forge/game-engine`.

## Commandes (depuis la racine)

```bash
pnpm install
pnpm dev        # interface en développement
pnpm build      # vérification TypeScript + build
pnpm lint
pnpm test       # tests de tous les paquets
pnpm simulate   # simulateur d'équilibrage
```

## Valeurs provisoires (registre des décisions de la V9)

- Améliorations : `⌈120 × 1,28^F⌉`, Force de Forge maximale 50.
- Braise éveillée : `⌈200 × 1,3^n⌉` Échos, débloquée à Force de Forge 2.
- Stades : Force 0–10 / 11–25 / 26–40 / 41–50.
- Coup critique : 10 %, gain ×2.
