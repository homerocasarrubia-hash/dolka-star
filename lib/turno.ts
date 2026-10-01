// Cuándo arranca el turno de trabajo.
//
// El día del local no es el día del calendario: se abre a la noche y se cierra
// pasada la medianoche, así que un pedido de las 00:30 es del turno que empezó
// el día anterior. El corte son las 9 de la mañana, una hora en la que con
// seguridad no hay nadie trabajando.
//
// Lo usan las tres pantallas para mirar todas el mismo turno. Antes lo tenía
// sólo la caja, escrito adentro de un efecto, y cocina y mozo pedían "los
// últimos 100 pedidos" sin fecha: una comanda que quedaba sin cerrar se veía
// como activa noches después.

export const HORA_DE_CORTE = 9;

/** El reloj con el que se mide el turno: el del local, no el del aparato. */
const ZONA_DEL_LOCAL = "America/Argentina/Catamarca";

/** El arranque del turno en curso, en hora local. */
export function inicioDelTurno(ahora: Date = new Date()): Date {
  const inicio = new Date(ahora);
  inicio.setHours(HORA_DE_CORTE, 0, 0, 0);
  // Antes de las 9 todavía estamos en el turno que arrancó ayer.
  if (ahora.getHours() < HORA_DE_CORTE) inicio.setDate(inicio.getDate() - 1);
  return inicio;
}

/**
 * El turno con nombre: la fecha en que arrancó, como "2026-10-01".
 *
 * Sirve de etiqueta para agrupar: todos los pedidos de una misma noche caen en
 * el mismo turno aunque algunos entren después de medianoche.
 *
 * Se calcula con el reloj de Catamarca y no con el de la máquina, porque esto
 * también corre en el servidor, que en Vercel está en UTC: con `setHours` del
 * Date local, un pedido de las 22 de acá caía en el turno del día siguiente.
 */
export function etiquetaDelTurno(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_DEL_LOCAL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(ahora);

  const parte = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);

  const dia = new Date(Date.UTC(parte("year"), parte("month") - 1, parte("day")));
  // Antes de las 9 la noche todavía es la del día anterior.
  if (parte("hour") % 24 < HORA_DE_CORTE) dia.setUTCDate(dia.getUTCDate() - 1);

  return dia.toISOString().slice(0, 10);
}

/**
 * Lo mismo, listo para mandar a la API. Es una cadena estable durante todo el
 * turno (siempre las 9:00:00.000), así que sirve de dependencia de un efecto
 * sin provocar un refresco por render.
 */
export function inicioDelTurnoISO(ahora: Date = new Date()): string {
  return inicioDelTurno(ahora).toISOString();
}
