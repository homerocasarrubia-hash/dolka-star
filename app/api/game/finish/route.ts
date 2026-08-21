// Registro del puntaje. Todas las validaciones corren en el orden del spec y
// cortan en la primera que falla, con un mensaje que se pueda mostrar tal cual.
//
// Nada de lo que decide si el puntaje es válido viene del cliente: la duración
// sale de restar contra startedAt y la semana del reloj del servidor.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  MAX_POINTS_PER_SECOND,
  MAX_SCORE,
  MAX_SESSION_SECONDS,
  MIN_SESSION_SECONDS,
} from '@/lib/game/server-config';
import { validarPlayerName, validarScore, validarWhatsapp } from '@/lib/game/validation';
import { currentWeekStart } from '@/lib/game/week';

export const dynamic = 'force-dynamic';

function malPedido(mensaje: string) {
  return NextResponse.json({ error: mensaje }, { status: 400 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return malPedido('El cuerpo del pedido no es JSON válido.');
  }

  const { sessionId, score, playerName, whatsapp } = (body ?? {}) as Record<string, unknown>;

  if (typeof sessionId !== 'string' || !sessionId) {
    return malPedido('Falta el identificador de la partida.');
  }

  // 1. La sesión existe y todavía no tiene puntaje.
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: { id: true, startedAt: true, score: { select: { id: true } } },
  });

  if (!session) return malPedido('Esa partida no existe.');
  if (session.score) return malPedido('Esa partida ya tiene un puntaje registrado.');

  // 2. Duración real, medida contra el reloj del servidor.
  const duracionSegundos = (Date.now() - session.startedAt.getTime()) / 1000;

  if (duracionSegundos < MIN_SESSION_SECONDS) {
    return malPedido(`La partida duró menos de ${MIN_SESSION_SECONDS} segundos.`);
  }
  if (duracionSegundos > MAX_SESSION_SECONDS) {
    return malPedido('La partida quedó abierta demasiado tiempo. Empezá una nueva.');
  }

  // 4. Puntaje entero, positivo y por debajo del tope duro.
  //    Va antes que el ritmo porque el ritmo necesita un número confiable.
  const vScore = validarScore(score, MAX_SCORE);
  if ('error' in vScore) return malPedido(vScore.error);

  // 3. Ritmo de puntos por segundo. Ver MAX_POINTS_PER_SECOND en server-config.
  if (vScore.score / duracionSegundos > MAX_POINTS_PER_SECOND) {
    return malPedido('El puntaje no es compatible con la duración de la partida.');
  }

  // 5. Nombre.
  const vNombre = validarPlayerName(playerName);
  if ('error' in vNombre) return malPedido(vNombre.error);

  // 6. WhatsApp, si vino.
  const vWhatsapp = validarWhatsapp(whatsapp);
  if ('error' in vWhatsapp) return malPedido(vWhatsapp.error);

  // La semana la fija el servidor, nunca el cliente.
  const weekStart = currentWeekStart();

  try {
    const guardado = await prisma.$transaction([
      prisma.score.create({
        data: {
          sessionId: session.id,
          score: vScore.score,
          playerName: vNombre.nombre,
          whatsapp: vWhatsapp.whatsapp,
          weekStart,
        },
        select: { id: true, score: true, playerName: true, weekStart: true },
      }),
      prisma.gameSession.update({
        where: { id: session.id },
        data: { finishedAt: new Date() },
        select: { id: true },
      }),
    ]);

    const score = guardado[0];
    return NextResponse.json({
      ok: true,
      score: { id: score.id, score: score.score, playerName: score.playerName },
    });
  } catch (error) {
    // El @unique sobre sessionId es la última línea contra dos envíos
    // simultáneos de la misma partida, que el chequeo de arriba no ve.
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return malPedido('Esa partida ya tiene un puntaje registrado.');
    }
    throw error;
  }
}
