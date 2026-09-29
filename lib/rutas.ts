// Qué rutas son del sitio público y cuáles son las pantallas internas del local.
//
// /cocina, /caja y /mozo no son páginas para el cliente: no llevan el header ni
// el footer del sitio, y no le preguntan al usuario "¿de qué local sos?",
// porque cada una tiene su propio selector de local adentro.
//
// La lista vive acá y no repetida en cada componente: cuando aparezca una
// cuarta pantalla interna, se agrega en un solo lugar.

export const RUTAS_INTERNAS = ["/cocina", "/caja", "/mozo"] as const;

export function esRutaInterna(pathname: string): boolean {
  return RUTAS_INTERNAS.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`));
}
