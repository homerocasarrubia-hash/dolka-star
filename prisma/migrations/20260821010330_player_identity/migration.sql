-- DropIndex
DROP INDEX "Score_sessionId_key";

-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "playerId" TEXT;

-- AlterTable
ALTER TABLE "Score" ADD COLUMN     "playerId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Score_playerId_idx" ON "Score"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_playerId_weekStart_key" ON "Score"("playerId", "weekStart");
