-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ECHOES');

-- CreateEnum
CREATE TYPE "UpgradeKey" AS ENUM ('STRIKE_POWER', 'AWAKENED_EMBER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForgeState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastProductionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productionRemainderMilli" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strikeWindowStartedAt" TIMESTAMP(3),
    "strikeWindowCount" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForgeState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerForgeUpgrade" (
    "id" TEXT NOT NULL,
    "forgeStateId" TEXT NOT NULL,
    "upgradeKey" "UpgradeKey" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerForgeUpgrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resource" "ResourceType" NOT NULL,
    "amountMilli" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "ResourceBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomyTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EconomyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomyEntry" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "resource" "ResourceType" NOT NULL,
    "deltaMilli" BIGINT NOT NULL,
    "balanceAfterMilli" BIGINT NOT NULL,

    CONSTRAINT "EconomyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ForgeState_userId_key" ON "ForgeState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerForgeUpgrade_forgeStateId_upgradeKey_key" ON "PlayerForgeUpgrade"("forgeStateId", "upgradeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceBalance_userId_resource_key" ON "ResourceBalance"("userId", "resource");

-- CreateIndex
CREATE UNIQUE INDEX "EconomyTransaction_userId_requestId_key" ON "EconomyTransaction"("userId", "requestId");

-- AddForeignKey
ALTER TABLE "ForgeState" ADD CONSTRAINT "ForgeState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerForgeUpgrade" ADD CONSTRAINT "PlayerForgeUpgrade_forgeStateId_fkey" FOREIGN KEY ("forgeStateId") REFERENCES "ForgeState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceBalance" ADD CONSTRAINT "ResourceBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomyTransaction" ADD CONSTRAINT "EconomyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EconomyEntry" ADD CONSTRAINT "EconomyEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "EconomyTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
