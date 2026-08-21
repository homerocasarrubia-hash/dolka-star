// Semana del ranking.
//
// El corte es el lunes a las 00:00 hora de Argentina, no UTC. Con cálculo
// manual sobre UTC el ranking cambiaría de semana el domingo a las 21:00 local,
// que es justo el horario en que el local está abierto y lleno de gente
// jugando. Por eso va con date-fns-tz y no con aritmética de milisegundos.

import { startOfWeek } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { LEADERBOARD_TIMEZONE } from './server-config';

/**
 * Lunes 00:00 de Argentina de la semana a la que pertenece `fecha`, devuelto
 * como el instante UTC correspondiente (que es como lo guarda Postgres).
 *
 * Siempre se llama con el reloj del servidor: el cliente no elige la semana.
 */
export function weekStartFor(fecha: Date): Date {
  // Reloj de pared argentino...
  const local = toZonedTime(fecha, LEADERBOARD_TIMEZONE);
  // ...retrocedido al lunes a medianoche...
  const lunes = startOfWeek(local, { weekStartsOn: 1 });
  // ...y de vuelta al instante real, aplicando el offset que corresponda.
  return fromZonedTime(lunes, LEADERBOARD_TIMEZONE);
}

/** Semana en curso según el reloj del servidor. */
export function currentWeekStart(): Date {
  return weekStartFor(new Date());
}
