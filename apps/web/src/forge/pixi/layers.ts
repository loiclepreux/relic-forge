// Les couches de la scène, de la plus lointaine à la plus proche (Bible 24.4).
// Séparées pour pouvoir alléger les plus coûteuses sans toucher à l'essentiel.
export const FORGE_LAYERS = [
    "background", // architecture, statues, profondeur
    "ambiance", // brume, poussière, lumière
    "machinery", // engrenages, chaînes, anneaux
    "anvil", // l'enclume et ses réactions
    "effects", // étincelles, impacts, runes
    "events", // transformations et courtes cinématiques
] as const;

export type ForgeLayerName = (typeof FORGE_LAYERS)[number];
