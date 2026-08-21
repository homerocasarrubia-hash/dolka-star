// Cierre del concurso semanal.
//
// La semana corre de lunes 00:00 a domingo 23:59 de Argentina. El contador se
// calcula contra esa hora y NO contra la del navegador: un jugador con el reloj
// en otra zona (o mal puesto) tiene que ver el mismo tiempo restante que
// cualquier otro, porque el corte lo decide el servidor.

import { addDays, subMinutes } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { LEADERBOARD_TIMEZONE } from './server-config';
import { weekStartFor } from './week';

/** Domingo 23:59 de Argentina de la semana a la que pertenece `fecha`. */
export function weekEndFor(fecha: Date): Date {
  const inicio = weekStartFor(fecha);
  // Se avanza sobre el reloj de pared argentino y recién después se vuelve a
  // UTC, para que un eventual cambio de huso no corra el cierre una hora.
  const inicioLocal = toZonedTime(inicio, LEADERBOARD_TIMEZONE);
  const cierreLocal = subMinutes(addDays(inicioLocal, 7), 1);
  return fromZonedTime(cierreLocal, LEADERBOARD_TIMEZONE);
}

export interface TiempoRestante {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
  terminado: boolean;
}

/** Cuánto falta para el cierre, partido en unidades listas para mostrar. */
export function tiempoHastaElCierre(ahora: Date = new Date()): TiempoRestante {
  const ms = weekEndFor(ahora).getTime() - ahora.getTime();

  if (ms <= 0) return { dias: 0, horas: 0, minutos: 0, segundos: 0, terminado: true };

  const totalSegundos = Math.floor(ms / 1000);
  return {
    dias: Math.floor(totalSegundos / 86400),
    horas: Math.floor((totalSegundos % 86400) / 3600),
    minutos: Math.floor((totalSegundos % 3600) / 60),
    segundos: totalSegundos % 60,
    terminado: false,
  };
}

/** "2d 14h 05m" o "14h 05m 30s" en la última jornada. */
export function formatearRestante(t: TiempoRestante): string {
  if (t.terminado) return 'Cerrado';
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  if (t.dias > 0) return `${t.dias}d ${dosDigitos(t.horas)}h ${dosDigitos(t.minutos)}m`;
  return `${dosDigitos(t.horas)}h ${dosDigitos(t.minutos)}m ${dosDigitos(t.segundos)}s`;
}
