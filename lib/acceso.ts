// Quién puede entrar a /cocina, /caja y /mozo.
//
// ⚠️ ESTE ARCHIVO ES SÓLO DE SERVIDOR. No lo importes desde un componente con
// "use client": los PIN quedarían dentro del bundle de JavaScript y cualquiera
// que abra el sitio podría leerlos. Lo usan el middleware, los route handlers
// y los componentes de servidor, nada más.
//
// Antes el PIN se comparaba en el navegador y el "estás adentro" era un
// sessionStorage que el propio visitante podía escribir a mano. Ahora:
//
//   1. El PIN viaja una sola vez a /api/acceso y se compara en el servidor.
//   2. El servidor devuelve una cookie HttpOnly firmada con HMAC-SHA256.
//   3. El middleware verifica esa firma antes de servir la página.
//
// Sin el secreto no se puede fabricar una cookie válida, y el PIN nunca está
// en el código que baja el navegador.

import { COOKIE_ACCESO, esRol, type Rol } from "./roles";

export { COOKIE_ACCESO };

/** Cuánto dura una sesión. Una tablet de cocina no puede estar logueándose todos los días. */
export const DURACION_MS = 30 * 24 * 60 * 60 * 1000;

const VARIABLE_PIN: Record<Rol, string> = {
  cocina: "PIN_COCINA",
  caja: "PIN_CAJA",
  mozo: "PIN_MOZO",
};

/**
 * Los PIN anteriores, que ya estaban dentro del bundle público y por lo tanto
 * no son ningún secreto. Quedan como respaldo para que nadie se quede afuera
 * si falta configurar las variables, pero lo que corresponde es definirlas.
 */
const PIN_VIEJO: Record<Rol, string> = {
  cocina: "cocina2026",
  caja: "chesnodumba",
  mozo: "mozo2026",
};

export function pinDe(rol: Rol): string {
  const configurado = process.env[VARIABLE_PIN[rol]]?.trim();
  return configurado || PIN_VIEJO[rol];
}

/** true si ese rol todavía usa el PIN viejo, el que estuvo público. */
export function usaPinViejo(rol: Rol): boolean {
  return !process.env[VARIABLE_PIN[rol]]?.trim();
}

function secreto(): string | null {
  const valor = process.env.ACCESO_SECRET?.trim();
  // Un secreto corto es tan malo como no tenerlo: se puede probar a fuerza bruta.
  return valor && valor.length >= 16 ? valor : null;
}

/** false cuando falta ACCESO_SECRET: sin eso no se puede firmar nada. */
export function hayConfiguracion(): boolean {
  return secreto() !== null;
}

// ─────────────────────────────────────────
// Firma
// ─────────────────────────────────────────

const codificador = new TextEncoder();

// Importar la clave cuesta, y el middleware corre en cada request.
let claveCacheada: { secreto: string; clave: Promise<CryptoKey> } | null = null;

function clave(valor: string): Promise<CryptoKey> {
  if (claveCacheada?.secreto === valor) return claveCacheada.clave;
  const importada = crypto.subtle.importKey(
    "raw",
    codificador.encode(valor),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  claveCacheada = { secreto: valor, clave: importada };
  return importada;
}

function aBase64Url(bytes: ArrayBuffer): string {
  let texto = "";
  for (const byte of new Uint8Array(bytes)) texto += String.fromCharCode(byte);
  return btoa(texto).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function firmar(cuerpo: string, valor: string): Promise<string> {
  const firma = await crypto.subtle.sign("HMAC", await clave(valor), codificador.encode(cuerpo));
  return aBase64Url(firma);
}

/**
 * Comparación que tarda lo mismo aunque las cadenas difieran en el primer
 * carácter. Con un `===` común, el tiempo de respuesta filtra cuánto acertó
 * quien está probando firmas.
 */
function igualesEnTiempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

// ─────────────────────────────────────────
// Token
// ─────────────────────────────────────────

/**
 * Arma el valor de la cookie: `rol.vence.firma`. El vencimiento va adentro de
 * lo firmado, así que no se puede estirar editando la cookie.
 *
 * Devuelve null si falta ACCESO_SECRET.
 */
export async function armarToken(rol: Rol, ahora = Date.now()): Promise<string | null> {
  const valor = secreto();
  if (!valor) return null;
  const cuerpo = `${rol}.${ahora + DURACION_MS}`;
  return `${cuerpo}.${await firmar(cuerpo, valor)}`;
}

/**
 * Devuelve el rol si la cookie es auténtica y no venció. Cualquier otra cosa
 * —cookie ausente, manoseada, vencida, o sin secreto configurado— es null.
 */
export async function leerToken(
  token: string | undefined | null,
  ahora = Date.now(),
): Promise<Rol | null> {
  const valor = secreto();
  if (!valor || !token) return null;

  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [rol, vence, firma] = partes;

  if (!esRol(rol)) return null;

  const esperada = await firmar(`${rol}.${vence}`, valor);
  if (!igualesEnTiempoConstante(firma, esperada)) return null;

  // Recién después de verificar la firma tiene sentido mirar el vencimiento.
  const limite = Number(vence);
  if (!Number.isFinite(limite) || limite <= ahora) return null;

  return rol;
}

// ─────────────────────────────────────────
// Guardia para los route handlers
// ─────────────────────────────────────────

/**
 * El rol de quien manda el pedido, según su cookie, o null si no tiene una
 * válida. Las rutas que leen o cambian pedidos la usan: el middleware cuida las
 * páginas, pero una API abierta se puede llamar con curl sin pasar por ninguna.
 */
export async function rolDeLaCookie(req: {
  cookies: { get(nombre: string): { value: string } | undefined };
}): Promise<Rol | null> {
  return leerToken(req.cookies.get(COOKIE_ACCESO)?.value);
}
