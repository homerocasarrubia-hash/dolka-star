// Identidad y preferencias del jugador, guardadas en este navegador.
//
// LIMITACIÓN ACEPTADA: la identidad vive en localStorage y nada más. Si el
// jugador borra los datos del navegador, usa modo incógnito, cambia de
// dispositivo o de navegador, arranca como un jugador nuevo: pierde su récord
// de la semana y aparecería de nuevo en el ranking con otra fila.
//
// Para un juego promocional de un bar es un intercambio razonable: no hay
// registro, ni contraseña, ni mail que confirmar, y jugar es tocar un botón. Si
// alguna vez hace falta identidad de verdad (que el récord siga al jugador
// entre dispositivos), hay que sumar login y esto pasa a ser solo un caché.

const CLAVE_PLAYER_ID = 'dolkastar.juego.playerId.v1';
const CLAVE_PERFIL = 'dolkastar.juego.perfil.v1';
const CLAVE_MEJOR = 'dolkastar.juego.mejor.v1';
const CLAVE_SEMANAL = 'dolkastar.juego.mejorSemanal.v1';

export interface Perfil {
  nombre: string;
  whatsapp: string;
}

function leer(clave: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null; // modo privado o permisos: no es motivo para romper el juego
  }
}

function escribir(clave: string, valor: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(clave, valor);
  } catch {
    /* guardar una preferencia no puede tumbar la partida */
  }
}

/** UUID v4 sin depender de crypto.randomUUID, que exige contexto seguro. */
function uuidDeReserva(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((n) => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Identidad del jugador. Se genera la primera vez que abre el juego y no cambia
 * más, salvo que borre los datos del navegador.
 */
export function obtenerPlayerId(): string {
  const guardado = leer(CLAVE_PLAYER_ID);
  if (guardado) return guardado;

  // randomUUID no existe en contexto inseguro (http en una IP de la red local),
  // que es justo como se prueba un sitio desde el celular antes de publicarlo.
  const nuevo = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : uuidDeReserva();
  escribir(CLAVE_PLAYER_ID, nuevo);
  return nuevo;
}

/** Nombre y WhatsApp. Se piden una sola vez, antes de la primera partida. */
export function obtenerPerfil(): Perfil | null {
  const crudo = leer(CLAVE_PERFIL);
  if (!crudo) return null;
  try {
    const v: unknown = JSON.parse(crudo);
    if (typeof v !== 'object' || v === null) return null;
    const o = v as Record<string, unknown>;
    if (typeof o.nombre !== 'string' || o.nombre.length === 0) return null;
    return { nombre: o.nombre, whatsapp: typeof o.whatsapp === 'string' ? o.whatsapp : '' };
  } catch {
    return null;
  }
}

export function guardarPerfil(perfil: Perfil): void {
  escribir(CLAVE_PERFIL, JSON.stringify(perfil));
}

/**
 * Mejor puntaje de la semana según el servidor, para resaltar la fila propia
 * en el ranking. Se guarda el nombre junto al puntaje porque la respuesta del
 * ranking no trae playerId (a propósito) y hay que emparejar por lo visible.
 */
export interface MejorSemanal {
  playerName: string;
  score: number;
}

export function mejorSemanal(): MejorSemanal | null {
  const crudo = leer(CLAVE_SEMANAL);
  if (!crudo) return null;
  try {
    const v: unknown = JSON.parse(crudo);
    if (typeof v !== 'object' || v === null) return null;
    const o = v as Record<string, unknown>;
    if (typeof o.playerName !== 'string' || typeof o.score !== 'number') return null;
    return { playerName: o.playerName, score: o.score };
  } catch {
    return null;
  }
}

export function guardarMejorSemanal(valor: MejorSemanal): void {
  escribir(CLAVE_SEMANAL, JSON.stringify(valor));
}

/** Mejor puntaje histórico en este navegador, para la pantalla de inicio. */
export function mejorPuntaje(): number {
  const crudo = leer(CLAVE_MEJOR);
  const n = crudo === null ? 0 : Number.parseInt(crudo, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Guarda el puntaje si supera al mejor. Devuelve true si hubo récord. */
export function registrarPuntaje(score: number): boolean {
  if (score <= mejorPuntaje()) return false;
  escribir(CLAVE_MEJOR, String(score));
  return true;
}
