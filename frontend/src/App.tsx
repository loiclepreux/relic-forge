import { useState, useEffect, useRef } from "react";
import {
    calculateForgeUpgradeCost,
    calculateStrikeGain,
    calculatePassiveProduction,
    calculateOfflineGain,
    normalizeEchoes,
    getForgeStage,
    getForgeStageName,
    isCriticalStrike,
} from "./game/forgeEconomy";
import { initialForgeState } from "./game/forgeState";
import {
    loadForgeState,
    saveForgeState,
    calculateOfflineSeconds,
} from "./game/forgeSave";
import { strikeForge, upgradeForge, resetForge } from "./game/forgeActions";
import "./App.css";

function loadInitialForge() {
    const loadedSave = loadForgeState();

    if (loadedSave === null) {
        return {
            forge: initialForgeState,
            offlineGain: 0,
        };
    }

    const offlineSeconds = calculateOfflineSeconds(loadedSave.savedAt);

    const offlineProduction = calculatePassiveProduction(
        loadedSave.forge.forgeForce,
    );

    const offlineGain = calculateOfflineGain(offlineProduction, offlineSeconds);

    return {
        forge: {
            ...loadedSave.forge,
            echoes: normalizeEchoes(loadedSave.forge.echoes + offlineGain),
        },
        offlineGain,
    };
}

function App() {
    const [initialData] = useState(loadInitialForge);
    const [forge, setForge] = useState(initialData.forge);
    const [isStriking, setIsStriking] = useState(false);
    const [showStrikeGain, setShowStrikeGain] = useState(false);
    const [showCriticalStrike, setShowCriticalStrike] = useState(false);
    const [lastStrikeGain, setLastStrikeGain] = useState(0);
    const [showUpgradeFeedback, setShowUpgradeFeedback] = useState(false);
    const [impactRings, setImpactRings] = useState<number[]>([]);
    const impactRingIdRef = useRef(0);
    const [offlineGainMessage, setOfflineGainMessage] = useState<number | null>(
        initialData.offlineGain > 0 ? initialData.offlineGain : null,
    );
    const isFirstSave = useRef(true);
    const baseStrikeGain = 1;
    const strikeGain = calculateStrikeGain(baseStrikeGain, forge.forgeForce);
    const forgeUpgradeCost = calculateForgeUpgradeCost(forge.forgeForce);
    const upgradeProgress = Math.min(
        100,
        (forge.echoes / forgeUpgradeCost) * 100,
    );
    const canUpgradeForge = forge.echoes >= forgeUpgradeCost;
    const passiveProduction = calculatePassiveProduction(forge.forgeForce);
    const displayedEchoes = forge.echoes.toFixed(2);
    const displayedStrikeGain = strikeGain.toFixed(2);
    const forgeStage = getForgeStage(forge.forgeForce);
    const forgeStageName = getForgeStageName(forgeStage);

    useEffect(() => {
        if (isFirstSave.current) {
            isFirstSave.current = false;
            return;
        }

        saveForgeState(forge);
    }, [forge]);

    useEffect(() => {
        const interval = setInterval(() => {
            setForge((currentForge) => ({
                ...currentForge,
                echoes: normalizeEchoes(
                    currentForge.echoes + passiveProduction,
                ),
            }));
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [passiveProduction]);

    function handleStrike() {
        setIsStriking(true);
        setShowStrikeGain(true);

        const newRingId = ++impactRingIdRef.current;

        setImpactRings((currentRings) => [...currentRings, newRingId]);

        window.setTimeout(() => {
            setImpactRings((currentRings) =>
                currentRings.filter((ringId) => ringId !== newRingId),
            );
        }, 350);

        const critical = isCriticalStrike();

        setShowCriticalStrike(critical);

        if (critical) {
            window.setTimeout(() => {
                setShowCriticalStrike(false);
            }, 600);
        }

        const actualStrikeGain = critical
            ? Math.round(strikeGain * 2 * 100) / 100
            : strikeGain;

        setLastStrikeGain(actualStrikeGain);

        setForge((currentForge) =>
            strikeForge(currentForge, baseStrikeGain, critical),
        );

        window.setTimeout(() => {
            setIsStriking(false);
        }, 120);

        window.setTimeout(() => {
            setShowStrikeGain(false);
        }, 600);
    }

    function handleUpgrade() {
        if (!canUpgradeForge) {
            return;
        }

        setForge((currentForge) => upgradeForge(currentForge));

        setShowUpgradeFeedback(true);

        window.setTimeout(() => {
            setShowUpgradeFeedback(false);
        }, 1000);
    }

    function handleReset() {
        const shouldReset = window.confirm(
            "Réinitialiser complètement la Forge ? Cette action effacera la progression actuelle.",
        );

        if (!shouldReset) {
            return;
        }

        setForge(resetForge());
    }

    return (
        <main className="forge-page">
            <header className="forge-header">
                <h1>RELIC FORGE</h1>
                <p>Chaque clic peut révéler une légende.</p>
            </header>

            <section
                className={`forge forge-stage-${forgeStage} ${
                    isStriking ? "forge-striking" : ""
                }`}
            >
                <div className="forge-stats-panel">
                    <h2>⚒️ Caractéristiques</h2>

                    <p className="forge-label">
                        {forgeStageName.toUpperCase()}
                    </p>

                    <p>Force de Forge : {forge.forgeForce}</p>
                    <p>Stade de Forge : {forgeStage}</p>
                    <p>État de la Forge : {forgeStageName}</p>

                    <p>Gain par frappe : +{displayedStrikeGain} Écho</p>
                    <p>
                        Production passive : {passiveProduction.toFixed(2)}{" "}
                        Écho/s
                    </p>
                </div>

                <div className="forge-center-panel">
                    <button
                        type="button"
                        className={`forge-core forge-core-stage-${forgeStage} ${
                            isStriking ? "forge-core-striking" : ""
                        }`}
                        onClick={handleStrike}
                        aria-label="Frapper la Forge"
                    >
                        {impactRings.map((ringId) => (
                            <span
                                key={ringId}
                                className={`forge-impact-ring forge-impact-ring-active forge-impact-ring-stage-${forgeStage}`}
                                aria-hidden="true"
                            />
                        ))}
                        <span className="forge-core-symbol">✦</span>
                    </button>

                    <button
                        type="button"
                        className={`forge-button forge-button-stage-${forgeStage}`}
                        onClick={handleStrike}
                    >
                        Frapper
                    </button>

                    <h2>
                        {displayedEchoes} {forge.echoes > 1 ? "Échos" : "Écho"}
                    </h2>

                    {offlineGainMessage !== null && (
                        <div className="forge-offline-message">
                            <p>
                                Pendant votre absence, la Forge a produit +
                                {offlineGainMessage.toFixed(2)} Échos.
                            </p>

                            <button
                                type="button"
                                onClick={() => setOfflineGainMessage(null)}
                            >
                                Fermer
                            </button>
                        </div>
                    )}

                    {showStrikeGain && !showCriticalStrike && (
                        <span className="strike-gain">
                            +{lastStrikeGain.toFixed(2)} Échos
                        </span>
                    )}

                    {showCriticalStrike && (
                        <p className="forge-critical-feedback">
                            ⚡ COUP CRITIQUE !
                            <span className="forge-critical-gain">
                                +{lastStrikeGain.toFixed(2)} Échos
                            </span>
                        </p>
                    )}

                    {showUpgradeFeedback && (
                        <p className="forge-upgrade-feedback">
                            ⚒️ Forge améliorée ! Force +1
                        </p>
                    )}
                </div>

                <div className="forge-upgrades-panel">
                    <h2>🔥 Améliorations</h2>

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
                        className={canUpgradeForge ? "forge-upgrade-ready" : ""}
                        onClick={handleUpgrade}
                        disabled={!canUpgradeForge}
                    >
                        Améliorer la Forge — {forgeUpgradeCost} Échos
                    </button>

                    <button type="button" onClick={handleReset}>
                        Reset Forge (DEV)
                    </button>
                </div>
            </section>
        </main>
    );
}

export default App;
