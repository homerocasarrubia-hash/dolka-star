// Cuándo se toman pedidos.
//
// El local abre de noche y cierra pasada la medianoche, así que el "día" de
// trabajo no coincide con el del calendario: lo que se pide a la 00:30 del
// sábado es de la noche del viernes.
//
// Un pedido que entra a las tres de la tarde no lo va a ver nadie hasta que
// alguien encienda la pantalla, así que directamente no se toma: es mejor
// decirle al cliente que estamos cerrados que dejarlo esperando una
// hamburguesa que nadie está haciendo.

/** Desde qué hora se aceptan pedidos. */
export const HORA_APERTURA = 20;

/** Hasta qué hora de la madrugada, en minutos desde la medianoche. */
const CIERRE_NORMAL = 60; // 01:00
const CIERRE_FINDE = 90; // 01:30

/**
 * Las madrugadas que cierran más tarde, que son las de después de las noches
 * de viernes y de sábado.
 */
const MADRUGADAS_LARGAS = new Set([6, 0]); // sábado y domingo

/**
 * La hora se mira siempre en Catamarca, no en el reloj del visitante. Alguien
 * de otra provincia o de viaje tiene que ver el horario del local, no el suyo.
 * Argentina no cambia de hora, pero la zona se nombra igual para no depender de
 * un -3 escrito a mano.
 */
export const ZONA = "America/Argentina/Catamarca";

/** Minuto del día y día de la semana, los dos leídos en hora de Catamarca. */
function enElLocal(ahora: Date): { minutos: number; dia: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(ahora);

  const parte = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);

  // Algunos navegadores devuelven 24 en vez de 0 para la medianoche.
  const hora = parte("hour") % 24;

  // El día de la semana se saca de la fecha ya convertida a Catamarca: si se
  // usara `getDay()` del Date original saldría el día del aparato, que puede
  // estar en otra zona y a esta hora cambia de día antes o después.
  const dia = new Date(Date.UTC(parte("year"), parte("month") - 1, parte("day"))).getUTCDay();

  return { minutos: hora * 60 + parte("minute"), dia };
}

/** La hora del reloj de Catamarca, de 0 a 23. */
export function horaDelLocal(ahora: Date = new Date()): number {
  return Math.floor(enElLocal(ahora).minutos / 60);
}

/**
 * ¿Se pueden tomar pedidos ahora?
 *
 * De las 20 hasta la medianoche, todos los días. Pasada la medianoche sigue
 * abierto un rato más, porque la noche todavía no terminó: hasta la 01:00, y
 * hasta la 01:30 las madrugadas de sábado y domingo, que son las que siguen a
 * las noches de viernes y de sábado.
 */
export function estaAbierto(ahora: Date = new Date()): boolean {
  const { minutos, dia } = enElLocal(ahora);

  if (minutos >= HORA_APERTURA * 60) return true;

  return minutos < (MADRUGADAS_LARGAS.has(dia) ? CIERRE_FINDE : CIERRE_NORMAL);
}

function comoHora(minutos: number): string {
  const hh = String(Math.floor(minutos / 60)).padStart(2, "0");
  const mm = String(minutos % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * El horario para mostrar en el sitio.
 *
 * Sale de las mismas constantes que deciden si se toma o no un pedido. Antes
 * estaba escrito a mano en cuatro lugares distintos: el footer, la portada del
 * menú, la página de contacto y los datos de cada local. Con eso, cambiar el
 * horario era cambiarlo en cinco lugares y que alguno quedara viejo,
 * prometiéndole al cliente una hora que el sistema no respeta.
 */
export const HORARIO_TEXTO =
  `Todos los días ${HORA_APERTURA}:00 a ${comoHora(CIERRE_NORMAL)} ` +
  `(vie y sáb hasta ${comoHora(CIERRE_FINDE)})`;

/** Lo que se le dice al cliente cuando llega fuera de hora. */
export const AVISO_CERRADO =
  `Ahora estamos cerrados. Tomamos pedidos de ${HORA_APERTURA}:00 a ${comoHora(CIERRE_NORMAL)}, ` +
  `y viernes y sábados hasta las ${comoHora(CIERRE_FINDE)}.`;
