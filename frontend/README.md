# Relic Forge — maquette locale

Maquette jouable de la boucle de la Forge : frapper, améliorer, produire.
Tout tourne dans le navigateur, la sauvegarde est dans `localStorage`.

Ce n'est **pas encore le P01** de la Bible V8 (§40.5) : le P01 demande un
serveur NestJS, PostgreSQL et un compte joueur. Ici, la limite de 5 frappes
par seconde et la production sont calculées côté navigateur.

## Lancer

```bash
pnpm install
pnpm dev     # serveur de développement
pnpm test    # tests Vitest
pnpm build   # vérification TypeScript + build de production
pnpm lint
```

En développement, un bouton « Réinitialiser (dev) » apparaît en bas à droite.
Il n'existe pas dans le build de production.

## Organisation

```
src/
  App.tsx             interface
  game/
    forgeEconomy.ts   calculs purs (gains, coûts, production, stades)
    forgeActions.ts   actions du joueur (frapper, améliorer, acheter)
    forgeState.ts     type d'état + migration des sauvegardes V1
    forgeSave.ts      sauvegarde et chargement
    *.test.ts         tests Vitest
```

Règles :
- Les montants sont en milli-Échos entiers (1 Écho = 1000).
- La production est calculée à partir de `lastProductionAt`, jamais additionnée à chaque tick.
- Les clés de sauvegarde (`relic-forge-save`, `relic-forge-save-v2`) ne doivent jamais changer.

## Valeurs provisoires (à inscrire au registre des décisions)

- Braise éveillée : coût `ceil(15 × 1.15^n)`, débloquée à Force de Forge 2.
- Stades de la Forge : seuils 5 / 10 / 20 sur la Force, en attendant le
  niveau du joueur.