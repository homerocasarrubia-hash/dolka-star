// Registro del puntaje. Todas las validaciones corren en el orden del spec y
// cortan en la primera que falla, con un mensaje que se pueda mostrar tal cual.
//
// Nada de lo que decide si el puntaje es válido viene del cliente: la duración
// sale de restar contra startedAt, la semana del reloj del servidor y la
// identidad de la sesión, no del cuerpo del pedido.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  MAX_POINTS_PER_SECOND,
  MAX_SCORE,
  MAX_SESSION_SECONDS,
  MIN_SESSION_SECONDS,
} from '@/lib/game/server-config';
import { validarLocal, validarPlayerName, validarScore, validarWhatsapp } from '@/lib/game/validation';
import type { LocalId } from '@/data/locales';
import { currentWeekStart } from '@/lib/game/week';

export const dynamic = 'force-dynamic';

function malPedido(mensaje: string) {
  return NextResponse.json({ error: mensaje }, { status: 400 });
}

function esConflictoDeUnico(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
  );
}

interface Resultado {
  improved: boolean;
  bestScore: number;
}

/**
 * Guarda el mejor puntaje de la semana para este jugador EN ESTE LOCAL.
 *
 * Hay una sola fila por jugador, semana y local, garantizada por el @@unique.
 * El local entra en la clave porque cada uno tiene su ranking: el mismo
 * jugador puede tener su mejor de Andalgalá y su mejor de Belén en la misma
 * semana sin que uno pise al otro.
 *
 * La comparación "solo si mejora" va dentro del WHERE del update y no en un
 * if previo, para que dos envíos simultáneos no se pisen: la base decide.
 */
async function guardarMejorDeLaSemana(datos: {
  playerId: string;
  weekStart: Date;
  local: LocalId;
  score: number;
  playerName: string;
  whatsapp: string | null;
  sessionId: string;
}): Promise<Resultado> {
  const { playerId, weekStart, local, score, playerName, whatsapp, sessionId } = datos;

  // El nombre se actualiza junto con el puntaje, así el ranking muestra el
  // último que eligió. El WhatsApp solo se pisa si vino uno nuevo: mandar el
  // campo vacío no tiene por qué borrar el que ya había.
  const cambios = {
    score,
    playerName,
    sessionId,
    ...(whatsapp === null ? {} : { whatsapp }),
  };

  // Un solo statement: actualiza únicamente si el puntaje nuevo supera al guardado.
  const mejorado = await prisma.score.updateMany({
    where: { playerId, weekStart, local, score: { lt: score } },
    data: cambios,
  });
  if (mejorado.count > 0) return { improved: true, bestScore: score };

  // No mejoró: o la fila existe y es mejor, o todavía no existe.
  const existente = await prisma.score.findUnique({
    where: { playerId_weekStart_local: { playerId, weekStart, local } },
    select: { score: true },
  });
  if (existente) return { improved: false, bestScore: existente.score };

  try {
    await prisma.score.create({
      data: { playerId, weekStart, local, score, playerName, whatsapp, sessionId },
      select: { id: true },
    });
    return { improved: true, bestScore: score };
  } catch (error) {
    if (!esConflictoDeUnico(error)) throw error;

    // Carrera: otro envío del mismo jugador creó la fila entre el findUnique y
    // el create. Se rehace la comparación contra lo que quedó.
    const ganadora = await prisma.score.findUnique({
      where: { playerId_weekStart_local: { playerId, weekStart, local } },
      select: { score: true },
    });
    if (!ganadora) throw error;
    if (ganadora.score >= score) return { improved: false, bestScore: ganadora.score };

    const reintento = await prisma.score.updateMany({
      where: { playerId, weekStart, local, score: { lt: score } },
      data: cambios,
    });
    return reintento.count > 0
      ? { improved: true, bestScore: score }
      : { improved: false, bestScore: ganadora.score };
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return malPedido('El cuerpo del pedido no es JSON válido.');
  }

  const { sessionId, score, playerName, whatsapp, local } = (body ?? {}) as Record<string, unknown>;

  if (typeof sessionId !== 'string' || !sessionId) {
    return malPedido('Falta el identificador de la partida.');
  }

  // 1. La sesión existe y todavía no se cerró. `finishedAt` es el anti-reenvío:
  //    la fila de Score ya no sirve para eso porque la comparten varias sesiones.
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: { id: true, startedAt: true, finishedAt: true, playerId: true },
  });

  if (!session) return malPedido('Esa partida no existe.');
  if (session.finishedAt) return malPedido('Esa partida ya fue registrada.');
  if (!session.playerId) return malPedido('Esa partida se abrió sin identificar al jugador.');

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

  // 7. Local donde se jugó. Es lo único de esta lista que decide en qué ranking
  //    entra el puntaje, así que se valida contra la lista cerrada de locales.
  const vLocal = validarLocal(local);
  if ('error' in vLocal) return malPedido(vLocal.error);

  const weekStart = currentWeekStart();

  const resultado = await guardarMejorDeLaSemana({
    playerId: session.playerId,
    weekStart,
    local: vLocal.local,
    score: vScore.score,
    playerName: vNombre.nombre,
    whatsapp: vWhatsapp.whatsapp,
    sessionId: session.id,
  });

  // La sesión se cierra pase lo que pase: se jugó y ya no puede reenviarse,
  // haya mejorado el récord o no.
  await prisma.gameSession.update({
    where: { id: session.id },
    data: { finishedAt: new Date() },
    select: { id: true },
  });

  return NextResponse.json(resultado);
}
