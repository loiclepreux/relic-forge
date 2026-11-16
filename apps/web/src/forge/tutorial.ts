import type { ForgeView } from "../api/forgeApi";

// ---------------------------------------------------------------
// Tutoriel du P01. Chaque étape est déduite de l'état de la Forge :
// pas besoin de l'enregistrer, le tutoriel avance tout seul quand
// le joueur fait ce qui est demandé, et disparaît à la fin.
// ---------------------------------------------------------------

/** Élément de l'écran mis en évidence par une étape. */
export type TutorialTarget = "core" | "upgrade" | "ember";

export type TutorialStep = {
    number: number;
    total: number;
    title: string;
    text: string;
    target: TutorialTarget;
};

const TOTAL = 4;

/** Force de Forge qui débloque la Braise éveillée (V9, provisoire). */
const EMBER_REQUIRED_FORCE = 2;

/** Renvoie l'étape en cours, ou null si le tutoriel est terminé. */
export function getTutorialStep(
    view: ForgeView,
    displayedEchoesMilli: number,
): TutorialStep | null {
    if (view.awakenedEmber > 0) return null;

    if (view.forgeForce === 0) {
        const cost = view.nextUpgradeCostMilli ?? 0;
        if (displayedEchoesMilli < cost) {
            return {
                number: 1,
                total: TOTAL,
                title: "Frappe la Forge",
                text: "Clique sur la Forge pour gagner des Échos. Chaque frappe en rapporte, et parfois un coup critique en double le gain.",
                target: "core",
            };
        }
        return {
            number: 2,
            total: TOTAL,
            title: "Améliore ta Forge",
            text: "Tu as assez d'Échos ! Améliore ta Forge : chaque amélioration augmente le gain de tes frappes.",
            target: "upgrade",
        };
    }

    if (view.forgeForce < EMBER_REQUIRED_FORCE) {
        return {
            number: 3,
            total: TOTAL,
            title: "Encore un effort",
            text: `Atteins la Force de Forge ${EMBER_REQUIRED_FORCE} pour débloquer les Braises éveillées.`,
            target: "upgrade",
        };
    }

    return {
        number: 4,
        total: TOTAL,
        title: "Éveille une Braise",
        text: "Achète ta première Braise éveillée : elle produit des Échos toute seule, même quand tu ne frappes pas.",
        target: "ember",
    };
}
