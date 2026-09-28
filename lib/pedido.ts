// Pedido por WhatsApp: el carrito, el total y el mensaje que se manda.
//
// Está separado de la UI a propósito: el formato del mensaje es lo que lee la
// persona que cocina, así que conviene poder revisarlo y cambiarlo en un solo
// lugar, sin abrir componentes.

import type { Local } from "@/data/locales";

export type Variante = "Simple" | "Doble" | "Triple";

export type Linea = {
  /** Identifica la línea: mismo plato con distinta variante son dos líneas. */
  clave: string;
  nombre: string;
  variante?: Variante;
  precioUnitario: number;
  cantidad: number;
  /** Lo que pidió el cliente para ese plato: "sin tomate", "bien cocida". */
  aclaracion?: string;
  /** Las bebidas no llevan aclaraciones: no hay nada que sacarles. */
  esBebida?: boolean;
};

export type Modalidad = "local" | "llevar";

export function claveDeLinea(nombre: string, variante?: Variante): string {
  return variante ? `${nombre}::${variante}` : nombre;
}

export function formatearPrecio(n: number): string {
  return "$" + n.toLocaleString("es-AR");
}

export function totalDe(lineas: Linea[]): number {
  return lineas.reduce((suma, l) => suma + l.precioUnitario * l.cantidad, 0);
}

export function cantidadTotal(lineas: Linea[]): number {
  return lineas.reduce((suma, l) => suma + l.cantidad, 0);
}

/**
 * El mensaje que llega al WhatsApp del local.
 *
 * El precio de cada línea es el de la línea entera (cantidad x unitario), para
 * que los números de arriba sumen el TOTAL de abajo y quien atiende no tenga
 * que multiplicar nada.
 */
export function armarMensaje(datos: {
  local: Local;
  cliente: string;
  modalidad: Modalidad;
  direccion: string;
  lineas: Linea[];
}): string {
  const { local, cliente, modalidad, direccion, lineas } = datos;

  const partes = [
    `🍔 NUEVO PEDIDO - Dolka Star ${local.ciudad}`,
    `Cliente: ${cliente}`,
    `Modalidad: ${modalidad === "llevar" ? "Para llevar" : "Consumir en el local"}`,
  ];

  if (modalidad === "llevar") partes.push(`Dirección: ${direccion}`);

  partes.push("Pedido:");
  for (const l of lineas) {
    const variante = l.variante ? ` (${l.variante})` : "";
    partes.push(
      `- ${l.cantidad}x ${l.nombre}${variante}: ${formatearPrecio(l.precioUnitario * l.cantidad)}`,
    );
    // La aclaración va colgada de su plato, no al final del mensaje: en la
    // cocina se lee plato por plato.
    const aclaracion = l.aclaracion?.trim();
    if (aclaracion) partes.push(`↳ ${aclaracion}`);
  }
  partes.push(`TOTAL: ${formatearPrecio(totalDe(lineas))}`);

  return partes.join("\n");
}

/** Link de WhatsApp con el mensaje ya cargado. */
export function linkDePedido(numero: string, mensaje: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Las opciones de una bebida que se vende con varias marcas al mismo precio,
 * como "Coca-Cola / Fanta / Sprite 350ml".
 *
 * Solo cuenta la barra CON espacios alrededor. La carta tiene "Agua Mineral
 * 1/2L", donde la barra es media medida y no una opción: partir por cualquier
 * barra la convertiría en "Agua Mineral 1" y "2L".
 *
 * El formato o tamaño que viene al final ("350ml", "(lata)") es de todas, así
 * que se le pega a cada una: "Fanta 350ml", "Pepsi (lata)". Se lo reconoce
 * porque empieza con un número o un paréntesis, que es lo que separa una medida
 * de un nombre de marca.
 */
export function opcionesDeBebida(nombre: string): string[] {
  const partes = nombre.split(/\s+\/\s+/);
  if (partes.length < 2) return [];

  const palabras = partes[partes.length - 1].split(" ");
  let corte = palabras.length;
  while (corte > 1 && /^[\d(]/.test(palabras[corte - 1])) corte -= 1;

  const sufijo = palabras.slice(corte).join(" ");
  const marcas = [...partes.slice(0, -1), palabras.slice(0, corte).join(" ")];

  return marcas.map((marca) => (sufijo ? `${marca} ${sufijo}` : marca));
}
