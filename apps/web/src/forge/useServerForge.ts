import { useCallback, useEffect, useRef, useState } from "react";
import {
    calculateStrikeGainMilli,
    checkStrikeLimit,
    type StrikeWindow,
} from "@relic-forge/game-engine";
import { ApiError, newRequestId } from "../api/client";
import {
    buyUpgrade,
    fetchForge,
    sendStrikeBatch,
    type ForgeView,
    type UpgradeKey,
} from "../api/forgeApi";

// ---------------------------------------------------------------
// Lien entre l'écran et le serveur. Le serveur décide de tout ;
// l'écran affiche une estimation immédiate pour rester réactif,
// puis se recale sur la réponse du serveur.
// ---------------------------------------------------------------

/** Les frappes sont envoyées par lots toutes les 2 secondes. */
const STRIKE_FLUSH_MS = 2_000;
/** Taille maximale d'un lot (le serveur refuse au-delà). */
const MAX_STRIKES_PER_BATCH = 20;
/** Signal « je suis là » tant que l'onglet est visible. */
const HEARTBEAT_MS = 15_000;
/** Au-delà, le serveur considère le joueur absent (50 %, 8 h max). */
const ABSENCE_THRESHOLD_MS = 60_000;
/** Pas de message d'absence pour moins d'1 Écho. */
const MIN_ABSENCE_MESSAGE_MILLI = 1_000;

type ServerState = { view: ForgeView; receivedAt: number };
type PendingBatch = { requestId: string; count: number };

export function useServerForge(onSessionExpired: () => void) {
    const [server, setServer] = useState<ServerState | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [unconfirmedStrikes, setUnconfirmedStrikes] = useState(0);
    const [criticalFlash, setCriticalFlash] = useState(0);
    const [absenceGainMilli, setAbsenceGainMilli] = useState<number | null>(
        null,
    );
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const serverRef = useRef<ServerState | null>(null);
    const pendingRef = useRef(0);
    const retryRef = useRef<PendingBatch | null>(null);
    const inFlightRef = useRef<Promise<void> | null>(null);
    const clientWindowRef = useRef<StrikeWindow>({ startedAt: 0, count: 0 });
    const hiddenAtRef = useRef<number | null>(null);
    const expiredRef = useRef(onSessionExpired);

    useEffect(() => {
        expiredRef.current = onSessionExpired;
    }, [onSessionExpired]);

    const applyServer = useCallback((view: ForgeView) => {
        const next = { view, receivedAt: Date.now() };
        serverRef.current = next;
        setServer(next);
    }, []);

    const handleError = useCallback((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
            expiredRef.current();
            return;
        }
        setMessage(
            error instanceof ApiError ? error.message : "Erreur inattendue.",
        );
    }, []);

    /** Envoie les frappes en attente (un seul envoi à la fois). */
    const flush = useCallback((): Promise<void> => {
        if (inFlightRef.current) return inFlightRef.current;

        let batch = retryRef.current;
        if (!batch) {
            if (pendingRef.current === 0) return Promise.resolve();
            const count = Math.min(pendingRef.current, MAX_STRIKES_PER_BATCH);
            pendingRef.current -= count;
            batch = { requestId: newRequestId(), count };
        }
        const sent = batch;

        const request = sendStrikeBatch(sent.requestId, sent.count)
            .then((response) => {
                retryRef.current = null;
                applyServer(response.forge);
                if (response.result && response.result.criticals > 0) {
                    setCriticalFlash(response.result.criticals);
                    window.setTimeout(() => setCriticalFlash(0), 900);
                }
            })
            .catch((error: unknown) => {
                // Serveur injoignable : on renverra le même lot (même
                // identifiant), il ne sera jamais compté deux fois.
                if (error instanceof ApiError && error.status === 0) {
                    retryRef.current = sent;
                } else {
                    retryRef.current = null;
                    handleError(error);
                }
            })
            .finally(() => {
                inFlightRef.current = null;
                setUnconfirmedStrikes(
                    pendingRef.current + (retryRef.current?.count ?? 0),
                );
            });

        inFlightRef.current = request;
        return request;
    }, [applyServer, handleError]);

    /** Recharge l'état depuis le serveur (sert aussi de signal de présence). */
    const refresh = useCallback(async () => {
        try {
            const before = serverRef.current;
            const response = await fetchForge();
            applyServer(response.forge);
            return { before, after: response.forge };
        } catch (error) {
            handleError(error);
            return null;
        }
    }, [applyServer, handleError]);

    // Premier chargement.
    useEffect(() => {
        fetchForge()
            .then((response) => applyServer(response.forge))
            .catch(handleError);
    }, [applyServer, handleError]);

    // Horloge d'affichage (production qui monte en douceur).
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 250);
        return () => window.clearInterval(id);
    }, []);

    // Envoi des frappes toutes les 2 secondes.
    useEffect(() => {
        const id = window.setInterval(() => void flush(), STRIKE_FLUSH_MS);
        return () => window.clearInterval(id);
    }, [flush]);

    // Signal de présence toutes les 15 secondes, onglet visible seulement.
    useEffect(() => {
        const id = window.setInterval(() => {
            if (
                document.visibilityState === "visible" &&
                !inFlightRef.current
            ) {
                void refresh();
            }
        }, HEARTBEAT_MS);
        return () => window.clearInterval(id);
    }, [refresh]);

    // Onglet caché = hors ligne (V9) : on se signale en partant et en revenant.
    useEffect(() => {
        const onVisibilityChange = async () => {
            if (document.visibilityState === "hidden") {
                hiddenAtRef.current = Date.now();
                void flush();
                return;
            }

            const hiddenAt = hiddenAtRef.current;
            hiddenAtRef.current = null;
            const result = await refresh();
            if (
                result?.before &&
                hiddenAt !== null &&
                Date.now() - hiddenAt > ABSENCE_THRESHOLD_MS
            ) {
                const gain =
                    result.after.echoesMilli - result.before.view.echoesMilli;
                if (gain >= MIN_ABSENCE_MESSAGE_MILLI)
                    setAbsenceGainMilli(gain);
            }
        };
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () =>
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
    }, [flush, refresh]);

    /**
     * Un clic sur la Forge. Renvoie le gain estimé (0 si la frappe dépasse
     * la limite de 5 par seconde : le serveur l'ignorerait de toute façon).
     */
    const strike = useCallback((): number => {
        const current = serverRef.current;
        if (!current) return 0;

        const check = checkStrikeLimit(clientWindowRef.current, Date.now());
        clientWindowRef.current = check.strikeWindow;
        if (!check.allowed) return 0;

        pendingRef.current++;
        setUnconfirmedStrikes((n) => n + 1);
        return calculateStrikeGainMilli(
            1,
            current.view.forgeForce,
            current.view.productionPerSecond,
        );
    }, []);

    /** Achat : on envoie d'abord les frappes en attente, puis l'achat. */
    const buy = useCallback(
        async (upgradeKey: UpgradeKey): Promise<boolean> => {
            setBusy(true);
            setMessage(null);
            try {
                await flush();
                const response = await buyUpgrade(newRequestId(), upgradeKey);
                applyServer(response.forge);
                return true;
            } catch (error) {
                handleError(error);
                return false;
            } finally {
                setBusy(false);
            }
        },
        [applyServer, flush, handleError],
    );

    // ---- Valeurs affichées ----
    const view = server?.view ?? null;
    const strikeGainMilli = view
        ? calculateStrikeGainMilli(1, view.forgeForce, view.productionPerSecond)
        : 0;
    // Production écoulée depuis la dernière réponse (au plus 30 s :
    // au-delà, on attend la prochaine réponse du serveur).
    const productionSinceMilli = server
        ? Math.floor(
              server.view.productionPerSecond *
                  Math.max(
                      0,
                      Math.min(now - server.receivedAt, HEARTBEAT_MS * 2),
                  ),
          )
        : 0;
    const displayedEchoesMilli = view
        ? view.echoesMilli +
          unconfirmedStrikes * strikeGainMilli +
          productionSinceMilli
        : 0;

    return {
        view,
        displayedEchoesMilli,
        strikeGainMilli,
        criticalFlash,
        absenceGainMilli,
        dismissAbsence: () => setAbsenceGainMilli(null),
        message,
        dismissMessage: () => setMessage(null),
        busy,
        strike,
        buy,
    };
}
