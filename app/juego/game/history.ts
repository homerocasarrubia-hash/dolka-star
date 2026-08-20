// Historial local de partidas, para medir el juego antes del lanzamiento.
// Vive solo en el navegador de quien juega: no se muestra en la UI ni se manda
// a ningún lado. Se puede leer desde la consola con readHistory() o mirando la
// clave directamente en localStorage.

const CLAVE = 'dolkastar.juego.historial.v1';

/** Cuántas partidas se conservan. Las más viejas se descartan. */
const MAX_PARTIDAS = 20;

export interface RunRecord {
  score: number;
  /** Tiempo jugado hasta el choque, sin contar el congelamiento. */
  durationMs: number;
  /** Date.now() al terminar la partida. */
  timestamp: number;
}

function esRegistro(v: unknown): v is RunRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.score === 'number' &&
    typeof r.durationMs === 'number' &&
    typeof r.timestamp === 'number'
  );
}

/** Partidas guardadas, de la más reciente a la más vieja. */
export function readHistory(): RunRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return [];

    const parseado: unknown = JSON.parse(crudo);
    if (!Array.isArray(parseado)) return [];

    // Filtramos en vez de confiar: es storage del usuario y puede tener
    // cualquier cosa, incluido el formato de una versión anterior.
    return parseado.filter(esRegistro).slice(0, MAX_PARTIDAS);
  } catch {
    // localStorage bloqueado (modo privado, permisos) o JSON corrupto.
    return [];
  }
}

/** Agrega una partida al historial. Nunca tira: si falla, no pasa nada. */
export function recordRun(score: number, durationMs: number): void {
  if (typeof window === 'undefined') return;

  try {
    const registro: RunRecord = { score, durationMs, timestamp: Date.now() };
    const historial = [registro, ...readHistory()].slice(0, MAX_PARTIDAS);
    window.localStorage.setItem(CLAVE, JSON.stringify(historial));
  } catch {
    // Guardar métricas de prueba no puede romper la partida.
  }
}
