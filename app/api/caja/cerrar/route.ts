// app/api/caja/cerrar/route.ts
//
// POST /api/caja/cerrar   — avisa a cocina y mozo que la caja se cerró

import { NextRequest, NextResponse } from 'next/server'
import Pusher from 'pusher'

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

export async function POST(req: NextRequest) {
  const { local } = await req.json()
  await pusher.trigger(`cocina-${local}`, 'caja-cerrada', { local })
  return NextResponse.json({ ok: true })
}