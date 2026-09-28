-- Ranking separado por local.
--
-- La columna `local` entra con default 'andalgala': los puntajes que ya existen
-- se hicieron cuando había un solo local, así que quedan asignados a ese sin
-- necesidad de un UPDATE aparte.
--
-- El único pasa de (playerId, weekStart) a (playerId, weekStart, local): con el
-- ranking separado, el mismo jugador puede tener su mejor de cada local en la
-- misma semana y uno no debe pisar al otro. Las filas viejas cumplen el nuevo
-- único sin tocar nada, porque el viejo ya garantizaba las dos primeras columnas.

-- AlterTable
ALTER TABLE "Score" ADD COLUMN     "local" TEXT NOT NULL DEFAULT 'andalgala';

-- DropIndex
DROP INDEX "Score_playerId_weekStart_key";

-- DropIndex
DROP INDEX "Score_weekStart_score_idx";

-- CreateIndex
CREATE INDEX "Score_local_weekStart_score_idx" ON "Score"("local", "weekStart", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Score_playerId_weekStart_local_key" ON "Score"("playerId", "weekStart", "local");
