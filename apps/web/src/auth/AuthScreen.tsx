import { useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { login, register, type User } from "../api/authApi";

type Mode = "login" | "register";

type Props = {
    onAuthenticated: (user: User) => void;
};

/** Écran de connexion et d'inscription. */
export function AuthScreen({ onAuthenticated }: Props) {
    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const user =
                mode === "login"
                    ? await login(email, password)
                    : await register(email, password);
            onAuthenticated(user);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "Erreur inattendue.");
        } finally {
            setBusy(false);
        }
    }

    function switchMode() {
        setMode(mode === "login" ? "register" : "login");
        setError(null);
    }

    return (
        <main className="forge-page">
            <header className="forge-header">
                <h1>RELIC FORGE</h1>
                <p>Chaque clic peut révéler une légende.</p>
            </header>

            <form className="auth-panel" onSubmit={handleSubmit}>
                <h2>{mode === "login" ? "Connexion" : "Créer un compte"}</h2>

                <label>
                    Adresse e-mail
                    <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </label>

                <label>
                    Mot de passe
                    <input
                        type="password"
                        autoComplete={
                            mode === "login"
                                ? "current-password"
                                : "new-password"
                        }
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </label>

                {error && (
                    <p role="alert" className="auth-error">
                        {error}
                    </p>
                )}

                <button type="submit" disabled={busy}>
                    {busy
                        ? "Un instant…"
                        : mode === "login"
                          ? "Entrer dans la Forge"
                          : "Créer mon compte"}
                </button>

                <button
                    type="button"
                    className="auth-switch"
                    onClick={switchMode}
                >
                    {mode === "login"
                        ? "Pas encore de compte ? Créer un compte"
                        : "Déjà un compte ? Se connecter"}
                </button>
            </form>
        </main>
    );
}
