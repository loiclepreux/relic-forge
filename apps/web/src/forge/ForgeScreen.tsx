import { useRef, useState } from "react";
import { CRITICAL_CHANCE, CRITICAL_MULTIPLIER } from "@relic-forge/game-engine";
import type { User } from "../api/authApi";
import { ForgeCanvas } from "./ForgeCanvas";
import { TutorialBubble } from "./tutorialBubble";
import { getTutorialStep } from "./tutorial";
import { useServerForge } from "./useServerForge";

/** Déblocage de la Braise éveillée (valeur provisoire de la V9). */
const EMBER_REQUIRED_FORCE = 2;

/** Mémorise dans ce navigateur qu'un joueur a passé le tutoriel. */
const tutorialSkipKey = (userId: string) =>
    `relic-forge-tutorial-skipped-${userId}`;

function readTutorialSkipped(userId: string): boolean {
    try {
        return localStorage.getItem(tutorialSkipKey(userId)) === "1";
    } catch {
        return false;
    }
}

const formatEchoes = (milli: number) =>
    (milli / 1000).toLocaleString("fr-FR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    });

type Props = {
    user: User;
    onLogout: () => void;
    onSessionExpired: () => void;
};

/** L'écran de la Forge, alimenté par le serveur. */
export function ForgeScreen({ user, onLogout, onSessionExpired }: Props) {
    const forge = useServerForge(onSessionExpired);

    const [isStriking, setIsStriking] = useState(false);
    const [strikeGainShown, setStrikeGainShown] = useState<number | null>(null);
    const [showUpgradeFeedback, setShowUpgradeFeedback] = useState(false);
    const anvilRef = useRef<HTMLButtonElement>(null);

    const [tutorialSkipped, setTutorialSkipped] = useState(() =>
        readTutorialSkipped(user.id),
    );

    const view = forge.view;

    if (!view) {
        return (
            <main className="forge-page">
                <p className="auth-loading">Ouverture de la Forge…</p>
                {forge.message && (
                    <p role="alert" className="forge-offline-message">
                        {forge.message}
                    </p>
                )}
            </main>
        );
    }

    const echoes = forge.displayedEchoesMilli;
    const upgradeCost = view.nextUpgradeCostMilli;
    const emberCost = view.nextEmberCostMilli;
    const emberUnlocked = view.forgeForce >= EMBER_REQUIRED_FORCE;
    const canUpgrade =
        !forge.busy && upgradeCost !== null && echoes >= upgradeCost;
    const canBuyEmber = !forge.busy && emberUnlocked && echoes >= emberCost;
    const upgradeProgress =
        upgradeCost === null
            ? 100
            : Math.min(100, (echoes / upgradeCost) * 100);
    const stage = view.stage;

    const tutorial = tutorialSkipped ? null : getTutorialStep(view, echoes);
    const highlight = (target: string) =>
        tutorial?.target === target ? "tutorial-highlight" : "";

    function skipTutorial() {
        setTutorialSkipped(true);
        try {
            localStorage.setItem(tutorialSkipKey(user.id), "1");
        } catch {
            // Stockage indisponible : le tutoriel reviendra au prochain chargement.
        }
    }

    function handleStrike() {
        const gain = forge.strike();
        if (gain <= 0) return;

        setStrikeGainShown(gain);
        setIsStriking(true);
        window.setTimeout(() => setIsStriking(false), 120);
        window.setTimeout(() => setStrikeGainShown(null), 600);
    }

    async function handleUpgrade() {
        if (await forge.buy("STRIKE_POWER")) {
            setShowUpgradeFeedback(true);
            window.setTimeout(() => setShowUpgradeFeedback(false), 1000);
        }
    }

    return (
        <main className="forge-page">
            <header className="forge-header">
                <h1>RELIC FORGE</h1>
                <p>Chaque clic peut révéler une légende.</p>
            </header>

            <div className="forge-account">
                <span>{user.email}</span>
                <button type="button" onClick={onLogout}>
                    Se déconnecter
                </button>
            </div>

            {forge.message && (
                <div role="alert" className="forge-offline-message">
                    <p>{forge.message}</p>
                    <button type="button" onClick={forge.dismissMessage}>
                        Fermer
                    </button>
                </div>
            )}

            <section
                className={`forge forge-stage-${stage} ${isStriking ? "forge-striking" : ""}`}
            >
                <div className="forge-stats-panel">
                    <h2>⚒️ Caractéristiques</h2>
                    <p className="forge-label">
                        {view.stageName.toUpperCase()}
                    </p>
                    <p>
                        Force de Forge : {view.forgeForce} /{" "}
                        {view.maxForgeForce}
                    </p>
                    <p>Stade de Forge : {stage}</p>
                    <p>État de la Forge : {view.stageName}</p>
                    <p>
                        Gain par frappe : +{formatEchoes(forge.strikeGainMilli)}{" "}
                        Écho(s)
                    </p>
                    <p>
                        Production passive :{" "}
                        {view.productionPerSecond.toLocaleString("fr-FR", {
                            maximumFractionDigits: 3,
                        })}{" "}
                        Écho/s
                    </p>
                    <p>
                        Coup critique : {CRITICAL_CHANCE * 100} % (×
                        {CRITICAL_MULTIPLIER})
                    </p>
                </div>

                <div className="forge-center-panel">
                    <ForgeCanvas
                        visualEvents={forge.visualEvents}
                        anchorRef={anvilRef}
                    />
                    {tutorial && (
                        <TutorialBubble step={tutorial} onSkip={skipTutorial} />
                    )}
                    {/* L'enclume est le bouton : PixiJS la dessine sous cette zone. */}
                    <button
                        ref={anvilRef}
                        type="button"
                        className={`forge-anvil-hit ${highlight("core")}`}
                        onClick={handleStrike}
                        aria-label="Frapper la Forge"
                    />
                    <h2>{formatEchoes(echoes)} Échos</h2>
                    {/* Hauteur fixe : les messages de frappe ne font pas bouger l'enclume. */}
                    <div className="forge-feedback">
                        {strikeGainShown !== null && (
                            <span className="strike-gain">
                                +{formatEchoes(strikeGainShown)} Échos
                            </span>
                        )}
                        {forge.criticalFlash > 0 && (
                            <span className="strike-gain strike-gain-critical">
                                CRITIQUE !
                                {forge.criticalFlash > 1
                                    ? ` ×${forge.criticalFlash}`
                                    : ""}
                            </span>
                        )}
                        {showUpgradeFeedback && (
                            <p className="forge-upgrade-feedback">
                                ⚒️ Forge améliorée ! Force +1
                            </p>
                        )}
                    </div>

                    {forge.absenceGainMilli !== null && (
                        <div className="forge-offline-message">
                            <p>
                                Pendant votre absence, la Forge a produit +
                                {formatEchoes(forge.absenceGainMilli)} Échos.
                            </p>
                            <button
                                type="button"
                                onClick={forge.dismissAbsence}
                            >
                                Fermer
                            </button>
                        </div>
                    )}
                </div>

                <div className="forge-upgrades-panel">
                    <h2>🔥 Améliorations</h2>
                    <p>🔥 Braises éveillées possédées : {view.awakenedEmber}</p>
                    <p>
                        {emberUnlocked
                            ? "✅ Braise éveillée débloquée"
                            : `🔒 Braise éveillée : nécessite Force de Forge ${EMBER_REQUIRED_FORCE}`}
                    </p>
                    {emberUnlocked && (
                        <button
                            type="button"
                            className={`forge-ember-button ${highlight("ember")}`}
                            onClick={() => void forge.buy("AWAKENED_EMBER")}
                            disabled={!canBuyEmber}
                        >
                            Acheter une Braise éveillée —{" "}
                            {formatEchoes(emberCost)} Échos
                        </button>
                    )}
                    <div className="forge-upgrade-progress">
                        <p>Progression vers la prochaine amélioration</p>
                        <progress
                            value={upgradeProgress}
                            max={100}
                            aria-label="Progression vers la prochaine amélioration"
                        />
                        <p>{upgradeProgress.toFixed(0)} %</p>
                    </div>
                    <button
                        type="button"
                        className={`forge-upgrade-button ${canUpgrade ? "forge-upgrade-ready" : ""} ${highlight("upgrade")}`}
                        onClick={() => void handleUpgrade()}
                        disabled={!canUpgrade}
                    >
                        {upgradeCost === null
                            ? "Force maximale atteinte"
                            : `Améliorer la Forge — ${formatEchoes(upgradeCost)} Échos`}
                    </button>
                </div>
            </section>
        </main>
    );
}
