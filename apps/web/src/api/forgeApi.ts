import { apiFetch } from "./client";

/** État de la Forge tel que calculé par le serveur. */
export type ForgeView = {
    echoesMilli: number;
    forgeForce: number;
    maxForgeForce: number;
    awakenedEmber: number;
    productionPerSecond: number;
    nextUpgradeCostMilli: number | null;
    nextEmberCostMilli: number;
    stage: number;
    stageName: string;
    serverTime: number;
};

export type StrikeBatchResult = {
    accepted: number;
    ignored: number;
    gainMilli: number;
    criticals: number;
};

export type UpgradeKey = "STRIKE_POWER" | "AWAKENED_EMBER";

type ForgeResponse<T = undefined> = {
    forge: ForgeView;
    result?: T;
    duplicate?: boolean;
};

export function fetchForge() {
    return apiFetch<ForgeResponse>("/forge");
}

export function sendStrikeBatch(requestId: string, count: number) {
    return apiFetch<ForgeResponse<StrikeBatchResult>>("/forge/strike-batch", {
        method: "POST",
        body: { requestId, count },
    });
}

export function buyUpgrade(requestId: string, upgradeKey: UpgradeKey) {
    return apiFetch<ForgeResponse<{ upgradeKey: UpgradeKey }>>(
        "/forge/upgrades",
        { method: "POST", body: { requestId, upgradeKey } },
    );
}
