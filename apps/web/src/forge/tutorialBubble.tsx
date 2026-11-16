import type { TutorialStep } from "./tutorial";

type Props = {
    step: TutorialStep;
    onSkip: () => void;
};

/** Bulle d'aide du tutoriel, affichée au-dessus de la Forge. */
export function TutorialBubble({ step, onSkip }: Props) {
    return (
        <div className="tutorial-bubble" role="status" aria-live="polite">
            <p className="tutorial-step">
                Étape {step.number} / {step.total}
            </p>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
            <button type="button" onClick={onSkip}>
                Passer le tutoriel
            </button>
        </div>
    );
}
