// Configuración base del juego. Solo constantes: sin lógica ni dibujado.

/** Resolución lógica del canvas (píxeles del juego, no del monitor). */
export const GAME_WIDTH = 240;
export const GAME_HEIGHT = 426;

/** Timestep fijo: la lógica corre siempre a 60 pasos por segundo. */
export const FPS = 60;
export const FIXED_DT = 1 / FPS;
/** Tope de tiempo por frame para evitar la "espiral de la muerte" al volver de una pestaña en segundo plano. */
export const MAX_FRAME_TIME = 0.25;

/** Escenario. */
export const HORIZON_Y = 236; // donde arrancan los cerros
export const GROUND_Y = 300; // línea del piso: todo lo que camina se apoya acá

/** El jugador tiene x fijo, el mundo se mueve hacia él. */
export const PLAYER_X = 55;

/**
 * Física del jugador. Las unidades son píxeles por PASO DE LÓGICA (1/60 s),
 * no por segundo: como el timestep es fijo, los valores se leen directo,
 * igual que en un runner clásico. Todo lo tuneable del salto vive acá.
 */
export const PHYSICS = {
  /** Se suma a la velocidad vertical en cada paso. */
  GRAVITY: 0.65,
  /** Velocidad vertical al despegar. Negativa = hacia arriba. */
  JUMP_IMPULSE: -10.5,
  /**
   * Salto de altura variable: si se suelta el botón antes del pico,
   * la velocidad vertical se multiplica por esto y el salto se corta.
   */
  JUMP_CUT_MULTIPLIER: 0.4,
  /** Caída rápida cuando se pide slide estando en el aire. */
  FAST_FALL_SPEED: 12,
} as const;

/** Duración del slide, en frames de lógica (30 = medio segundo a 60 fps). */
export const SLIDE_FRAMES = 30;

/**
 * Ventana de gracia para un slide pedido en el aire: si el jugador no aterriza
 * dentro de estos frames, el pedido se descarta.
 *
 * Sin caducidad, un swipe al principio de un salto largo dispara un slide medio
 * segundo después, cuando el jugador ya se olvidó de haberlo pedido, y lo mata
 * contra un obstáculo que había que saltar. El slide tiene que leerse como
 * respuesta a lo que el jugador acaba de hacer, no como algo que el juego se
 * acordó de hacer.
 */
export const SLIDE_BUFFER_FRAMES = 12;

/** Umbrales para leer un swipe hacia abajo como pedido de slide. */
export const SWIPE = {
  /** Desplazamiento vertical mínimo, en píxeles de pantalla (no del juego). */
  MIN_DISTANCE_PX: 30,
  /** Ventana máxima: más lento que esto es un arrastre, no un swipe. */
  MAX_DURATION_MS: 300,
} as const;

/**
 * Tamaño VISUAL del sprite y HITBOX de colisión son dos cosas distintas.
 * El sprite es lo que se ve; la hitbox es lo único que colisiona.
 * Al reemplazar los placeholders por imágenes reales se cambia `sprite`, NUNCA `hitbox`.
 *
 * `hitboxOffset` es la posición de la hitbox dentro del sprite, medida desde
 * la esquina superior izquierda del sprite.
 */
export interface Size {
  w: number;
  h: number;
}

export interface SpriteSpec {
  /** Tamaño dibujado en pantalla. */
  sprite: Size;
  /** Tamaño que colisiona. */
  hitbox: Size;
  /** Desplazamiento de la hitbox dentro del sprite. */
  hitboxOffset: { x: number; y: number };
}

/** Centra la hitbox dentro del sprite (se evalúa una sola vez, al cargar el módulo). */
function centered(sprite: Size, hitbox: Size): SpriteSpec {
  return {
    sprite,
    hitbox,
    hitboxOffset: {
      x: (sprite.w - hitbox.w) / 2,
      y: (sprite.h - hitbox.h) / 2,
    },
  };
}

export const SPRITES = {
  /** Hitbox a propósito más chica que el sprite: el juego se siente justo, no injusto. */
  player: centered({ w: 48, h: 48 }, { w: 30, h: 42 }),
  crate: centered({ w: 36, h: 36 }, { w: 32, h: 32 }),
  /**
   * La hitbox es 10 px más angosta que el sprite: la rueda delantera queda como
   * voladizo visual, sin colisión. Recurso estándar para que la moto se sienta
   * justa en vez de golpear con aire.
   */
  bike: centered({ w: 60, h: 36 }, { w: 44, h: 32 }),
  sign: centered({ w: 48, h: 30 }, { w: 44, h: 26 }),
  ingredient: centered({ w: 24, h: 24 }, { w: 24, h: 24 }),
} as const satisfies Record<string, SpriteSpec>;

export type SpriteName = keyof typeof SPRITES;

/**
 * Hitbox del jugador mientras se desliza: mismo ancho, la mitad de alto.
 * No lleva `hitboxOffset` vertical porque va pegada al piso, no centrada
 * en el sprite. El ancho y la x salen igual de SPRITES.player.
 */
export const PLAYER_SLIDE_HITBOX: Size = { w: 30, h: 21 };

// ---------------------------------------------------------------------------
// Mundo, puntaje y obstáculos
// ---------------------------------------------------------------------------

/** Scroll del mundo, en píxeles por frame. */
export const WORLD = {
  SPEED_START: 3.5,
  SPEED_STEP: 0.2,
  SPEED_MAX: 7.3,
  /** Cada cuántos frames sube un escalón de velocidad (600 = 10 s a 60 fps). */
  SPEED_RAMP_FRAMES: 600,
} as const;

/**
 * Arranque en blanco: el spawner no genera nada antes de este frame (300 = 5 s).
 * El scroll y la rampa de velocidad corren normalmente desde el frame 0, así que
 * al terminar el warmup ya hay velocidad y el primer obstáculo entra sin escalón.
 *
 * El primer cajón caía a 1.3 s con la ventana más ajustada de toda la partida,
 * justo cuando el jugador todavía no probó los controles. Cinco segundos de
 * pista vacía le dan lugar a saltar sin consecuencias.
 */
export const WARMUP_FRAMES = 300;

/** Píxeles de scroll por punto de puntaje. */
export const PX_PER_POINT = 13;

/** Congelamiento tras el choque, antes de la pantalla de fin de partida. */
export const FREEZE_FRAMES = 30;

export type ObstacleType = 'CAJON' | 'MOTO' | 'CARTEL';

/** Qué sprite (y por lo tanto qué hitbox) le corresponde a cada tipo. */
export const OBSTACLE_SPRITE = {
  CAJON: 'crate',
  MOTO: 'bike',
  CARTEL: 'sign',
} as const satisfies Record<ObstacleType, SpriteName>;

/**
 * Altura a la que cuelga el cartel: borde INFERIOR de su hitbox.
 *
 * Tiene que caer entre la cabeza del jugador de pie (GROUND_Y - 42 = 258) y la
 * del jugador deslizándose (GROUND_Y - 21 = 279). En 270 quedan 12 px de
 * solapamiento corriendo y 9 px de aire agachado.
 */
export const SIGN_HITBOX_BOTTOM_Y = 270;

/**
 * Velocidad mínima a la que cada obstáculo entra en juego.
 *
 * La dificultad de un obstáculo NO crece con la velocidad, baja: cuanto más
 * rápido pasa, menos frames tarda en cruzar al jugador y más margen sobra
 * dentro del salto o del slide. Por eso los anchos entran escalonados.
 */
export const UNLOCK_SPEED = {
  CAJON: 0,
  CARTEL: 3.9,
  // Las velocidades alcanzables son SPEED_START + 0.2k, o sea 3.5, 3.7, 3.9,
  // 4.1, 4.3, 4.5... El 4.4 no existe: un umbral ahí se comportaba igual que
  // 4.5 pero mentía sobre cuándo entra la moto. El número escrito es el real.
  MOTO: 4.5,
} as const satisfies Record<ObstacleType, number>;

/**
 * Piso de jugabilidad, en frames. Si a la velocidad actual un obstáculo deja
 * menos margen que esto entre la duración de la maniobra y lo que tarda en
 * cruzar al jugador, no se spawnea.
 *
 * Es una red de seguridad permanente, no un parche: UNLOCK_SPEED son números
 * escritos a mano para las constantes de HOY, y esta guarda los respalda
 * calculando la ventana real. Si mañana alguien cambia la gravedad, el impulso
 * del salto o una hitbox, los obstáculos que se vuelvan imposibles dejan de
 * aparecer solos en lugar de matar al jugador sin escapatoria.
 */
export const MIN_EXECUTION_WINDOW_FRAMES = 6;

/**
 * Separación mínima entre obstáculos:
 *
 *   distanciaMínima = speed * (CLEAR_FRAMES + REACTION_FRAMES) + anchoDelAnterior
 *
 * Es proporcional a la velocidad porque la física del jugador está medida en
 * FRAMES, no en píxeles: un salto completo dura 34 frames pase lo que pase con
 * el scroll. El mundo avanza `speed` píxeles por frame, así que el hueco que
 * hace falta para que al jugador le alcance el tiempo es velocidad × frames.
 * Con una distancia fija, al llegar a SPEED_MAX el mismo hueco se recorrería en
 * menos de la mitad de los frames y la secuencia pasaría a ser insuperable.
 *
 * Se le suma el ancho del obstáculo anterior porque la distancia se mide entre
 * bordes izquierdos, y RANDOM_FRAMES agrega variedad sin bajar nunca del piso.
 */
export const SPAWN = {
  /** Frames que dura un salto completo, medidos sobre la física real. */
  CLEAR_FRAMES: 34,
  /** Margen para ver el obstáculo y reaccionar. */
  REACTION_FRAMES: 18,
  /** Variación aleatoria máxima, también en frames. */
  RANDOM_FRAMES: 40,
} as const;

/**
 * Tamaño del pool de obstáculos. Se crean todos al inicio y se reciclan: en
 * partida no se instancia ni se descarta nada, así el GC no corre en medio del
 * juego. Con la separación mínima nunca hay más de 2 o 3 en pantalla.
 */
export const OBSTACLE_POOL_SIZE = 8;

/**
 * Paleta cerrada. Reglas de uso, válidas en todo el juego:
 * - Escenario y fondo: SOLO sky, hills, street, frame.
 * - Obstáculos: SOLO danger. Ningún otro elemento usa ese color.
 * - Ingredientes: pickup.
 * - HUD y textos: accent y white.
 * - Jugador: relleno clothes + contorno permanente de 1px en accent.
 */
export const PALETTE = {
  furLight: '#8B4A22',
  furDark: '#5C2E14',
  clothes: '#141118',
  gold: '#E8B33C',
  white: '#F2F0E8',
  sky: '#1A0E2E',
  hills: '#3D1F5C',
  street: '#2A1840',
  frame: '#0D0716',
  danger: '#FF3D8F',
  accent: '#3DF0E0',
  pickup: '#FF9E2C',
} as const;

export type PaletteColor = (typeof PALETTE)[keyof typeof PALETTE];
