import { randomUUID } from "node:crypto";
import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import type { ForgeState, StrikeWindow } from "@relic-forge/game-engine";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "../generated/prisma/client";
import {
    toEngineState,
    toRecord,
    toView,
    type ForgeRecord,
    type ForgeView,
} from "./forge-mapper";
import {
    applyPurchase,
    applyStrikeBatch,
    syncProduction,
    type StrikeBatchResult,
    type UpgradeKey,
} from "./forge-rules";

type Tx = Prisma.TransactionClient;

/** Ce que renvoie chaque action : l'état à jour + le détail de l'action. */
export type ForgeResponse<T = undefined> = {
    forge: ForgeView;
    result?: T;
    /** Vrai si la même demande avait déjà été traitée (rien n'a été refait). */
    duplicate?: boolean;
};

/** Résultat d'une action appliquée par le moteur. */
type ActionOutcome<T> = {
    forge: ForgeState;
    strikeWindow: StrikeWindow;
    result?: T;
};

/** Levée quand une autre requête a modifié la Forge en même temps. */
class ConcurrentUpdate extends Error {}

const MAX_ATTEMPTS = 3;

@Injectable()
export class ForgeService {
    constructor(
        @Inject(PrismaService) private readonly prisma: PrismaService,
    ) {}

    /** État de la Forge (verse au passage la production écoulée). */
    getState(userId: string): Promise<ForgeResponse> {
        return this.run(userId, "SYNC", null, (forge, strikeWindow) => ({
            forge,
            strikeWindow,
        }));
    }

    /** Applique un lot de frappes. */
    strike(
        userId: string,
        requestId: string,
        count: number,
    ): Promise<ForgeResponse<StrikeBatchResult>> {
        return this.run(
            userId,
            "STRIKE_BATCH",
            requestId,
            (forge, window, now) => applyStrikeBatch(forge, window, count, now),
        );
    }

    /** Achète une amélioration de Forge ou une Braise éveillée. */
    buy(
        userId: string,
        requestId: string,
        upgradeKey: UpgradeKey,
    ): Promise<ForgeResponse<{ upgradeKey: UpgradeKey }>> {
        return this.run(userId, "PURCHASE", requestId, (forge, window, now) => {
            const next = applyPurchase(forge, upgradeKey, now);
            if (!next) {
                throw new BadRequestException(
                    "Achat impossible : pas assez d'Échos, ou amélioration verrouillée ou au maximum.",
                );
            }
            return {
                forge: next,
                strikeWindow: window,
                result: { upgradeKey },
            };
        });
    }

    /**
     * Déroulé commun à toutes les actions, dans une transaction :
     * 1. si la demande a déjà été traitée, ne rien refaire ;
     * 2. charger la Forge et verser la production écoulée ;
     * 3. appliquer l'action avec le moteur ;
     * 4. enregistrer, en vérifiant que personne n'a modifié la Forge entre-temps ;
     * 5. inscrire l'opération dans l'historique économique.
     */
    private async run<T>(
        userId: string,
        kind: string,
        requestId: string | null,
        action: (
            forge: ForgeState,
            strikeWindow: StrikeWindow,
            now: number,
        ) => ActionOutcome<T>,
    ): Promise<ForgeResponse<T>> {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return await this.prisma.$transaction(async (tx) => {
                    // 1. Demande déjà traitée ? On renvoie l'état sans rien refaire.
                    if (requestId) {
                        const done = await tx.economyTransaction.findUnique({
                            where: { userId_requestId: { userId, requestId } },
                        });
                        if (done) {
                            const { record } = await this.load(tx, userId);
                            const { forge } = toEngineState(record);
                            return {
                                forge: toView(forge, Date.now()),
                                duplicate: true,
                            };
                        }
                    }

                    // 2. Charger la Forge et verser la production écoulée.
                    const { forgeId, version, record } = await this.load(
                        tx,
                        userId,
                    );
                    const now = Date.now();
                    const before = toEngineState(record);
                    const synced = syncProduction(before.forge, now);

                    // 3. Appliquer l'action avec le moteur.
                    const outcome = action(synced, before.strikeWindow, now);

                    // 4. Enregistrer (avec vérification de version).
                    await this.save(
                        tx,
                        userId,
                        forgeId,
                        version,
                        toRecord(outcome.forge, outcome.strikeWindow),
                    );

                    // 5. Historique économique.
                    const delta =
                        outcome.forge.echoesMilli - before.forge.echoesMilli;
                    if (requestId || delta !== 0) {
                        await tx.economyTransaction.create({
                            data: {
                                userId,
                                requestId: requestId ?? `sync-${randomUUID()}`,
                                kind,
                                entries: {
                                    create: [
                                        {
                                            resource: "ECHOES",
                                            deltaMilli: BigInt(delta),
                                            balanceAfterMilli: BigInt(
                                                outcome.forge.echoesMilli,
                                            ),
                                        },
                                    ],
                                },
                            },
                        });
                    }

                    return {
                        forge: toView(outcome.forge, now),
                        result: outcome.result,
                    };
                });
            } catch (error) {
                // Quelqu'un a modifié la Forge en même temps : on recommence.
                if (error instanceof ConcurrentUpdate) continue;
                throw error;
            }
        }
        throw new ConflictException("La Forge est occupée, réessaie.");
    }

    /** Lit la Forge d'un joueur dans ses différentes tables. */
    private async load(tx: Tx, userId: string) {
        const forgeRow = await tx.forgeState.findUnique({
            where: { userId },
            include: { upgrades: true },
        });
        const balance = await tx.resourceBalance.findUnique({
            where: { userId_resource: { userId, resource: "ECHOES" } },
        });
        if (!forgeRow || !balance) {
            throw new NotFoundException("Forge introuvable.");
        }

        const level = (key: UpgradeKey) =>
            forgeRow.upgrades.find((u) => u.upgradeKey === key)?.level ?? 0;

        const record: ForgeRecord = {
            lastProductionAt: forgeRow.lastProductionAt,
            productionRemainderMilli: forgeRow.productionRemainderMilli,
            strikeWindowStartedAt: forgeRow.strikeWindowStartedAt,
            strikeWindowCount: forgeRow.strikeWindowCount,
            echoesMilli: balance.amountMilli,
            strikeLevel: level("STRIKE_POWER"),
            emberLevel: level("AWAKENED_EMBER"),
        };

        return { forgeId: forgeRow.id, version: forgeRow.version, record };
    }

    /** Enregistre la Forge, seulement si sa version n'a pas changé. */
    private async save(
        tx: Tx,
        userId: string,
        forgeId: string,
        version: number,
        record: ForgeRecord,
    ) {
        const updated = await tx.forgeState.updateMany({
            where: { id: forgeId, version },
            data: {
                lastProductionAt: record.lastProductionAt,
                productionRemainderMilli: record.productionRemainderMilli,
                strikeWindowStartedAt: record.strikeWindowStartedAt,
                strikeWindowCount: record.strikeWindowCount,
                version: { increment: 1 },
            },
        });
        if (updated.count === 0) throw new ConcurrentUpdate();

        await tx.playerForgeUpgrade.updateMany({
            where: { forgeStateId: forgeId, upgradeKey: "STRIKE_POWER" },
            data: { level: record.strikeLevel },
        });
        await tx.playerForgeUpgrade.updateMany({
            where: { forgeStateId: forgeId, upgradeKey: "AWAKENED_EMBER" },
            data: { level: record.emberLevel },
        });
        await tx.resourceBalance.update({
            where: { userId_resource: { userId, resource: "ECHOES" } },
            data: { amountMilli: record.echoesMilli },
        });
    }
}
