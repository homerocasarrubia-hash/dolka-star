// Top 20 de la semana en curso, por local.
//
// El select es explícito y corto a propósito: whatsapp e ip no se nombran en
// ningún lado, así que no hay forma de que se escapen en la respuesta ni aunque
// alguien agregue campos al modelo más adelante.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LEADERBOARD_CACHE_SECONDS, LEADERBOARD_SIZE } from '@/lib/game/server-config';
import { currentWeekStart } from '@/lib/game/week';
import { esLocalId, LOCAL_POR_DEFECTO, type LocalId } from '@/data/locales';

export const dynamic = 'force-dynamic';

interface Puesto {
  posicion: number;
  playerName: string;
  score: number;
}

/**
 * Caché en memoria del proceso, UNA POR LOCAL. Complementa al Cache-Control de
 * abajo: el header corta los pedidos en el CDN, y esto corta las consultas
 * repetidas dentro de una misma instancia cuando el CDN revalida.
 */
const cache = new Map<LocalId, { weekStart: number; expira: number; puestos: Puesto[] }>();

export async function GET(request: Request) {
  // Local pedido. Uno desconocido no es error: se cae al de siempre, que es
  // como se comportaba este endpoint cuando había un solo local.
  const pedido = new URL(request.url).searchParams.get('local');
  const local: LocalId = esLocalId(pedido) ? pedido : LOCAL_POR_DEFECTO;

  const weekStart = currentWeekStart();
  const ahora = Date.now();

  const guardado = cache.get(local);
  if (guardado && guardado.weekStart === weekStart.getTime() && guardado.expira > ahora) {
    return responder(guardado.puestos, weekStart, local);
  }

  const filas = await prisma.score.findMany({
    where: { weekStart, local },
    orderBy: [{ score: 'desc' }, { createdAt: 'asc' }], // a igual puntaje, primero el que llegó antes
    take: LEADERBOARD_SIZE,
    select: { playerName: true, score: true },
  });

  const puestos: Puesto[] = filas.map((fila, i) => ({
    posicion: i + 1,
    playerName: fila.playerName,
    score: fila.score,
  }));

  cache.set(local, {
    weekStart: weekStart.getTime(),
    expira: ahora + LEADERBOARD_CACHE_SECONDS * 1000,
    puestos,
  });

  return responder(puestos, weekStart, local);
}

function responder(puestos: Puesto[], weekStart: Date, local: LocalId) {
  return NextResponse.json(
    { weekStart: weekStart.toISOString(), local, puestos },
    {
      headers: {
        'Cache-Control': `public, s-maxage=${LEADERBOARD_CACHE_SECONDS}, stale-while-revalidate=${LEADERBOARD_CACHE_SECONDS * 2}`,
      },
    },
  );
}
