// Dibujado. No toca el estado: solo lee GameState y pinta.

import {
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  HORIZON_Y,
  INGREDIENT_ORDER,
  MULTIPLIER_FRAMES,
  PX_POR_CUADRO_DE_CORRIDA,
  PALETTE,
  TUTORIAL,
  TUTORIAL_COPY,
} from './config';
import { spritesListos, type Frame } from './sprites';
import {
  ingredientHitbox,
  obstacleHitbox,
  obstacleSpriteRect,
  playerHitbox,
  playerSpriteRect,
  type GameState,
  type Ingredient,
  type Obstacle,
  type Player,
} from './engine';

/** Cerros insinuados: base, ancho y altura de cada silueta. */
const HILLS: ReadonlyArray<{ x: number; w: number; h: number }> = [
  { x: -30, w: 110, h: 58 },
  { x: 46, w: 88, h: 40 },
  { x: 112, w: 130, h: 64 },
  { x: 190, w: 96, h: 44 },
];

function drawBackground(ctx: CanvasRenderingContext2D): void {
  // Cielo
  ctx.fillStyle = PALETTE.sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Cerros: siluetas apoyadas sobre la línea del piso.
  // Se dibujan por columnas de 1px (no como triángulos) para que las diagonales
  // queden escalonadas y sin antialias: ningún píxel mezcla colores de la paleta.
  ctx.fillStyle = PALETTE.hills;
  for (const hill of HILLS) {
    const half = hill.w / 2;
    for (let i = 0; i < hill.w; i += 1) {
      const x = Math.round(hill.x) + i;
      if (x < 0 || x >= GAME_WIDTH) continue;
      const t = 1 - Math.abs(i - half) / half; // 0 en los bordes, 1 en la cima
      const h = Math.round(hill.h * t);
      if (h > 0) ctx.fillRect(x, GROUND_Y - h, 1, h);
    }
  }

  // Franja de horizonte
  ctx.fillRect(0, HORIZON_Y, GAME_WIDTH, 1);

  // Piso
  ctx.fillStyle = PALETTE.street;
  ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

  // Borde y marcas de la calle (frame es color de escenario)
  ctx.fillStyle = PALETTE.frame;
  ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 2);
  for (let x = 0; x < GAME_WIDTH; x += 24) {
    ctx.fillRect(x, GROUND_Y + 40, 12, 2);
  }
}

function drawObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[]): void {
  // Placeholder del tamaño de la HITBOX, igual que el jugador: lo que se ve es
  // exactamente lo que mata. danger es exclusivo de los obstáculos.
  ctx.fillStyle = PALETTE.danger;
  for (const o of obstacles) {
    if (!o.active) continue;
    const box = obstacleHitbox(o);
    ctx.fillRect(Math.round(box.x), Math.round(box.y), box.w, box.h);
  }
}

/**
 * Silueta de cada ingrediente dentro de su caja de 24x24, como fracciones de la
 * caja: [desde, alto] en 0..1. Se distinguen por FORMA porque el color está
 * fijado por la paleta: todos los ingredientes son pickup.
 *
 * La hitbox sigue siendo los 24x24 completos: acá lo generoso juega a favor del
 * jugador, al revés que en un obstáculo.
 */
const FORMA_INGREDIENTE: Record<string, { desde: number; alto: number; domo: boolean }> = {
  PAN_ABAJO: { desde: 0.5, alto: 0.5, domo: false },
  CARNE: { desde: 0.28, alto: 0.44, domo: false },
  QUESO: { desde: 0.4, alto: 0.2, domo: false },
  PAN_ARRIBA: { desde: 0, alto: 0.55, domo: true },
};

function drawIngredients(ctx: CanvasRenderingContext2D, ingredients: Ingredient[]): void {
  ctx.fillStyle = PALETTE.pickup;
  for (const ing of ingredients) {
    if (!ing.active) continue;
    const box = ingredientHitbox(ing);
    const x = Math.round(box.x);
    const y = Math.round(box.y);
    const forma = FORMA_INGREDIENTE[ing.type];
    const alto = Math.round(box.h * forma.alto);
    const top = y + Math.round(box.h * forma.desde);

    if (!forma.domo) {
      ctx.fillRect(x, top, box.w, alto);
      continue;
    }
    // Pan de arriba: domo escalonado, por filas, sin antialias.
    for (let f = 0; f < alto; f += 1) {
      const recorte = Math.round(((alto - 1 - f) / (alto - 1)) * (box.w / 3));
      ctx.fillRect(x + recorte, top + f, box.w - recorte * 2, 1);
    }
  }
}

/**
 * Cuadro de la animación de corrida.
 *
 * Sale de los píxeles recorridos y no del reloj: así la animación va atada a la
 * velocidad del scroll (ver PX_POR_CUADRO_DE_CORRIDA en config.ts). Como
 * `scrolled` se congela al chocar, la animación se congela con él.
 */
function cuadroDeCorrida(scrolled: number, cantidad: number): number {
  return Math.floor(scrolled / PX_POR_CUADRO_DE_CORRIDA) % cantidad;
}

/** El cuadro que le toca al estado actual, o null si los sprites no cargaron. */
function cuadroDelJugador(state: GameState): Frame | null {
  const sprites = spritesListos();
  if (!sprites) return null;

  switch (state.player.state) {
    case 'RUNNING':
      return sprites.correr[cuadroDeCorrida(state.scrolled, sprites.correr.length)];
    case 'JUMPING':
      return sprites.saltar;
    case 'SLIDING':
      return sprites.deslizar;
    case 'HIT':
      return sprites.golpe;
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
  const p = state.player;
  const cuadro = cuadroDelJugador(state);

  if (cuadro) {
    const spr = playerSpriteRect(p);
    const x = Math.round(spr.x);
    // ajusteY baja el cuadro hasta que el dibujo quede apoyado en los pies: cada
    // pose deja distinta cantidad de aire abajo de su cuadro de 48x48.
    const y = Math.round(spr.y) + cuadro.ajusteY;

    // El contorno primero, corrido un píxel: es la silueta engordada en accent.
    // Al tapar con la imagen encima queda solo el borde de 1px.
    ctx.drawImage(cuadro.contorno, x - 1, y - 1);
    ctx.drawImage(cuadro.imagen, x, y);
    return;
  }

  // Respaldo por si los sprites no cargaron: el juego se sigue pudiendo jugar.
  // La forma es la hitbox: 30x42 de pie, 30x21 pegado al piso.
  const box = playerHitbox(p);
  const x = Math.round(box.x);
  const y = Math.round(box.y);

  ctx.fillStyle = p.state === 'HIT' ? PALETTE.white : PALETTE.clothes;
  ctx.fillRect(x, y, box.w, box.h);

  // Contorno permanente en accent, para despegarlo del fondo oscuro. Más grueso
  // en el aire: los estados se distinguen por FORMA, nunca por color.
  const grosor = p.state === 'JUMPING' ? 2 : 1;
  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = grosor;
  ctx.strokeRect(x + grosor / 2, y + grosor / 2, box.w - grosor, box.h - grosor);
}

/**
 * Overlay de debug (tecla D). Muestra la relación entre el sprite y la hitbox,
 * que es justo lo que no se puede ver mirando al jugador. Se va junto con el
 * contador de FPS cuando el juego salga a producción.
 */
function drawDebugOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  const p = state.player;
  const spr = playerSpriteRect(p);
  const box = playerHitbox(p);

  ctx.save();
  ctx.strokeStyle = PALETTE.white;
  ctx.lineWidth = 1;

  // Espacio que ocupa el sprite de 48x48 alrededor de la hitbox.
  ctx.globalAlpha = 0.35;
  ctx.strokeRect(Math.round(spr.x) + 0.5, Math.round(spr.y) + 0.5, spr.w - 1, spr.h - 1);

  // Hitbox actual, la única que colisiona.
  ctx.globalAlpha = 0.7;
  ctx.strokeRect(Math.round(box.x) + 0.5, Math.round(box.y) + 0.5, box.w - 1, box.h - 1);
  ctx.restore();

  ctx.font = '8px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = PALETTE.white;
  ctx.fillText(`${box.w}x${box.h}`, Math.round(box.x), Math.max(10, Math.round(spr.y) - 2));

  // Huella del sprite real de cada obstáculo, alrededor de su hitbox.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = PALETTE.white;
  ctx.lineWidth = 1;
  for (const o of state.obstacles) {
    if (!o.active) continue;
    const r = obstacleSpriteRect(o);
    ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, r.w - 1, r.h - 1);
  }
  ctx.restore();
}

/**
 * Opacidad de un cartel del tutorial en un frame dado.
 *
 * Entra y sale con fundido para que no aparezca de golpe. Si el jugador ya
 * ejecutó la acción, el tramo termina antes: el cartel ya cumplió su función y
 * se va fundiéndose desde ese momento, sin cortarse de golpe.
 */
function alphaTutorial(
  step: number,
  desde: number,
  hasta: number,
  hechoEnStep: number | null,
): number {
  if (step < desde) return 0;

  const fin = hechoEnStep === null ? hasta : Math.min(hasta, hechoEnStep + TUTORIAL.FADE_FRAMES);
  if (step > fin) return 0;

  const entrada = (step - desde) / TUTORIAL.FADE_FRAMES;
  const salida = (fin - step) / TUTORIAL.FADE_FRAMES;
  return Math.max(0, Math.min(1, entrada, salida));
}

/** Flecha triangular, dibujada por filas de 1px para que no tenga antialias. */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  hacia: 'arriba' | 'abajo',
): void {
  const filas = 6;
  for (let i = 0; i < filas; i += 1) {
    const ancho = 1 + i * 2;
    const fy = hacia === 'arriba' ? y + i : y + (filas - 1 - i);
    ctx.fillRect(Math.round(cx - ancho / 2), fy, ancho, 1);
  }
}

/**
 * Carteles del tutorial, durante el warmup. No bloquean nada: el mundo sigue
 * corriendo detrás y el jugador puede ignorarlos.
 */
function drawTutorial(ctx: CanvasRenderingContext2D, state: GameState): void {
  const copy = TUTORIAL_COPY[state.inputKind];
  const saltoAlpha = alphaTutorial(state.steps, 0, TUTORIAL.JUMP_UNTIL, state.jumpedAtStep);
  const slideAlpha = alphaTutorial(
    state.steps,
    TUTORIAL.JUMP_UNTIL,
    TUTORIAL.SLIDE_UNTIL,
    state.slidAtStep,
  );
  if (saltoAlpha <= 0 && slideAlpha <= 0) return;

  const cx = GAME_WIDTH / 2;
  ctx.save();
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.accent;

  if (saltoAlpha > 0) {
    ctx.globalAlpha = saltoAlpha;
    drawArrow(ctx, cx, 140, 'arriba');
    ctx.fillText(copy.jump, cx, 156);
  }

  if (slideAlpha > 0) {
    ctx.globalAlpha = slideAlpha;
    ctx.fillText(copy.slide, cx, 140);
    drawArrow(ctx, cx, 150, 'abajo');
  }

  ctx.restore();
}

/**
 * La hamburguesa armándose, arriba a la derecha. Se dibuja de abajo hacia
 * arriba, en el mismo orden en que hay que juntarla: la capa de más abajo es el
 * primer ingrediente.
 *
 * Juntadas van en pickup, las que faltan quedan como contorno tenue en white.
 * Al errar, todas parpadean en white: el error se marca por parpadeo y no por
 * color, porque danger está reservado a los obstáculos.
 */
function drawBurger(ctx: CanvasRenderingContext2D, state: GameState): void {
  const ancho = 20;
  const alto = 4;
  const sep = 1;
  const x = GAME_WIDTH - 4 - ancho;
  const base = 16; // y de la capa de más abajo

  const parpadeo = state.errorFlashFrames > 0 && Math.floor(state.errorFlashFrames / 4) % 2 === 0;

  for (let i = 0; i < INGREDIENT_ORDER.length; i += 1) {
    const y = base - i * (alto + sep);
    const juntado = i < state.sequenceIndex;

    if (parpadeo) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(x, y, ancho, alto);
      continue;
    }

    if (juntado) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = PALETTE.pickup;
      ctx.fillRect(x, y, ancho, alto);
    } else {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = PALETTE.white;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, ancho - 1, alto - 1);
    }
  }
  ctx.globalAlpha = 1;
}

/** Multiplicador y su barra de tiempo. Solo aparece con un combo activo. */
function drawMultiplier(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.multiplierFrames <= 0) return;

  const ancho = 20;
  const x = GAME_WIDTH - 4 - ancho;
  const y = 22;

  ctx.fillStyle = PALETTE.accent;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`x${state.multiplier}`, GAME_WIDTH - 4, y);

  // Barra: se vacía de derecha a izquierda a medida que corre el tiempo.
  const restante = Math.max(0, Math.min(1, state.multiplierFrames / MULTIPLIER_FRAMES));
  ctx.globalAlpha = 0.3;
  ctx.fillRect(x, y + 10, ancho, 2);
  ctx.globalAlpha = 1;
  ctx.fillRect(x, y + 10, Math.round(ancho * restante), 2);
}

function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.font = '8px monospace';
  ctx.textBaseline = 'top';

  // Puntaje, arriba a la izquierda.
  ctx.fillStyle = PALETTE.accent;
  ctx.textAlign = 'left';
  ctx.fillText(String(state.score), 4, 4);

  drawBurger(ctx, state);
  drawMultiplier(ctx, state);

  // TODO: sacar el bloque de debug y el contador de FPS antes de publicar.
  if (!state.debug) return;
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.accent;
  const p = state.player;
  const spr = playerSpriteRect(p);
  const box = playerHitbox(p);
  ctx.fillText(`${state.fps} FPS`, 4, 16);
  ctx.fillText(p.state, 4, 26);
  ctx.fillText(`vy ${p.vy.toFixed(2)}`, 4, 36);
  ctx.fillText(`hit ${box.w}x${box.h}`, 4, 46);
  ctx.fillText(`spr ${spr.w}x${spr.h}`, 4, 56);
  ctx.fillText(`spd ${state.speed.toFixed(2)}`, 4, 66);
  let activos = 0;
  for (const o of state.obstacles) if (o.active) activos += 1;
  let ings = 0;
  for (const i of state.ingredients) if (i.active) ings += 1;
  ctx.fillText(`obs ${activos} ing ${ings}`, 4, 76);
  ctx.fillText(`seq ${state.sequenceIndex} x${state.multiplier}`, 4, 86);
  ctx.fillText(state.phase, 4, 96);
}

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  drawBackground(ctx);
  drawObstacles(ctx, state.obstacles);
  drawIngredients(ctx, state.ingredients);
  drawPlayer(ctx, state);
  drawTutorial(ctx, state);
  if (state.debug) drawDebugOverlay(ctx, state);
  drawHud(ctx, state);
}
