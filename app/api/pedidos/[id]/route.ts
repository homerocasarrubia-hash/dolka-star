// app/api/pedidos/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/lib/generated/prisma/client'
import Pusher from 'pusher'

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

function makePrisma() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { estado } = await req.json()
    const prisma = makePrisma()
    const pedido = await prisma.pedido.update({
      where: { id: Number(id) },
      data: { estado },
    })

    await pusher.trigger(`cocina-${pedido.local}`, 'pedido-actualizado', pedido)

    return NextResponse.json(pedido)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const prisma = makePrisma()
    const pedido = await prisma.pedido.update({
      where: { id: Number(id) },
      data: { estado: 'eliminado' },
    })

    await pusher.trigger(`cocina-${pedido.local}`, 'pedido-actualizado', pedido)

    return NextResponse.json(pedido)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}