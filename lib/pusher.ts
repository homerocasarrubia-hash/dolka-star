// Cliente de Pusher para los route handlers.
//
// Se crea una sola vez y recién cuando hace falta. Antes cada route lo
// construía al importar el módulo con `process.env.X!`: si faltaba una
// variable, el constructor tiraba y se caía el archivo entero, así que POST,
// GET y PATCH devolvían 500 sin haber ejecutado una línea de código propio.
//
// Acá, si falta la configuración se pierde el aviso en tiempo real pero el
// pedido se guarda igual. La cocina se entera al recargar; con un 500 el
// pedido se perdía.

import Pusher from "pusher";

let pusher: Pusher | null = null;
let avisado = false;

export function notificador(): Pusher | null {
  if (pusher) return pusher;

  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    if (!avisado) {
      console.error(
        "[pusher] faltan variables de entorno: los pedidos se guardan igual, pero las pantallas no se actualizan solas",
      );
      avisado = true;
    }
    return null;
  }

  pusher = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
  });
  return pusher;
}

/**
 * Avisa a las pantallas de un local. Nunca tira: el aviso es un extra, no
 * puede voltear una operación que ya se guardó en la base.
 */
export async function avisar(
  local: string,
  evento: "nuevo-pedido" | "pedido-actualizado" | "caja-cerrada",
  datos: unknown,
): Promise<void> {
  try {
    await notificador()?.trigger(`cocina-${local}`, evento, datos);
  } catch (error) {
    console.error(`[pusher] no se pudo avisar "${evento}" a ${local}:`, error);
  }
}
