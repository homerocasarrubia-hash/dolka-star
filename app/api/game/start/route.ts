// Arranque de partida. Lo único que importa acá es que el startedAt lo pone el
// servidor: es la referencia contra la que después se mide la duración real.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MAX_SESSIONS_PER_IP, RATE_LIMIT_WINDOW_MS } from '@/lib/game/server-config';
import { validarPlayerId } from '@/lib/game/validation';

export const dynamic = 'force-dynamic';

/**
 * IP del cliente. Detrás de Vercel el primer valor de x-forwarded-for es el
 * origen real; el resto son los proxies intermedios.
 */
function ipDe(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return request.headers.get('x-real-ip');
}

export async function POST(request: Request) {
  // El playerId entra acá y queda pegado a la sesión. El finish lo lee de la
  // sesión y no del cuerpo del pedido, así nadie cambia de identidad después
  // de haber jugado.
  const body: unknown = await request.json().catch(() => null);
  const vPlayer = validarPlayerId((body as { playerId?: unknown })?.playerId);
  if ('error' in vPlayer) {
    return NextResponse.json({ error: vPlayer.error }, { status: 400 });
  }

  const ip = ipDe(request);
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

  // Rate limit por IP. Se cuenta contra la propia tabla en vez de un store
  // aparte: el dato ya está y el índice (ip, startedAt) lo hace barato.
  if (ip) {
    const desde = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recientes = await prisma.gameSession.count({ where: { ip, startedAt: { gte: desde } } });

    if (recientes >= MAX_SESSIONS_PER_IP) {
      return NextResponse.json(
        { error: 'Demasiadas partidas en poco tiempo. Probá de nuevo en un rato.' },
        { status: 429, headers: { 'Retry-After': String(RATE_LIMIT_WINDOW_MS / 1000) } },
      );
    }
  }

  const session = await prisma.gameSession.create({
    data: { ip, userAgent, playerId: vPlayer.playerId },
    select: { id: true },
  });

  return NextResponse.json({ sessionId: session.id });
}
