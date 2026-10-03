// Cómo se pagó un pedido.
//
// `metodoPago` es una sola columna de texto, así que además de los métodos
// sueltos ("efectivo", "transferencia", "tarjeta", "arreglo") puede guardar un
// pago repartido entre dos medios:
//
//     mixto: efectivo $8000 / transferencia $4000
//
// El formato lo arma siempre `armarMixto`, nunca se escribe a mano, y se lee
// con una expresión estricta. Los montos van en pesos enteros y sin puntos
// justamente para que leerlos no dependa de cómo se formatee la plata.
//
// Lo importante de este archivo: el arqueo de caja suma por medio de pago. Si
// un pago mixto se tratara como un método más, su plata no caería ni en
// efectivo ni en transferencia y desaparecería del total del día. Por eso el
// reparto vive acá y lo usan tanto la pantalla como el CSV del cierre.

export const METODOS_SIMPLES = ["efectivo", "transferencia", "tarjeta", "arreglo"] as const;

export type MetodoSimple = (typeof METODOS_SIMPLES)[number];

const ES_SIMPLE = new Set<string>(METODOS_SIMPLES);

const MIXTO = /^mixto: efectivo \$(\d+) \/ transferencia \$(\d+)$/;

/** El texto que se guarda en la base para un pago repartido. */
export function armarMixto(efectivo: number, transferencia: number): string {
  return `mixto: efectivo $${Math.round(efectivo)} / transferencia $${Math.round(transferencia)}`;
}

/** Los dos montos de un pago mixto, o null si no es uno. */
export function leerMixto(metodoPago: string): { efectivo: number; transferencia: number } | null {
  const partes = MIXTO.exec(metodoPago.trim());
  if (!partes) return null;
  return { efectivo: Number(partes[1]), transferencia: Number(partes[2]) };
}

/** Lo que la API acepta como forma de pago. */
export function esMetodoValido(valor: unknown): valor is string {
  if (typeof valor !== "string") return false;
  return ES_SIMPLE.has(valor) || leerMixto(valor) !== null;
}

/**
 * Cuánta plata del pedido entró por cada medio.
 *
 * En un pago mixto la transferencia es exacta y el efectivo absorbe la
 * diferencia: si alguien paga $4000 por transferencia y entrega $10.000 en
 * efectivo por una cuenta de $12.000, en la caja quedan $8000 y los $2000 de
 * más volvieron como vuelto. Sumar lo entregado inflaría el arqueo.
 *
 * El "arreglo" devuelve todo en cero: salió sin que entrara plata.
 */
export function repartoDelPago(metodoPago: string, cobrado: number): Record<MetodoSimple, number> {
  const reparto: Record<MetodoSimple, number> = {
    efectivo: 0,
    transferencia: 0,
    tarjeta: 0,
    arreglo: 0,
  };

  const mixto = leerMixto(metodoPago);
  if (mixto) {
    reparto.transferencia = Math.min(mixto.transferencia, cobrado);
    reparto.efectivo = Math.max(0, cobrado - reparto.transferencia);
    return reparto;
  }

  if (ES_SIMPLE.has(metodoPago)) {
    // El arreglo se registra pero no suma: no es plata que esté en la caja.
    if (metodoPago !== "arreglo") reparto[metodoPago as MetodoSimple] = cobrado;
    return reparto;
  }

  // Un método viejo o desconocido se cuenta como efectivo antes que perderlo
  // del arqueo.
  reparto.efectivo = cobrado;
  return reparto;
}

const NOMBRE: Record<MetodoSimple, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  arreglo: "Arreglo",
};

function conPuntos(n: number): string {
  return "$" + n.toLocaleString("es-AR");
}

/** Cómo se muestra en pantalla y en el CSV. */
export function describirPago(metodoPago: string): string {
  const mixto = leerMixto(metodoPago);
  if (mixto) {
    return `Mixto — ${conPuntos(mixto.efectivo)} efectivo + ${conPuntos(mixto.transferencia)} transferencia`;
  }
  return NOMBRE[metodoPago as MetodoSimple] ?? metodoPago;
}

/** true si en el pago hay una transferencia, suelta o dentro de un mixto. */
export function llevaTransferencia(metodoPago: string): boolean {
  if (metodoPago === "transferencia") return true;
  const mixto = leerMixto(metodoPago);
  return mixto !== null && mixto.transferencia > 0;
}
