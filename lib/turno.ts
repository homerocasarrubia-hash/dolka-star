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

/** El arranque del turno en curso, en hora local. */
export function inicioDelTurno(ahora: Date = new Date()): Date {
  const inicio = new Date(ahora);
  inicio.setHours(HORA_DE_CORTE, 0, 0, 0);
  // Antes de las 9 todavía estamos en el turno que arrancó ayer.
  if (ahora.getHours() < HORA_DE_CORTE) inicio.setDate(inicio.getDate() - 1);
  return inicio;
}

/**
 * Lo mismo, listo para mandar a la API. Es una cadena estable durante todo el
 * turno (siempre las 9:00:00.000), así que sirve de dependencia de un efecto
 * sin provocar un refresco por render.
 */
export function inicioDelTurnoISO(ahora: Date = new Date()): string {
  return inicioDelTurno(ahora).toISOString();
}
