-- CreateTable
CREATE TABLE "Pedido" (
    "id" SERIAL NOT NULL,
    "local" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "modalidad" TEXT NOT NULL,
    "direccion" TEXT,
    "items" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);
