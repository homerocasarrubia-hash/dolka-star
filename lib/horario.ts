// Cuándo se toman pedidos.
//
// El local abre de noche. Un pedido que entra a las tres de la tarde no lo va a
// ver nadie hasta que alguien encienda la pantalla, así que directamente no se
// toma: es mejor decirle al cliente que estamos cerrados que dejarlo esperando
// una hamburguesa que nadie está haciendo.

/** Desde qué hora se aceptan pedidos del sitio. */
export const HORA_APERTURA = 20;

/**
 * La hora se mira siempre en Catamarca, no en el reloj del visitante. Alguien
 * de otra provincia o de viaje tiene que ver el horario del local, no el suyo.
 * Argentina no cambia de hora, pero la zona se nombra igual para no depender de
 * un -3 escrito a mano.
 */
export const ZONA = "America/Argentina/Catamarca";

/** La hora del reloj de Catamarca, de 0 a 23. */
export function horaDelLocal(ahora: Date = new Date()): number {
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA,
    hour: "numeric",
    hour12: false,
  }).formatToParts(ahora);

  const hora = Number(partes.find((p) => p.type === "hour")?.value);
  // Algunos navegadores devuelven 24 en vez de 0 para la medianoche.
  return Number.isFinite(hora) ? hora % 24 : 0;
}

/**
 * ¿Se pueden tomar pedidos ahora?
 *
 * Abierto es de las 20 en adelante. Después de medianoche la hora vuelve a ser
 * chica (00, 01…), así que esas horas quedan cerradas, que es lo correcto: a
 * esa altura la cocina ya cerró.
 */
export function estaAbierto(ahora: Date = new Date()): boolean {
  return horaDelLocal(ahora) >= HORA_APERTURA;
}

/** Lo que se le dice al cliente cuando llega fuera de hora. */
export const AVISO_CERRADO = `Ahora estamos cerrados. Tomamos pedidos desde las ${HORA_APERTURA}:00.`;
