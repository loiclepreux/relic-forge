import { useEffect, useState } from "react";
import { fetchCurrentUser, logout, type User } from "./api/authApi";
import { AuthScreen } from "./auth/AuthScreen";
import { ForgeScreen } from "./forge/ForgeScreen";
import "./App.css";

type Session =
    | { status: "checking" }
    | { status: "anonymous" }
    | { status: "connected"; user: User };

/**
 * Racine de l'application : vérifie si le joueur est connecté,
 * puis affiche l'écran de connexion ou la Forge.
 */
function App() {
    const [session, setSession] = useState<Session>({ status: "checking" });

    useEffect(() => {
        fetchCurrentUser()
            .then((user) => setSession({ status: "connected", user }))
            .catch(() => setSession({ status: "anonymous" }));
    }, []);

    async function handleLogout() {
        await logout().catch(() => undefined);
        setSession({ status: "anonymous" });
    }

    if (session.status === "checking") {
        return (
            <main className="forge-page">
                <p className="auth-loading">Ouverture de la Forge…</p>
            </main>
        );
    }

    if (session.status === "anonymous") {
        return (
            <AuthScreen
                onAuthenticated={(user) =>
                    setSession({ status: "connected", user })
                }
            />
        );
    }

    return (
        <ForgeScreen
            user={session.user}
            onLogout={handleLogout}
            onSessionExpired={() => setSession({ status: "anonymous" })}
        />
    );
}

export default App;
