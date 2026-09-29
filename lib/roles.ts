// Los tres roles internos del local y cómo se los nombra en pantalla.
//
// Esto no tiene secretos: lo puede importar cualquiera, cliente o servidor.
// Los PIN y la firma de la cookie viven en lib/acceso.ts, que nunca tiene que
// llegar al navegador.

export const ROLES = ["cocina", "caja", "mozo"] as const;

export type Rol = (typeof ROLES)[number];

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === "string" && (ROLES as readonly string[]).includes(valor);
}

const ETIQUETAS: Record<Rol, string> = {
  cocina: "Cocina",
  caja: "Caja",
  mozo: "Mozo",
};

export function etiquetaDe(rol: Rol): string {
  return ETIQUETAS[rol];
}

/** La ruta de cada rol, que es también lo que protege el middleware. */
export function rutaDe(rol: Rol): string {
  return `/${rol}`;
}

/**
 * Dónde viaja el acceso. Es una cookie HttpOnly: el JavaScript de la página no
 * la puede leer ni escribir, sólo el servidor.
 */
export const COOKIE_ACCESO = "dolkastar_acceso";
