// app/api/pedidos/route.ts
//
// GET  /api/pedidos?local=andalgala&desde=2026-09-27T09:00:00.000Z   — lista de pedidos (para /cocina y /caja)
// POST /api/pedidos                                                    — crear pedido + notificar a Pusher

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { avisar } from "@/lib/pusher";
import { rolDeLaCookie } from "@/lib/acceso";
import { esLocalId, LOCAL_POR_DEFECTO } from "@/data/locales";

/** Las tres formas de entrega que manejan el sitio y la app del mozo. */
const MODALIDADES = new Set(["local", "retirar", "llevar"]);

function malPedido(mensaje: string) {
  return NextResponse.json({ error: mensaje }, { status: 400 });
}

interface DatosPedido {
  local: string;
  cliente: string;
  telefono: string | null;
  modalidad: string;
  direccion: string | null;
  /** Se guarda tal cual en la columna Json: es la lista de platos del pedido. */
  items: Prisma.InputJsonValue;
  total: number;
  metodoPago: string;
}

/**
 * Revisa lo que manda el cliente ANTES de tocar la base.
 *
 * Sin esto, cualquier campo faltante o de tipo equivocado llegaba hasta Prisma y
 * salía como un 500 con el cuerpo vacío: el cliente veía "error" y no había
 * forma de saber qué le faltaba.
 */
function validar(body: unknown): { error: string } | { datos: DatosPedido } {
  if (typeof body !== "object" || body === null) {
    return { error: "El pedido tiene que ser un objeto." };
  }
  const b = body as Record<string, unknown>;

  if (!esLocalId(b.local)) {
    return { error: "El local del pedido no es válido." };
  }

  const cliente = typeof b.cliente === "string" ? b.cliente.trim() : "";
  if (!cliente) return { error: "Falta el nombre del cliente." };

  if (typeof b.modalidad !== "string" || !MODALIDADES.has(b.modalidad)) {
    return { error: "La modalidad de entrega no es válida." };
  }

  const direccion = typeof b.direccion === "string" ? b.direccion.trim() : "";
  if (b.modalidad === "llevar" && !direccion) {
    return { error: "Un pedido para llevar necesita dirección de entrega." };
  }

  if (!Array.isArray(b.items) || b.items.length === 0) {
    return { error: "El pedido no tiene ítems." };
  }

  // La columna es entera y los precios van en pesos enteros. El mozo puede
  // mandar un decimal al sumar el costo de envío, así que se redondea en vez de
  // rechazar un pedido que está bien.
  const total = Math.round(Number(b.total));
  if (!Number.isFinite(total) || total < 0) {
    return { error: "El total del pedido no es un número válido." };
  }

  const telefono = typeof b.telefono === "string" ? b.telefono.trim() : "";
  const metodoPago = typeof b.metodoPago === "string" && b.metodoPago.trim()
    ? b.metodoPago.trim()
    : "efectivo";

  return {
    datos: {
      local: b.local,
      cliente,
      telefono: telefono || null,
      modalidad: b.modalidad,
      direccion: direccion || null,
      items: b.items,
      total,
      metodoPago,
    },
  };
}

export async function GET(req: NextRequest) {
  // La lista lleva nombre, teléfono y dirección de cada cliente: es para las
  // pantallas internas, no para cualquiera que sepa la URL.
  if (!(await rolDeLaCookie(req))) {
    return NextResponse.json({ error: "Necesitás entrar con tu PIN." }, { status: 401 });
  }

  const pedidoLocal = req.nextUrl.searchParams.get("local");
  const local = esLocalId(pedidoLocal) ? pedidoLocal : LOCAL_POR_DEFECTO;
  const desde = req.nextUrl.searchParams.get("desde");

  // Una fecha inválida en `desde` armaba un `new Date("...")` con NaN y la
  // consulta se caía con 500. Si no se entiende, se devuelve todo el listado.
  const creadoDesde = desde ? new Date(desde) : null;
  const filtroFecha =
    creadoDesde && !Number.isNaN(creadoDesde.getTime())
      ? { creadoEn: { gte: creadoDesde } }
      : {};

  try {
    const pedidos = await prisma.pedido.findMany({
      where: {
        local,
        ...filtroFecha,
      },
      orderBy: { creadoEn: "desc" },
      take: 100,
    });

    return NextResponse.json(pedidos);
  } catch (error) {
    console.error("[pedidos] no se pudo leer la lista:", error);
    return NextResponse.json({ error: "No se pudo leer los pedidos." }, { status: 500 });
  }
}

// Sin cookie a propósito: acá entran los pedidos del carrito del sitio, que
// los hace gente que no tiene por qué estar logueada en nada.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return malPedido("El cuerpo del pedido no es JSON válido.");
  }

  const revisado = validar(body);
  if ("error" in revisado) return malPedido(revisado.error);

  let pedido;
  try {
    pedido = await prisma.pedido.create({ data: revisado.datos });
  } catch (error) {
    console.error("[pedidos] no se pudo guardar:", error);
    return NextResponse.json({ error: "No se pudo guardar el pedido." }, { status: 500 });
  }

  // El aviso a la cocina NO puede voltear el pedido: para acá ya está guardado.
  // Si esto fallara con un 500, el cliente volvería a mandarlo y quedaría el
  // pedido duplicado en la base. `avisar` nunca tira por eso mismo.
  await avisar(pedido.local, "nuevo-pedido", pedido);

  return NextResponse.json(pedido, { status: 201 });
}
