/** Ce qu'il faut savoir d'une touche pressée. */
export type KeyPress = {
    code: string;
    repeat: boolean;
    /** Le focus est dans un champ de saisie ou sur un bouton. */
    targetIsInteractive: boolean;
};

/**
 * Espace frappe la Forge (Bible 24.15). Garder la touche enfoncée ne
 * frappe pas en boucle, et Espace garde son rôle normal dans un champ
 * ou sur un bouton (qui le gère déjà lui-même).
 */
export function isStrikeKey(press: KeyPress): boolean {
    return press.code === "Space" && !press.repeat && !press.targetIsInteractive;
}

/** Le focus est-il sur un élément qui utilise déjà la touche Espace ? */
export function isInteractiveElement(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return (
        target.closest(
            "input, textarea, select, button, a, [contenteditable='true'], [role='dialog']",
        ) !== null
    );
}
