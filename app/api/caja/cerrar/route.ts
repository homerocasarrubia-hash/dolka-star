// app/api/caja/cerrar/route.ts
//
// POST /api/caja/cerrar   — avisa a cocina y mozo que la caja se cerró

import { NextRequest, NextResponse } from 'next/server'
import { esLocalId } from '@/data/locales'
import { avisar } from '@/lib/pusher'
import { rolDeLaCookie } from '@/lib/acceso'

export async function POST(req: NextRequest) {
  // Cerrar la caja vacía la pantalla de cocina y la del mozo: no es algo que
  // pueda disparar cualquiera desde afuera.
  if (!(await rolDeLaCookie(req))) {
    return NextResponse.json({ error: 'Necesitás entrar con tu PIN.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'El cuerpo no es JSON válido.' }, { status: 400 })
  }

  // Sin esto, un local equivocado mandaba el "caja-cerrada" a un canal que
  // nadie escucha: caja se vaciaba y cocina seguía mostrando los pedidos.
  const local = (body as { local?: unknown })?.local
  if (!esLocalId(local)) {
    return NextResponse.json({ error: 'El local no es válido.' }, { status: 400 })
  }

  await avisar(local, 'caja-cerrada', { local })
  return NextResponse.json({ ok: true })
}
