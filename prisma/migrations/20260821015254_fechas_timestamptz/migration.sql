-- Las columnas de fecha pasan a TIMESTAMPTZ.
--
-- El USING no es decorativo: sin él, Postgres interpreta los valores sin zona
-- usando el TimeZone de la sesión, que no está garantizado y cambiaría el
-- instante de cada fila. Los valores guardados son reloj UTC (verificado antes
-- de migrar: weekStart '2026-08-17 03:00:00' es el lunes 00:00 de Argentina),
-- así que se los declara explícitamente como UTC.

ALTER TABLE "GameSession"
  ALTER COLUMN "startedAt" TYPE TIMESTAMPTZ(3) USING "startedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "finishedAt" TYPE TIMESTAMPTZ(3) USING "finishedAt" AT TIME ZONE 'UTC';

ALTER TABLE "Score"
  ALTER COLUMN "weekStart" TYPE TIMESTAMPTZ(3) USING "weekStart" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
