// app/api/pedidos/route.ts
//
// GET  /api/pedidos?local=andalgala&desde=2026-09-27T09:00:00.000Z   — lista de pedidos (para /cocina y /caja)
// POST /api/pedidos                                                    — crear pedido + notificar a Pusher

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function GET(req: NextRequest) {
  const local = req.nextUrl.searchParams.get("local") ?? "andalgala";
  const desde = req.nextUrl.searchParams.get("desde");

  const pedidos = await prisma.pedido.findMany({
    where: {
      local,
      ...(desde ? { creadoEn: { gte: new Date(desde) } } : {}),
    },
    orderBy: { creadoEn: "desc" },
    take: 100,
  });

  return NextResponse.json(pedidos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    local,
    cliente,
    telefono,
    modalidad,
    direccion,
    items,
    total,
    metodoPago,
  } = body;

  const pedido = await prisma.pedido.create({
    data: {
      local,
      cliente,
      telefono: telefono ?? null,
      modalidad,
      direccion: direccion ?? null,
      items,
      total,
      metodoPago: metodoPago ?? "efectivo",
    },
  });

  // Avisa a la cocina en tiempo real.
  await pusher.trigger(`cocina-${local}`, "nuevo-pedido", pedido);

  return NextResponse.json(pedido, { status: 201 });
}