// Loop, estado y simulación. No dibuja nada: eso es responsabilidad de render.ts.

import {
  FIXED_DT,
  FPS,
  FREEZE_FRAMES,
  GAME_WIDTH,
  GROUND_Y,
  MAX_FRAME_TIME,
  MIN_EXECUTION_WINDOW_FRAMES,
  OBSTACLE_POOL_SIZE,
  OBSTACLE_SPRITE,
  PHYSICS,
  PLAYER_SLIDE_HITBOX,
  PLAYER_X,
  PX_PER_POINT,
  SIGN_HITBOX_BOTTOM_Y,
  SLIDE_BUFFER_FRAMES,
  SLIDE_FRAMES,
  SPAWN,
  SPRITES,
  UNLOCK_SPEED,
  WARMUP_FRAMES,
  WORLD,
  type ObstacleType,
  type SpriteSpec,
} from './config';
import { render } from './render';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Máquina de estados del jugador. */
export type PlayerState = 'RUNNING' | 'JUMPING' | 'SLIDING' | 'HIT';

/** Fase de la partida. FREEZE es el congelamiento entre el choque y el final. */
export type Phase = 'PLAYING' | 'FREEZE' | 'GAME_OVER';

export interface Player {
  /** x fijo del SPRITE: el jugador no avanza, el mundo se mueve hacia él. */
  x: number;
  /**
   * Referencia vertical única: posición de los pies, o sea el borde inferior
   * de la hitbox. Se guarda así y no como "top" porque la altura de la hitbox
   * cambia con el estado (42 corriendo, 21 deslizándose) y los pies no.
   */
  feetY: number;
  /** Velocidad vertical en px por paso. Negativa = subiendo. */
  vy: number;
  state: PlayerState;
  /** Frames que le quedan al slide en curso. */
  slideTimer: number;
  /**
   * Frames de vida que le quedan a un slide pedido en el aire.
   * Mayor a cero = hay un pedido pendiente; en cero, no hay nada encolado.
   */
  slideBuffer: number;
}

/**
 * Obstáculo del pool. `active` es lo único que decide si participa: no se
 * crean ni se descartan instancias durante la partida.
 */
export interface Obstacle {
  type: ObstacleType;
  /** Esquina superior izquierda del SPRITE. */
  x: number;
  y: number;
  active: boolean;
}

export interface GameState {
  player: Player;
  /** Pool completo. Recorrer siempre filtrando por `active`. */
  obstacles: Obstacle[];
  phase: Phase;
  /** Frames que faltan para pasar de FREEZE a GAME_OVER. */
  freezeTimer: number;
  /** Velocidad de scroll actual, en px por frame. */
  speed: number;
  /** Píxeles de mundo recorridos en esta partida. */
  scrolled: number;
  /** Píxeles recorridos desde el último spawn. */
  sinceSpawn: number;
  /** Distancia que hay que recorrer antes del próximo spawn. */
  nextGap: number;
  /** Tipo del último obstáculo generado, para vetar combinaciones imposibles. */
  lastType: ObstacleType | null;
  score: number;
  /** Segundos de tiempo simulado (suma de pasos fijos, no de tiempo real). */
  elapsed: number;
  /** Cantidad de pasos de lógica ejecutados. */
  steps: number;
  /** FPS de render medidos, solo para el HUD de debug. */
  fps: number;
  /** Overlay de debug, apagado por defecto. Se prende con la tecla D. */
  debug: boolean;
}

/**
 * Distancia hasta el próximo obstáculo. Ver el comentario de SPAWN en config.ts:
 * el piso es proporcional a la velocidad porque el tiempo que necesita el
 * jugador está medido en frames, no en píxeles.
 */
function gapFor(speed: number, anchoAnterior: number): number {
  const minimo = speed * (SPAWN.CLEAR_FRAMES + SPAWN.REACTION_FRAMES) + anchoAnterior;
  return minimo + Math.random() * SPAWN.RANDOM_FRAMES * speed;
}

export function createState(): GameState {
  // El pool se llena una sola vez, acá.
  const obstacles: Obstacle[] = [];
  for (let i = 0; i < OBSTACLE_POOL_SIZE; i += 1) {
    obstacles.push({ type: 'CAJON', x: 0, y: 0, active: false });
  }

  return {
    player: {
      x: PLAYER_X,
      feetY: GROUND_Y, // apoyado sobre el piso
      vy: 0,
      state: 'RUNNING',
      slideTimer: 0,
      slideBuffer: 0,
    },
    obstacles,
    phase: 'PLAYING',
    freezeTimer: 0,
    speed: WORLD.SPEED_START,
    scrolled: 0,
    sinceSpawn: 0,
    nextGap: gapFor(WORLD.SPEED_START, 0),
    lastType: null,
    score: 0,
    elapsed: 0,
    steps: 0,
    fps: 0,
    debug: false,
  };
}

/**
 * Reinicia la partida sin asignar memoria nueva: reusa el pool y el jugador.
 * Conserva `fps` y `debug`, que son del entorno y no de la partida.
 */
export function resetState(state: GameState): void {
  const p = state.player;
  p.x = PLAYER_X;
  p.feetY = GROUND_Y;
  p.vy = 0;
  p.state = 'RUNNING';
  p.slideTimer = 0;
  p.slideBuffer = 0;

  for (const o of state.obstacles) o.active = false;

  state.phase = 'PLAYING';
  state.freezeTimer = 0;
  state.speed = WORLD.SPEED_START;
  state.scrolled = 0;
  state.sinceSpawn = 0;
  state.nextGap = gapFor(WORLD.SPEED_START, 0);
  state.lastType = null;
  state.score = 0;
  state.elapsed = 0;
  state.steps = 0;
}

// ---------------------------------------------------------------------------
// Hitboxes
// ---------------------------------------------------------------------------

/**
 * Hitbox en coordenadas del mundo a partir de la posición del sprite.
 * Todo chequeo de colisión debe pasar por acá: nunca se colisiona contra el sprite.
 */
export function hitboxRect(spec: SpriteSpec, x: number, y: number): Rect {
  return {
    x: x + spec.hitboxOffset.x,
    y: y + spec.hitboxOffset.y,
    w: spec.hitbox.w,
    h: spec.hitbox.h,
  };
}

/**
 * Hitbox del jugador según su estado. Deslizándose mide 30x21 pegada al piso;
 * en el resto de los estados, 30x42. El ancho y la x no cambian nunca.
 */
export function playerHitbox(p: Player): Rect {
  const box = p.state === 'SLIDING' ? PLAYER_SLIDE_HITBOX : SPRITES.player.hitbox;
  return {
    x: p.x + SPRITES.player.hitboxOffset.x,
    y: p.feetY - box.h,
    w: box.w,
    h: box.h,
  };
}

/**
 * Rectángulo donde va a dibujarse el sprite real de 48x48 cuando reemplace al
 * placeholder: centrado sobre la hitbox de pie y apoyado en los pies.
 * La hitbox no depende de esto.
 */
export function playerSpriteRect(p: Player): Rect {
  const { sprite, hitbox, hitboxOffset } = SPRITES.player;
  return {
    x: p.x,
    y: p.feetY - hitbox.h - hitboxOffset.y,
    w: sprite.w,
    h: sprite.h,
  };
}

export function obstacleSpec(type: ObstacleType): SpriteSpec {
  return SPRITES[OBSTACLE_SPRITE[type]];
}

export function obstacleHitbox(o: Obstacle): Rect {
  return hitboxRect(obstacleSpec(o.type), o.x, o.y);
}

export function obstacleSpriteRect(o: Obstacle): Rect {
  const { sprite } = obstacleSpec(o.type);
  return { x: o.x, y: o.y, w: sprite.w, h: sprite.h };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------------------------------------------------------------------------
// Acciones: lo que el input le pide al jugador. No tocan el DOM.
// ---------------------------------------------------------------------------

function isGrounded(p: Player): boolean {
  return p.feetY >= GROUND_Y;
}

/** Botón de salto apretado. Durante el slide no se puede saltar. */
export function pressJump(state: GameState): void {
  if (state.phase !== 'PLAYING') return;
  const p = state.player;
  if (p.state === 'SLIDING' || p.state === 'HIT') return;
  if (!isGrounded(p)) return;

  p.vy = PHYSICS.JUMP_IMPULSE;
  p.state = 'JUMPING';
  p.slideBuffer = 0;
}

/** Botón de salto soltado: si todavía venía subiendo, se corta el impulso. */
export function releaseJump(state: GameState): void {
  const p = state.player;
  if (p.state !== 'JUMPING') return;
  if (p.vy < 0) p.vy *= PHYSICS.JUMP_CUT_MULTIPLIER;
}

/**
 * Pedido de slide.
 * - En el piso corriendo: arranca el slide.
 * - En el aire: cae rápido y el slide queda encolado para el aterrizaje, pero
 *   solo por SLIDE_BUFFER_FRAMES. Esto es lo que hace usable el swipe en touch,
 *   donde el touchstart ya disparó un salto antes de que el gesto se pueda
 *   reconocer, sin que un pedido viejo reviva medio salto después.
 */
export function pressSlide(state: GameState): void {
  if (state.phase !== 'PLAYING') return;
  const p = state.player;
  if (p.state === 'HIT' || p.state === 'SLIDING') return;

  if (isGrounded(p)) {
    p.state = 'SLIDING';
    p.slideTimer = SLIDE_FRAMES;
    p.slideBuffer = 0;
    return;
  }

  p.vy = Math.max(p.vy, PHYSICS.FAST_FALL_SPEED);
  p.slideBuffer = SLIDE_BUFFER_FRAMES;
}

/** Prende y apaga el overlay de debug. Se va junto con el contador de FPS. */
export function toggleDebug(state: GameState): void {
  state.debug = !state.debug;
}

/** Choque contra un obstáculo: HIT, congelamiento y después fin de partida. */
export function hitPlayer(state: GameState): void {
  if (state.phase !== 'PLAYING') return;
  const p = state.player;
  p.state = 'HIT';
  p.slideTimer = 0;
  p.slideBuffer = 0;
  state.phase = 'FREEZE';
  state.freezeTimer = FREEZE_FRAMES;
}

// ---------------------------------------------------------------------------
// Jugabilidad: ¿es superable este obstáculo a esta velocidad?
// ---------------------------------------------------------------------------

/**
 * Frames que un salto completo mantiene los pies por encima de cierta altura.
 * Integra igual que updatePlayer(), así que sale directo de PHYSICS: si mañana
 * cambian la gravedad o el impulso, este número cambia solo.
 */
function jumpFramesAbove(altura: number): number {
  let vy = PHYSICS.JUMP_IMPULSE;
  let h = 0; // altura de los pies sobre el piso
  let frames = 0;

  for (let i = 0; i < 600; i += 1) {
    vy += PHYSICS.GRAVITY;
    h -= vy; // vy negativa = subiendo
    if (h <= 0) break; // aterrizó
    if (h > altura) frames += 1;
  }
  return frames;
}

/** Frames que la maniobra correcta mantiene al jugador a salvo de este tipo. */
function safeFrames(type: ObstacleType): number {
  const spec = obstacleSpec(type);

  if (type === 'CARTEL') {
    // Se pasa agachado: el slide sirve solo si la hitbox del cartel queda por
    // encima de la cabeza del jugador deslizándose.
    const cabezaAgachado = GROUND_Y - PLAYER_SLIDE_HITBOX.h;
    if (SIGN_HITBOX_BOTTOM_Y > cabezaAgachado) return 0; // ni agachado entra
    return SLIDE_FRAMES;
  }

  // Se salta: hay que librar el borde superior de su hitbox.
  const alturaALibrar = spec.sprite.h - spec.hitboxOffset.y;
  return jumpFramesAbove(alturaALibrar);
}

/**
 * Frames que el obstáculo tarda en cruzar la hitbox del jugador: desde que se
 * tocan los bordes hasta que se separan.
 */
export function transitFrames(type: ObstacleType, speed: number): number {
  const ancho = obstacleSpec(type).hitbox.w + SPRITES.player.hitbox.w;
  return ancho / speed;
}

/**
 * VENTANA DE EJECUCIÓN: cuántos frames de margen tiene el jugador para elegir
 * el momento de la maniobra. Es la duración de la maniobra menos lo que el
 * obstáculo tarda en cruzarlo. En cero hay una única solución frame-perfect;
 * en negativo no hay ninguna y el obstáculo es imposible.
 *
 * Baja con obstáculos más anchos y SUBE con la velocidad, que es lo que hace
 * falta para entender por qué los anchos se desbloquean por velocidad.
 *
 * Es una estimación: contrastada contra un barrido de todos los timings
 * posibles de disparo, cae entre 1.7 frames por debajo y 1.1 por encima del
 * valor real. Alcanza de sobra para decidir un piso, pero no la uses como
 * medida exacta ni la ajustes a menos de ~2 frames de margen.
 */
export function executionWindowFrames(type: ObstacleType, speed: number): number {
  return safeFrames(type) - transitFrames(type, speed);
}

/**
 * VENTANA DE REACCIÓN: frames desde que el obstáculo asoma por el borde derecho
 * hasta que su hitbox toca al jugador. Es el tiempo para verlo y decidir, y
 * BAJA con la velocidad — la curva opuesta a la ventana de ejecución.
 */
export function reactionFrames(type: ObstacleType, speed: number): number {
  const spec = obstacleSpec(type);
  const bordeIzquierdoAlEntrar = GAME_WIDTH + spec.hitboxOffset.x;
  const bordeDerechoDelJugador = PLAYER_X + SPRITES.player.hitboxOffset.x + SPRITES.player.hitbox.w;
  return (bordeIzquierdoAlEntrar - bordeDerechoDelJugador) / speed;
}

/** Rechazos ya avisados, para no repetir el mismo log en cada spawn. */
const rechazosAvisados = new Set<string>();

function avisarRechazo(type: ObstacleType, speed: number, ventana: number): void {
  if (process.env.NODE_ENV === 'production') return;
  const clave = `${type}@${speed.toFixed(1)}`;
  if (rechazosAvisados.has(clave)) return;
  rechazosAvisados.add(clave);
  console.warn(
    `[juego] ${type} descartado a speed ${speed.toFixed(2)}: ventana de ejecución ` +
      `${ventana.toFixed(1)} frames, por debajo del mínimo de ${MIN_EXECUTION_WINDOW_FRAMES}. ` +
      'Revisá UNLOCK_SPEED, las hitboxes o la física del salto en config.ts.',
  );
}

/**
 * Tipos que pueden aparecer a esta velocidad. Dos filtros encadenados:
 * UNLOCK_SPEED (curva de dificultad, escrita a mano) y la ventana de ejecución
 * real (red de seguridad, calculada). El segundo es el que protege de cambios
 * futuros de física.
 */
function tiposDisponibles(speed: number, lastType: ObstacleType | null): ObstacleType[] {
  const candidatos: ObstacleType[] = ['CAJON', 'MOTO', 'CARTEL'];
  const ok: ObstacleType[] = [];

  for (const type of candidatos) {
    // Un CARTEL justo después de una MOTO es inencadenable: el salto largo de
    // la moto deja al jugador en el aire, y al cartel hay que llegar agachado.
    if (type === 'CARTEL' && lastType === 'MOTO') continue;
    if (speed < UNLOCK_SPEED[type]) continue;

    const ventana = executionWindowFrames(type, speed);
    if (ventana < MIN_EXECUTION_WINDOW_FRAMES) {
      avisarRechazo(type, speed, ventana);
      continue;
    }
    ok.push(type);
  }
  return ok;
}

// ---------------------------------------------------------------------------
// Mundo: velocidad, spawner y obstáculos
// ---------------------------------------------------------------------------

/** Velocidad de scroll para un frame dado. Escalonada, con tope. */
function speedAt(steps: number): number {
  const escalones = Math.floor(steps / WORLD.SPEED_RAMP_FRAMES);
  return Math.min(WORLD.SPEED_MAX, WORLD.SPEED_START + escalones * WORLD.SPEED_STEP);
}

/** Y del sprite según el tipo: los de piso se apoyan, el cartel cuelga. */
function spawnY(type: ObstacleType): number {
  const spec = obstacleSpec(type);
  if (type === 'CARTEL') {
    // Se posiciona por el borde inferior de la HITBOX, que es lo que decide si
    // el jugador pasa agachado; el sprite se acomoda alrededor.
    return SIGN_HITBOX_BOTTOM_Y - spec.hitbox.h - spec.hitboxOffset.y;
  }
  // Apoyado: el sprite toca el piso. La hitbox queda 2 px más arriba, el mismo
  // criterio indulgente que usa el jugador.
  return GROUND_Y - spec.sprite.h;
}

function spawnObstacle(state: GameState): void {
  const libre = state.obstacles.find((o) => !o.active);
  if (!libre) return; // pool lleno: se saltea el spawn en vez de asignar memoria

  const opciones = tiposDisponibles(state.speed, state.lastType);
  if (opciones.length === 0) {
    // Nada superable a esta velocidad: mejor pista vacía que muerte segura.
    // Se reintenta en el próximo hueco, ya con otra velocidad.
    state.sinceSpawn = 0;
    state.nextGap = gapFor(state.speed, 0);
    return;
  }

  const type = opciones[Math.floor(Math.random() * opciones.length)];
  libre.type = type;
  libre.x = GAME_WIDTH; // entra justo por el borde derecho
  libre.y = spawnY(type);
  libre.active = true;

  state.lastType = type;
  state.sinceSpawn = 0;
  state.nextGap = gapFor(state.speed, obstacleSpec(type).sprite.w);
}

function updateWorld(state: GameState): void {
  state.speed = speedAt(state.steps);
  state.scrolled += state.speed;
  state.score = Math.floor(state.scrolled / PX_PER_POINT);

  for (const o of state.obstacles) {
    if (!o.active) continue;
    o.x -= state.speed;
    // Fuera de pantalla por izquierda: vuelve al pool.
    if (o.x + obstacleSpec(o.type).sprite.w < 0) o.active = false;
  }

  // sinceSpawn corre también durante el warmup, así que el primer obstáculo
  // sale exactamente en WARMUP_FRAMES y no un hueco después.
  state.sinceSpawn += state.speed;
  if (state.steps < WARMUP_FRAMES) return;
  if (state.sinceSpawn >= state.nextGap) spawnObstacle(state);
}

function checkCollisions(state: GameState): void {
  const caja = playerHitbox(state.player);
  for (const o of state.obstacles) {
    if (!o.active) continue;
    if (overlaps(caja, obstacleHitbox(o))) {
      hitPlayer(state);
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Simulación
// ---------------------------------------------------------------------------

function updatePlayer(p: Player): void {
  if (p.state === 'SLIDING') {
    p.slideTimer -= 1;
    if (p.slideTimer <= 0) {
      p.state = 'RUNNING';
      p.slideTimer = 0;
    }
  }

  // Física vertical. Corre siempre, también en HIT: el jugador cae al piso.
  p.vy += PHYSICS.GRAVITY;
  p.feetY += p.vy;

  if (p.feetY >= GROUND_Y) {
    const aterrizando = p.state === 'JUMPING';
    p.feetY = GROUND_Y;
    p.vy = 0;

    if (aterrizando) {
      if (p.slideBuffer > 0) {
        p.state = 'SLIDING';
        p.slideTimer = SLIDE_FRAMES;
      } else {
        p.state = 'RUNNING';
      }
      p.slideBuffer = 0;
    }
  }

  // La caducidad se descuenta DESPUÉS del aterrizaje: tocar el piso justo en el
  // último frame de la ventana todavía cuenta como slide válido.
  if (p.slideBuffer > 0) p.slideBuffer -= 1;
}

/** Un paso de lógica. `dt` siempre vale FIXED_DT. */
export function update(state: GameState, dt: number): void {
  state.elapsed += dt;
  state.steps += 1;

  if (state.phase === 'FREEZE') {
    // Todo congelado: solo corre el reloj del golpe.
    state.freezeTimer -= 1;
    if (state.freezeTimer <= 0) state.phase = 'GAME_OVER';
    return;
  }

  if (state.phase === 'GAME_OVER') return;

  updatePlayer(state.player);
  updateWorld(state);
  checkCollisions(state);
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

export interface GameOptions {
  /**
   * Se dispara una sola vez, cuando termina el congelamiento.
   * `durationMs` es tiempo simulado y descuenta el freeze: es lo que el jugador
   * estuvo efectivamente jugando hasta el choque.
   */
  onGameOver?: (score: number, durationMs: number) => void;
}

export interface Game {
  state: GameState;
  start(): void;
  stop(): void;
  restart(): void;
  /** Acciones para conectar el input. */
  pressJump(): void;
  releaseJump(): void;
  pressSlide(): void;
  toggleDebug(): void;
}

export function createGame(ctx: CanvasRenderingContext2D, options: GameOptions = {}): Game {
  const state = createState();

  let rafId = 0;
  let running = false;
  let last = 0;
  let accumulator = 0;
  let fpsFrames = 0;
  let fpsWindow = 0;

  const frame = (now: number) => {
    rafId = requestAnimationFrame(frame);

    // Tiempo real transcurrido, acotado para que una pestaña en segundo plano
    // no dispare cientos de updates de golpe al volver.
    const frameTime = Math.min((now - last) / 1000, MAX_FRAME_TIME);
    last = now;

    // Timestep fijo: update() corre a 60 pasos/s pase lo que pase con el refresh rate.
    accumulator += frameTime;
    while (accumulator >= FIXED_DT) {
      const faseAntes = state.phase;
      update(state, FIXED_DT);
      // El aviso sale del loop y no de update() para que salte una sola vez.
      if (faseAntes !== 'GAME_OVER' && state.phase === 'GAME_OVER') {
        const jugados = Math.max(0, state.steps - FREEZE_FRAMES);
        options.onGameOver?.(state.score, Math.round((jugados / FPS) * 1000));
      }
      accumulator -= FIXED_DT;
    }

    fpsFrames += 1;
    fpsWindow += frameTime;
    if (fpsWindow >= 0.5) {
      state.fps = Math.round(fpsFrames / fpsWindow);
      fpsFrames = 0;
      fpsWindow = 0;
    }

    render(ctx, state);
  };

  return {
    state,
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      accumulator = 0;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
    },
    restart: () => resetState(state),
    pressJump: () => pressJump(state),
    releaseJump: () => releaseJump(state),
    pressSlide: () => pressSlide(state),
    toggleDebug: () => toggleDebug(state),
  };
}
