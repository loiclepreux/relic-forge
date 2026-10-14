import { useState, useEffect, useRef } from "react";
import {
    calculateForgeUpgradeCost,
    calculateStrikeGain,
    calculatePassiveProduction,
    calculateOfflineGain,
    normalizeEchoes,
    getForgeStage,
    getForgeStageName,
} from "./game/forgeEconomy";
import { initialForgeState } from "./game/forgeState";
import {
    loadForgeState,
    saveForgeState,
    calculateOfflineSeconds,
} from "./game/forgeSave";
import { strikeForge, upgradeForge, resetForge } from "./game/forgeActions";
import "./App.css";

function App() {
    const [forge, setForge] = useState(() => {
        const loadedSave = loadForgeState();

        if (loadedSave === null) {
            return initialForgeState;
        }

        const offlineSeconds = calculateOfflineSeconds(loadedSave.savedAt);

        const offlineProduction = calculatePassiveProduction(
            loadedSave.forge.forgeForce,
        );

        const offlineGain = calculateOfflineGain(
            offlineProduction,
            offlineSeconds,
        );

        return {
            ...loadedSave.forge,
            echoes: normalizeEchoes(loadedSave.forge.echoes + offlineGain),
        };
    });

    const [isStriking, setIsStriking] = useState(false);
    const [showStrikeGain, setShowStrikeGain] = useState(false);
    const [impactRings, setImpactRings] = useState<number[]>([]);
    const impactRingIdRef = useRef(0);
    const isFirstSave = useRef(true);
    const baseStrikeGain = 1;
    const strikeGain = calculateStrikeGain(baseStrikeGain, forge.forgeForce);
    const forgeUpgradeCost = calculateForgeUpgradeCost(forge.forgeForce);
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

        setForge((currentForge) => strikeForge(currentForge, baseStrikeGain));

        window.setTimeout(() => {
            setIsStriking(false);
        }, 120);

        window.setTimeout(() => {
            setShowStrikeGain(false);
        }, 600);
    }

    function handleUpgrade() {
        setForge((currentForge) => upgradeForge(currentForge));
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
                <p className="forge-label">{forgeStageName.toUpperCase()}</p>

                <p>Force de Forge : {forge.forgeForce}</p>
                <p>Stade de Forge : {forgeStage}</p>
                <p>État de la Forge : {forgeStageName}</p>

                <p>Gain par frappe : +{displayedStrikeGain} Écho</p>
                <p>
                    Production passive : {passiveProduction.toFixed(2)} Écho/s
                </p>

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

                <h2>
                    {displayedEchoes} {forge.echoes > 1 ? "Échos" : "Écho"}
                </h2>

                {showStrikeGain && (
                    <span className="strike-gain">
                        +{displayedStrikeGain} Écho
                    </span>
                )}

                <button
                    type="button"
                    className={`forge-button forge-button-stage-${forgeStage}`}
                    onClick={handleStrike}
                >
                    Frapper
                </button>

                <button
                    type="button"
                    onClick={handleUpgrade}
                    disabled={forge.echoes < forgeUpgradeCost}
                >
                    Améliorer la Forge — {forgeUpgradeCost} Échos
                </button>

                <button type="button" onClick={handleReset}>
                    Reset Forge (DEV)
                </button>
            </section>
        </main>
    );
}

export default App;
