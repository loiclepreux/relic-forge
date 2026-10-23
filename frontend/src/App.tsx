import { useEffect, useRef, useState } from "react";
import {
    calculateForgeUpgradeCostMilli,
    calculateProducerProduction,
    calculateAwakenedEmberCostMilli,
    calculateStrikeGainMilli,
    calculateOfflineGainMilliV2,
    getForgeStage,
    getForgeStageName,
} from "./game/forgeEconomy";
import { createInitialForgeStateV2 } from "./game/forgeState";
import {
    loadForgeStateV2Safe,
    canAutoSaveForgeV2,
    saveForgeStateV2,
} from "./game/forgeSave";
import type { StrikeWindow } from "./game/forgeActionsV2";
import {
    strikeForgeWithProductionV2,
    upgradeForgeWithProductionV2,
    buyAwakenedEmberWithProductionV2,
    accrueProductionV2,
} from "./game/forgeActionsV2";
import "./App.css";

function loadInitialForgeV2() {
    const result = loadForgeStateV2Safe();
    const autoSaveAllowed = canAutoSaveForgeV2(result.status);

    if (result.status === "loaded") {
        const loadedForge = result.data.forge;
        const now = Date.now();
        if (loadedForge.lastProductionAt > now) {
            return {
                forge: loadedForge,
                autoSaveAllowed: false,
                loadError: true,
                offlineGainMilli: 0,
            };
        }
        const elapsed = Math.max(0, now - loadedForge.lastProductionAt);
        const production = calculateProducerProduction(loadedForge.producers);
        const gain = calculateOfflineGainMilliV2(production, elapsed);
        if (
            !Number.isSafeInteger(gain) ||
            gain < 0 ||
            gain > Number.MAX_SAFE_INTEGER - loadedForge.echoesMilli
        ) {
            return {
                forge: loadedForge,
                autoSaveAllowed: false,
                loadError: true,
                offlineGainMilli: 0,
            };
        }
        return {
            forge: {
                ...loadedForge,
                echoesMilli: loadedForge.echoesMilli + gain,
                productionRemainderMilli: 0,
                lastProductionAt: now,
            },
            autoSaveAllowed,
            loadError: false,
            offlineGainMilli: gain,
        };
    }

    return {
        forge: createInitialForgeStateV2(),
        autoSaveAllowed,
        loadError: result.status !== "missing",
        offlineGainMilli: 0,
    };
}

const formatEchoes = (milli: number) =>
    (milli / 1000).toLocaleString("fr-FR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    });

function App() {
    const [initialData] = useState(loadInitialForgeV2);
    const [forge, setForge] = useState(initialData.forge);
    const forgeRef = useRef(forge);
    const strikeWindowRef = useRef<StrikeWindow>({ startedAt: 0, count: 0 });
    const [isStriking, setIsStriking] = useState(false);
    const [showStrikeGain, setShowStrikeGain] = useState(false);
    const [lastStrikeGainMilli, setLastStrikeGainMilli] = useState(0);
    const [showUpgradeFeedback, setShowUpgradeFeedback] = useState(false);
    const [impactRings, setImpactRings] = useState<number[]>([]);
    const impactRingIdRef = useRef(0);
    const [offlineGainMessage, setOfflineGainMessage] = useState<number | null>(
        initialData.offlineGainMilli > 0 ? initialData.offlineGainMilli : null,
    );

    const blocked = initialData.loadError;
    const stage = getForgeStage(forge.forgeForce);
    const stageName = getForgeStageName(stage);
    const production = calculateProducerProduction(forge.producers);
    const upgradeCost = calculateForgeUpgradeCostMilli(forge.forgeForce);
    const emberCost = calculateAwakenedEmberCostMilli(
        forge.producers.awakenedEmber,
    );
    const emberUnlocked = forge.forgeForce >= 2;
    const canUpgrade =
        !blocked &&
        Number.isSafeInteger(upgradeCost) &&
        upgradeCost >= 0 &&
        forge.echoesMilli >= upgradeCost;
    const canBuyEmber =
        !blocked &&
        emberUnlocked &&
        Number.isSafeInteger(emberCost) &&
        emberCost >= 0 &&
        forge.echoesMilli >= emberCost;
    const upgradeProgress =
        Number.isSafeInteger(upgradeCost) && upgradeCost > 0
            ? Math.min(100, (forge.echoesMilli / upgradeCost) * 100)
            : 0;
    const theoreticalStrikeGain = calculateStrikeGainMilli(
        1,
        forge.forgeForce,
        production,
        1,
    );

    useEffect(() => {
        if (blocked) return;
        const interval = window.setInterval(() => {
            const updated = accrueProductionV2(forgeRef.current, Date.now());
            forgeRef.current = updated;
            setForge(updated);
        }, 1000);
        return () => window.clearInterval(interval);
    }, [blocked]);

    useEffect(() => {
        if (!initialData.autoSaveAllowed || blocked) return;
        const interval = window.setInterval(() => {
            saveForgeStateV2(forgeRef.current);
        }, 5000);
        return () => window.clearInterval(interval);
    }, [initialData.autoSaveAllowed, blocked]);

    useEffect(() => {
        if (!initialData.autoSaveAllowed || blocked) return;
        const save = () => {
            saveForgeStateV2(forgeRef.current);
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === "hidden") save();
        };
        window.addEventListener("pagehide", save);
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            window.removeEventListener("pagehide", save);
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
        };
    }, [initialData.autoSaveAllowed, blocked]);

    function handleStrike() {
        if (blocked) return;
        const result = strikeForgeWithProductionV2(
            forgeRef.current,
            strikeWindowRef.current,
            Date.now(),
        );
        strikeWindowRef.current = result.strikeWindow;
        if (result.gainMilli <= 0) return;
        forgeRef.current = result.forge;
        setForge(result.forge);
        setLastStrikeGainMilli(result.gainMilli);
        setIsStriking(true);
        setShowStrikeGain(true);
        const ringId = ++impactRingIdRef.current;
        setImpactRings((rings) => [...rings, ringId]);
        window.setTimeout(
            () =>
                setImpactRings((rings) => rings.filter((id) => id !== ringId)),
            350,
        );
        window.setTimeout(() => setIsStriking(false), 120);
        window.setTimeout(() => setShowStrikeGain(false), 600);
    }

    function handleUpgrade() {
        if (!canUpgrade) return;
        const updated = upgradeForgeWithProductionV2(
            forgeRef.current,
            Date.now(),
        );
        if (updated.forgeForce === forgeRef.current.forgeForce) return;
        forgeRef.current = updated;
        setForge(updated);
        setShowUpgradeFeedback(true);
        window.setTimeout(() => setShowUpgradeFeedback(false), 1000);
    }

    function handleBuyEmber() {
        if (!canBuyEmber) return;
        const updated = buyAwakenedEmberWithProductionV2(
            forgeRef.current,
            Date.now(),
        );
        forgeRef.current = updated;
        setForge(updated);
    }

    return (
        <main className="forge-page">
            <header className="forge-header">
                <h1>RELIC FORGE</h1>
                <p>Chaque clic peut révéler une légende.</p>
            </header>

            {blocked && (
                <p role="alert" className="forge-offline-message">
                    Impossible de charger la sauvegarde en toute sécurité. La
                    Forge est bloquée pour éviter d'écraser ta progression.
                </p>
            )}

            <section
                className={`forge forge-stage-${stage} ${isStriking ? "forge-striking" : ""}`}
            >
                <div className="forge-stats-panel">
                    <h2>⚒️ Caractéristiques</h2>
                    <p className="forge-label">{stageName.toUpperCase()}</p>
                    <p>Force de Forge : {forge.forgeForce}</p>
                    <p>Stade de Forge : {stage}</p>
                    <p>État de la Forge : {stageName}</p>
                    <p>
                        Gain par frappe : +{formatEchoes(theoreticalStrikeGain)}{" "}
                        Écho(s)
                    </p>
                    <p>
                        Production passive :{" "}
                        {production.toLocaleString("fr-FR", {
                            maximumFractionDigits: 3,
                        })}{" "}
                        Écho/s
                    </p>
                </div>

                <div className="forge-center-panel">
                    <button
                        type="button"
                        className={`forge-core forge-core-stage-${stage} ${isStriking ? "forge-core-striking" : ""}`}
                        onClick={handleStrike}
                        disabled={blocked}
                        aria-label="Frapper la Forge"
                    >
                        {impactRings.map((id) => (
                            <span
                                key={id}
                                className={`forge-impact-ring forge-impact-ring-active forge-impact-ring-stage-${stage}`}
                                aria-hidden="true"
                            />
                        ))}
                        <span className="forge-core-symbol">✦</span>
                    </button>
                    <button
                        type="button"
                        className={`forge-button forge-button-stage-${stage}`}
                        onClick={handleStrike}
                        disabled={blocked}
                    >
                        Frapper
                    </button>
                    <h2>{formatEchoes(forge.echoesMilli)} Échos</h2>

                    {offlineGainMessage !== null && (
                        <div className="forge-offline-message">
                            <p>
                                Pendant votre absence, la Forge a produit +
                                {formatEchoes(offlineGainMessage)} Échos.
                            </p>
                            <button
                                type="button"
                                onClick={() => setOfflineGainMessage(null)}
                            >
                                Fermer
                            </button>
                        </div>
                    )}
                    {showStrikeGain && (
                        <span className="strike-gain">
                            +{formatEchoes(lastStrikeGainMilli)} Échos
                        </span>
                    )}
                    {showUpgradeFeedback && (
                        <p className="forge-upgrade-feedback">
                            ⚒️ Forge améliorée ! Force +1
                        </p>
                    )}
                </div>

                <div className="forge-upgrades-panel">
                    <h2>🔥 Améliorations</h2>
                    <p>
                        🔥 Braises éveillées possédées :{" "}
                        {forge.producers.awakenedEmber}
                    </p>
                    <p>
                        {emberUnlocked
                            ? "✅ Braise éveillée débloquée"
                            : "🔒 Braise éveillée : nécessite Force de Forge 2"}
                    </p>
                    {emberUnlocked && (
                        <>
                            <p>
                                Prix de la prochaine Braise éveillée :{" "}
                                {formatEchoes(emberCost)} Échos
                            </p>
                            <button
                                type="button"
                                onClick={handleBuyEmber}
                                disabled={!canBuyEmber}
                            >
                                Acheter une Braise éveillée —{" "}
                                {formatEchoes(emberCost)} Échos
                            </button>
                        </>
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
                        className={canUpgrade ? "forge-upgrade-ready" : ""}
                        onClick={handleUpgrade}
                        disabled={!canUpgrade}
                    >
                        Améliorer la Forge — {formatEchoes(upgradeCost)} Échos
                    </button>
                </div>
            </section>
        </main>
    );
}

export default App;
