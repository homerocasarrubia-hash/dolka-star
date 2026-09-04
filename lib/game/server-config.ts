// Límites de validación del servidor. Todo lo que decide si un puntaje entra o
// no vive acá, para que se revise en un solo lugar.

/**
 * Techo de puntos por segundo aceptado al registrar un puntaje.
 *
 * De dónde sale: a velocidad máxima el mundo corre a 7.3 px por frame, o sea
 * 438 px/s a 60 fps. Con un punto cada 13 px son ~34 puntos por segundo de pura
 * distancia, que con el multiplicador x4 llegan a ~135. Sumando ingredientes y
 * bonus de combo, una simulación de juego perfecto con el multiplicador clavado
 * en x4 da ~203 puntos por segundo sostenidos, y 243 en la mejor ventana de
 * 10 segundos. 300 deja margen holgado para no rechazar jamás a un jugador
 * legítimo.
 *
 * HAY QUE REVISARLO si cambian la física, la velocidad del mundo, PX_PER_POINT,
 * el valor de los ingredientes o el multiplicador de combo.
 */
export const MAX_POINTS_PER_SECOND = 300;

/** Una partida más corta que esto no pudo haber pasado de verdad. */
export const MIN_SESSION_SECONDS = 5;

/** Más que esto es una pestaña olvidada abierta, no una partida. */
export const MAX_SESSION_SECONDS = 15 * 60;

/** Cota dura del puntaje, independiente de la duración. */
export const MAX_SCORE = 1_000_000;

// El rate limit por IP se sacó a propósito: en el local todos los clientes
// comparten el WiFi, o sea una sola IP, y el límite los bloqueaba a todos.

/** Nombre que se muestra en la tabla. */
export const PLAYER_NAME_MIN = 3;
export const PLAYER_NAME_MAX = 12;

/** Zona horaria que define cuándo arranca la semana del ranking. */
export const LEADERBOARD_TIMEZONE = 'America/Argentina/Buenos_Aires';

/** Cuántos puestos devuelve el ranking, y por cuánto se cachea. */
export const LEADERBOARD_SIZE = 20;
export const LEADERBOARD_CACHE_SECONDS = 30;
