// En qué canal se avisan los pedidos de cada local.
//
// El nombre sale de acá y no escrito a mano en cada lado porque el servidor y
// las pantallas tienen que coincidir exactamente, y porque desarrollo y
// producción tienen que NO coincidir: las dos cosas usan las mismas claves de
// Pusher, así que una prueba hecha en una máquina le llegaba a las pantallas
// del local. Pasó: probando el cierre de caja se vaciaron las pantallas de
// cocina en pleno servicio.

export function canalDelLocal(local: string): string {
  const prefijo = process.env.NODE_ENV === "production" ? "cocina" : "dev-cocina";
  return `${prefijo}-${local}`;
}
