import { useState } from "react";
import {
    calculateForgeUpgradeCost,
    calculateStrikeGain,
} from "./game/forgeEconomy";
import { initialForgeState } from "./game/forgeState";
import "./App.css";

function App() {
    const [forge, setForge] = useState(initialForgeState);

    const baseStrikeGain = 1;
    const strikeGain = calculateStrikeGain(baseStrikeGain, forge.forgeForce);
    const forgeUpgradeCost = calculateForgeUpgradeCost(forge.forgeForce);

    const displayedEchoes = forge.echoes.toFixed(2);
    const displayedStrikeGain = strikeGain.toFixed(2);

    function strikeForge() {
        setForge((currentForge) => ({
            ...currentForge,
            echoes: currentForge.echoes + strikeGain,
        }));
    }

    function upgradeForge() {
        if (forge.echoes < forgeUpgradeCost) {
            return;
        }

        setForge((currentForge) => ({
            ...currentForge,
            echoes: currentForge.echoes - forgeUpgradeCost,
            forgeForce: currentForge.forgeForce + 1,
        }));
    }

    return (
        <main className="forge-page">
            <header className="forge-header">
                <h1>RELIC FORGE</h1>
                <p>Chaque clic peut révéler une légende.</p>
            </header>

            <section className="forge">
                <p className="forge-label">FORGE PRIMORDIALE</p>

                <p>Force de Forge : {forge.forgeForce}</p>

                <p>Gain par frappe : +{displayedStrikeGain} Écho</p>

                <h2>
                    {displayedEchoes} {forge.echoes > 1 ? "Échos" : "Écho"}
                </h2>

                <button
                    type="button"
                    className="forge-button"
                    onClick={strikeForge}
                >
                    Frapper
                </button>

                <button
                    type="button"
                    onClick={upgradeForge}
                    disabled={forge.echoes < forgeUpgradeCost}
                >
                    Améliorer la Forge — {forgeUpgradeCost} Échos
                </button>
            </section>
        </main>
    );
}

export default App;
