SELECT u.email AS testeur,
  to_char(
    u."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Paris',
    'DD/MM HH24:MI'
  ) AS inscription,
  to_char(
    MIN(t."createdAt") FILTER (
      WHERE t.kind = 'STRIKE_BATCH'
    ) - u."createdAt",
    'MI:SS'
  ) AS premiere_frappe,
  to_char(
    MIN(t."createdAt") FILTER (
      WHERE t.kind = 'PURCHASE'
    ) - u."createdAt",
    'MI:SS'
  ) AS premier_achat,
  MAX(
    CASE
      WHEN g."upgradeKey" = 'STRIKE_POWER' THEN g.level
    END
  ) AS force,
  MAX(
    CASE
      WHEN g."upgradeKey" = 'AWAKENED_EMBER' THEN g.level
    END
  ) AS braises,
  CASE
    WHEN MAX(
      CASE
        WHEN g."upgradeKey" = 'AWAKENED_EMBER' THEN g.level
      END
    ) > 0 THEN 'oui'
    ELSE 'non'
  END AS tutoriel_termine
FROM "User" u
  LEFT JOIN "EconomyTransaction" t ON t."userId" = u.id
  LEFT JOIN "ForgeState" f ON f."userId" = u.id
  LEFT JOIN "PlayerForgeUpgrade" g ON g."forgeStateId" = f.id
GROUP BY u.id,
  u.email,
  u."createdAt"
ORDER BY u."createdAt";