// app/api/pedidos/[id]/route.ts
//
// PATCH  /api/pedidos/:id   — cambiar estado y/o editar los ítems y el total
// DELETE /api/pedidos/:id   — baja lógica (estado "eliminado")

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@/lib/generated/prisma/client'
import { conReintento, prisma } from '@/lib/prisma'
import { avisar } from '@/lib/pusher'
import { rolDeLaCookie } from '@/lib/acceso'
import { esMetodoValido } from '@/lib/pago'

/** Los estados por los que puede pasar un pedido. Cualquier otro se rechaza. */
const ESTADOS = new Set([
  'pendiente',
  'en_espera',
  'en_preparacion',
  'listo',
  'cobrado',
  'entregado',
  'eliminado',
])

function malPedido(mensaje: string) {
  return NextResponse.json({ error: mensaje }, { status: 400 })
}

/** El id viene de la URL: si no es un entero positivo no hay nada que buscar. */
function leerId(valor: string): number | null {
  const id = Number(valor)
  return Number.isInteger(id) && id > 0 ? id : null
}

/** Prisma tira P2025 cuando el `where` no encontró la fila. */
function esInexistente(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2025'
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Cambiar el estado o los ítems de un pedido es cosa del local. Sin esto,
  // cualquiera con la URL podía marcar toda la noche como entregada.
  if (!(await rolDeLaCookie(req))) {
    return NextResponse.json({ error: 'Necesitás entrar con tu PIN.' }, { status: 401 })
  }

  const id = leerId((await params).id)
  if (id === null) return malPedido('El id del pedido no es válido.')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return malPedido('El cuerpo no es JSON válido.')
  }
  if (typeof body !== 'object' || body === null) {
    return malPedido('El cuerpo tiene que ser un objeto.')
  }
  const b = body as Record<string, unknown>

  // Se arma con lo que vino: caja manda items y total cuando edita un pedido,
  // cocina y mozo mandan solo el estado. Antes esta función leía únicamente
  // `estado`, así que las ediciones de caja se veían en pantalla y no llegaban
  // nunca a la base: al recargar volvían los ítems y el total viejos.
  const data: Prisma.PedidoUpdateInput = {}

  if (b.estado !== undefined) {
    if (typeof b.estado !== 'string' || !ESTADOS.has(b.estado)) {
      return malPedido('El estado del pedido no es válido.')
    }
    data.estado = b.estado
  }

  if (b.metodoPago !== undefined) {
    // Vale un método suelto o un pago repartido entre efectivo y transferencia.
    if (!esMetodoValido(b.metodoPago)) {
      return malPedido('La forma de pago no es válida.')
    }
    data.metodoPago = b.metodoPago
  }

  if (b.items !== undefined) {
    if (!Array.isArray(b.items) || b.items.length === 0) {
      return malPedido('Un pedido no puede quedar sin ítems.')
    }
    data.items = b.items as Prisma.InputJsonValue
  }

  if (b.total !== undefined) {
    // La columna es entera. El costo de envío puede llegar con decimales, así
    // que se redondea en vez de rechazar un pedido que está bien.
    const total = Math.round(Number(b.total))
    if (!Number.isFinite(total) || total < 0) {
      return malPedido('El total del pedido no es un número válido.')
    }
    data.total = total
  }

  if (Object.keys(data).length === 0) {
    return malPedido('No hay nada que cambiar.')
  }

  let pedido
  try {
    // Dejar el pedido en el estado pedido da lo mismo una vez que dos, así que
    // se puede reintentar si lo que falló fue la conexión.
    pedido = await conReintento(() => prisma.pedido.update({ where: { id }, data }))
  } catch (error) {
    if (esInexistente(error)) {
      return NextResponse.json({ error: 'Ese pedido no existe.' }, { status: 404 })
    }
    console.error('[pedidos] no se pudo actualizar el pedido', id, error)
    return NextResponse.json({ error: 'No se pudo actualizar el pedido.' }, { status: 500 })
  }

  await avisar(pedido.local, 'pedido-actualizado', pedido)
  return NextResponse.json(pedido)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await rolDeLaCookie(req))) {
    return NextResponse.json({ error: 'Necesitás entrar con tu PIN.' }, { status: 401 })
  }

  const id = leerId((await params).id)
  if (id === null) return malPedido('El id del pedido no es válido.')

  let pedido
  try {
    pedido = await conReintento(() =>
      prisma.pedido.update({ where: { id }, data: { estado: 'eliminado' } }),
    )
  } catch (error) {
    if (esInexistente(error)) {
      return NextResponse.json({ error: 'Ese pedido no existe.' }, { status: 404 })
    }
    console.error('[pedidos] no se pudo eliminar el pedido', id, error)
    return NextResponse.json({ error: 'No se pudo eliminar el pedido.' }, { status: 500 })
  }

  await avisar(pedido.local, 'pedido-actualizado', pedido)
  return NextResponse.json(pedido)
}
