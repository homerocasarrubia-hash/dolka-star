-- Número de comanda por turno: lo que se canta en el local, arrancando en 1
-- cada noche. El id de la tabla es histórico y la primera comanda de un día
-- salía como "#51".

ALTER TABLE "Pedido" ADD COLUMN "numero" INTEGER;
ALTER TABLE "Pedido" ADD COLUMN "turno" TEXT;

-- Dos pedidos del mismo local y del mismo turno no pueden compartir número.
-- Los pedidos viejos quedan con numero y turno en NULL, y Postgres permite
-- repetir NULL en un índice único, así que no molestan.
CREATE UNIQUE INDEX "Pedido_local_turno_numero_key" ON "Pedido"("local", "turno", "numero");
