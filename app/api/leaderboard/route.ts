// Top 20 de la semana en curso.
//
// El select es explícito y corto a propósito: whatsapp e ip no se nombran en
// ningún lado, así que no hay forma de que se escapen en la respuesta ni aunque
// alguien agregue campos al modelo más adelante.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LEADERBOARD_CACHE_SECONDS, LEADERBOARD_SIZE } from '@/lib/game/server-config';
import { currentWeekStart } from '@/lib/game/week';

export const dynamic = 'force-dynamic';

interface Puesto {
  posicion: number;
  playerName: string;
  score: number;
}

/**
 * Caché en memoria del proceso. Complementa al Cache-Control de abajo: el
 * header corta los pedidos en el CDN, y esto corta las consultas repetidas
 * dentro de una misma instancia cuando el CDN revalida.
 */
let cache: { weekStart: number; expira: number; puestos: Puesto[] } | null = null;

export async function GET() {
  const weekStart = currentWeekStart();
  const ahora = Date.now();

  if (cache && cache.weekStart === weekStart.getTime() && cache.expira > ahora) {
    return responder(cache.puestos, weekStart);
  }

  const filas = await prisma.score.findMany({
    where: { weekStart },
    orderBy: [{ score: 'desc' }, { createdAt: 'asc' }], // a igual puntaje, primero el que llegó antes
    take: LEADERBOARD_SIZE,
    select: { playerName: true, score: true },
  });

  const puestos: Puesto[] = filas.map((fila, i) => ({
    posicion: i + 1,
    playerName: fila.playerName,
    score: fila.score,
  }));

  cache = {
    weekStart: weekStart.getTime(),
    expira: ahora + LEADERBOARD_CACHE_SECONDS * 1000,
    puestos,
  };

  return responder(puestos, weekStart);
}

function responder(puestos: Puesto[], weekStart: Date) {
  return NextResponse.json(
    { weekStart: weekStart.toISOString(), puestos },
    {
      headers: {
        'Cache-Control': `public, s-maxage=${LEADERBOARD_CACHE_SECONDS}, stale-while-revalidate=${LEADERBOARD_CACHE_SECONDS * 2}`,
      },
    },
  );
}
