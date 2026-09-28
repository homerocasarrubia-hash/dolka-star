// Los dos locales de Dolka Star.
//
// Todo lo que cambia entre uno y otro vive acá: dirección, teléfono, mapa y qué
// parte de la carta se muestra. Las páginas no saben de ciudades, le preguntan
// al local elegido.

export type LocalId = "andalgala" | "belen";

/**
 * Qué parte de la carta se muestra en un local.
 * `null` = la carta completa, tal cual está en data/menu.ts.
 */
export type Carta = {
  /** Categorías visibles, en este orden. */
  categorias: string[];
  /**
   * Categorías que van recortadas: solo estos ítems, por nombre exacto.
   * Las categorías que no aparecen acá se muestran enteras.
   */
  soloItems?: Record<string, string[]>;
} | null;

export type Local = {
  id: LocalId;
  /** Cómo se lo nombra en pantalla. */
  ciudad: string;
  direccion: string;
  /** Solo los dígitos, sin espacios. `null` mientras el local no tenga línea. */
  telefono: string | null;
  /**
   * A dónde van los pedidos del carrito, en formato internacional sin signos
   * (54 + 9 + área + abonado). Es un campo aparte de `telefono` porque son dos
   * cosas distintas: `telefono` es el que se publica en el sitio, este es la
   * caja donde caen los pedidos.
   */
  whatsappPedidos: string;
  horario: string;
  /** src del iframe de Google Maps. */
  mapa: string;
  /** Presentación de la portada: nombra la ciudad y lo que se cocina ahí. */
  intro: string;
  carta: Carta;
};

export const LOCALES: Record<LocalId, Local> = {
  andalgala: {
    id: "andalgala",
    ciudad: "Andalgalá",
    direccion: "Belgrano 363, Andalgalá, Catamarca",
    telefono: "3835517049",
    whatsappPedidos: "5493835517049",
    horario: "Lunes a domingo: 21:00 a 00:00",
    mapa: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3436.123456789!2d-66.3211!3d-27.5987!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sBelgrano+363%2C+Andalgal%C3%A1!5e0!3m2!1ses!2sar!4v1",
    intro:
      "En el corazón de Andalgalá, hacemos hamburguesas sin vueltas: buena carne, pan artesanal y sabor directo al hueso. También pizzas al horno de barro y lomitos que hablan por sí solos.",
    // Andalgalá tiene la carta completa.
    carta: null,
  },
  belen: {
    id: "belen",
    ciudad: "Belén",
    direccion: "Belgrano 56, Belén, Catamarca",
    // Todavía no hay línea propia: donde iría el teléfono, no va nada.
    telefono: "3835518217",
    whatsappPedidos: "5493835518217",
    horario: "Lunes a domingo: 21:00 a 00:00",
    // Mismo formato que el de Andalgalá, que es el que el sitio ya usa y anda:
    // el `pb` lleva las coordenadas de Belén y el texto del lugar en `!2s`.
    mapa: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3436.123456789!2d-67.0281!3d-27.6531!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sBelgrano+56%2C+Bel%C3%A9n%2C+Catamarca!5e0!3m2!1ses!2sar!4v1",
    // Belén no hace pizzas: la presentación nombra lo que sí se cocina ahí.
    intro:
      "En el corazón de Belén, hacemos hamburguesas sin vueltas: buena carne, pan artesanal y sabor directo al hueso. También lomitos, milanesas y picadas que hablan por sí solos.",
    carta: {
      // Belén no hace pizzas, pastas ni empanadas. El resto va completo, con
      // los mismos ítems y precios que Andalgalá.
      categorias: [
        "hamburguesas",
        "lomos",
        "milanesas",
        "milanesas-al-plato",
        "picadas",
        "papas-nuggets",
        "bebidas",
      ],
    },
  },
};

export const LOCALES_EN_ORDEN: Local[] = [LOCALES.andalgala, LOCALES.belen];

/**
 * Dónde vive la elección del visitante. La clave está acá y no en el provider
 * porque también la lee el juego, que corre en su propia ruta.
 */
export const CLAVE_LOCAL = "dolkastar.local.v1";

/**
 * Con qué local se trabaja si no hay ninguno elegido. Es el local original:
 * los puntajes viejos, de cuando había uno solo, son de Andalgalá.
 */
export const LOCAL_POR_DEFECTO: LocalId = "andalgala";

export function esLocalId(valor: unknown): valor is LocalId {
  return valor === "andalgala" || valor === "belen";
}

/**
 * El local elegido, leído del navegador. Devuelve el default si no hay nada
 * guardado, si el valor quedó viejo o si el storage está bloqueado.
 */
export function localGuardado(): LocalId {
  if (typeof window === "undefined") return LOCAL_POR_DEFECTO;
  try {
    const guardado = window.localStorage.getItem(CLAVE_LOCAL);
    return esLocalId(guardado) ? guardado : LOCAL_POR_DEFECTO;
  } catch {
    return LOCAL_POR_DEFECTO;
  }
}

/** Teléfono en formato lindo para mostrar: 3835 517049. */
export function telefonoLegible(telefono: string): string {
  return `${telefono.slice(0, 4)} ${telefono.slice(4)}`;
}

/** Link de WhatsApp, con el 9 que pide Argentina para celulares. */
export function whatsappHref(telefono: string): string {
  return `https://wa.me/549${telefono}`;
}
