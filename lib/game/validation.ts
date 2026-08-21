// Validación de lo que manda el cliente al registrar un puntaje.
// Cada función devuelve null si está bien, o el mensaje de error si no.

import { tienePalabraProhibida } from './badwords';
import { PLAYER_NAME_MAX, PLAYER_NAME_MIN } from './server-config';

/** Letras (con acentos y ñ), números y espacios. Nada más. */
const NOMBRE_PERMITIDO = /^[\p{L}\p{N} ]+$/u;

export function validarPlayerName(valor: unknown): { error: string } | { nombre: string } {
  if (typeof valor !== 'string') return { error: 'Falta el nombre del jugador.' };

  const nombre = valor.trim().replace(/\s+/g, ' ');

  if (nombre.length < PLAYER_NAME_MIN || nombre.length > PLAYER_NAME_MAX) {
    return { error: `El nombre tiene que tener entre ${PLAYER_NAME_MIN} y ${PLAYER_NAME_MAX} caracteres.` };
  }
  if (!NOMBRE_PERMITIDO.test(nombre)) {
    return { error: 'El nombre solo puede tener letras, números y espacios.' };
  }
  if (tienePalabraProhibida(nombre)) {
    return { error: 'Ese nombre no se puede usar. Probá con otro.' };
  }
  return { nombre };
}

/**
 * Teléfono argentino. Se normaliza a los 10 dígitos reales (código de área +
 * abonado) sacando lo que sobra: prefijo internacional, el 9 de móvil, el 0 de
 * larga distancia y el 15 viejo que todavía mucha gente escribe.
 *
 * Ejemplos que entran: 3835517049 · 383 5517049 · +54 9 3835 517049 ·
 * 03835 15 517049 · 011 4321 1234
 */
export function validarWhatsapp(valor: unknown): { error: string } | { whatsapp: string | null } {
  if (valor === undefined || valor === null || valor === '') return { whatsapp: null };
  if (typeof valor !== 'string') return { error: 'El WhatsApp tiene un formato inválido.' };

  let n = valor.replace(/\D/g, '');

  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('54')) n = n.slice(2);
  if (n.startsWith('9')) n = n.slice(1); // ningún código de área argentino empieza con 9
  if (n.startsWith('0')) n = n.slice(1);

  // El 15 va después del código de área, que mide entre 2 y 4 dígitos.
  if (n.length === 12) {
    for (const largoArea of [2, 3, 4]) {
      if (n.slice(largoArea, largoArea + 2) === '15') {
        n = n.slice(0, largoArea) + n.slice(largoArea + 2);
        break;
      }
    }
  }

  if (n.length !== 10) {
    return { error: 'El WhatsApp tiene que ser un número argentino válido, con código de área.' };
  }
  return { whatsapp: n };
}

/** Puntaje: entero, positivo y por debajo del tope duro. */
export function validarScore(valor: unknown, max: number): { error: string } | { score: number } {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return { error: 'El puntaje tiene que ser un número.' };
  }
  if (!Number.isInteger(valor)) return { error: 'El puntaje tiene que ser un número entero.' };
  if (valor <= 0) return { error: 'El puntaje tiene que ser mayor a cero.' };
  if (valor >= max) return { error: 'El puntaje excede el máximo posible.' };
  return { score: valor };
}
