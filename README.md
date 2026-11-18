# Relic Forge

Jeu idle / clicker de fantasy. La Bible de Game Design (V9) décrit le jeu complet.

**État actuel : P01 terminé, en phase de test joueurs.**
Le joueur crée un compte, frappe la Forge, achète des améliorations et des
Braises éveillées, guidé par un tutoriel en 4 étapes. Le serveur est seul
responsable des calculs ; l'interface n'affiche qu'une estimation.

## Organisation

```
apps/
  web/                  interface React (Vite)
  api/                  serveur NestJS + Prisma (PostgreSQL)
packages/
  game-engine/          règles du jeu + simulateur, partagés par tous
docs/
  p01-mesures.sql       mesures des tests joueurs du P01
```

Les règles n'existent qu'à un seul endroit : `packages/game-engine`.
L'interface, le serveur et le simulateur l'importent sous le nom
`@relic-forge/game-engine`.

## Première installation

Il faut Node 22.12 ou plus, pnpm et Docker.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up        # base PostgreSQL (Docker, port 5433)
pnpm db:migrate   # crée les tables
```

## Lancer le jeu

Dans deux terminaux, depuis la racine :

```bash
pnpm dev:api    # serveur sur http://localhost:3000
pnpm dev        # interface sur http://localhost:5173
```

## Autres commandes

```bash
pnpm build      # vérification TypeScript + build
pnpm lint
pnpm test       # tests de tous les paquets
pnpm simulate   # simulateur d'équilibrage
pnpm db:studio  # explorer la base
pnpm db:down    # arrêter la base
```

Mesures des tests joueurs (PowerShell, base lancée) :

```powershell
Get-Content docs\p01-mesures.sql | docker exec -i relic-forge-db psql -U relicforge -d relicforge
```

## Valeurs provisoires (registre des décisions de la V9)

- Améliorations : `⌈120 × 1,28^F⌉`, Force de Forge maximale 50.
- Braise éveillée : `⌈200 × 1,3^n⌉` Échos, débloquée à Force de Forge 2.
- Stades : Force 0–10 / 11–25 / 26–40 / 41–50.
- Coup critique : 10 %, gain ×2.
- Absence : production à 50 %, plafonnée à 8 h ; un onglet caché compte comme une absence.
- Frappes : 5 par seconde au maximum.
