import { useState } from "react";
import {
    calculateForgeUpgradeCost,
    calculateStrikeGain,
} from "./game/forgeEconomy";
import "./App.css";

function App() {
    const [echoes, setEchoes] = useState(0);
    const [forgeForce, setForgeForce] = useState(0);

    const baseStrikeGain = 1;
    const strikeGain = calculateStrikeGain(baseStrikeGain, forgeForce);
    const forgeUpgradeCost = calculateForgeUpgradeCost(forgeForce);

    const displayedEchoes = echoes.toFixed(2);
    const displayedStrikeGain = strikeGain.toFixed(2);

    function strikeForge() {
        setEchoes((currentEchoes) => currentEchoes + strikeGain);
    }

    function upgradeForge() {
        if (echoes < forgeUpgradeCost) {
            return;
        }

        setEchoes((currentEchoes) => currentEchoes - forgeUpgradeCost);
        setForgeForce((currentForce) => currentForce + 1);
    }

    return (
        <main className="forge-page">
            <header className="forge-header">
                <h1>RELIC FORGE</h1>
                <p>Chaque clic peut révéler une légende.</p>
            </header>

            <section className="forge">
                <p className="forge-label">FORGE PRIMORDIALE</p>

                <p>Force de Forge : {forgeForce}</p>

                <p>Gain par frappe : +{displayedStrikeGain} Écho</p>

                <h2>
                    {displayedEchoes} {echoes > 1 ? "Échos" : "Écho"}
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
                    disabled={echoes < forgeUpgradeCost}
                >
                    Améliorer la Forge — {forgeUpgradeCost} Échos
                </button>
            </section>
        </main>
    );
}

export default App;
