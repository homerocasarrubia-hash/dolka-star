// Dibujado. No toca el estado: solo lee GameState y pinta.

import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y, HORIZON_Y, PALETTE } from './config';
import {
  obstacleHitbox,
  obstacleSpriteRect,
  playerHitbox,
  playerSpriteRect,
  type GameState,
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

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player): void {
  // El placeholder se dibuja con la forma de la hitbox: 30x42 de pie,
  // 30x21 pegado al piso deslizándose. Los estados se distinguen por FORMA y
  // grosor de contorno, nunca por color: danger es exclusivo de los obstáculos.
  const box = playerHitbox(p);
  const x = Math.round(box.x);
  const y = Math.round(box.y);

  ctx.fillStyle = p.state === 'HIT' ? PALETTE.white : PALETTE.clothes;
  ctx.fillRect(x, y, box.w, box.h);

  // Contorno permanente en accent, para despegarlo del fondo oscuro. Se mantiene
  // cuando el placeholder pase a ser el sprite real. Más grueso en el aire.
  const grosor = p.state === 'JUMPING' ? 2 : 1;
  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = grosor;
  ctx.strokeRect(x + grosor / 2, y + grosor / 2, box.w - grosor, box.h - grosor);
}

/**
 * Overlay de debug (tecla D). Muestra la relación entre el sprite y la hitbox,
 * que es justo lo que no se puede ver mirando el placeholder. Se va junto con
 * el contador de FPS cuando entren los sprites reales.
 */
function drawDebugOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  const p = state.player;
  const spr = playerSpriteRect(p);
  const box = playerHitbox(p);

  ctx.save();
  ctx.strokeStyle = PALETTE.white;
  ctx.lineWidth = 1;

  // Espacio que va a ocupar el perro real: 48x48 alrededor de la hitbox.
  ctx.globalAlpha = 0.35;
  ctx.strokeRect(Math.round(spr.x) + 0.5, Math.round(spr.y) + 0.5, spr.w - 1, spr.h - 1);

  // Hitbox actual, la única que colisiona.
  ctx.globalAlpha = 0.7;
  ctx.strokeRect(Math.round(box.x) + 0.5, Math.round(box.y) + 0.5, box.w - 1, box.h - 1);
  ctx.restore();

  // Medidas de la hitbox, arriba del rect del sprite (sin salirse del canvas).
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

function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  // TODO: sacar el HUD de debug cuando arranque el gameplay.
  ctx.font = '8px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = PALETTE.accent;

  // Puntaje: es lo único del HUD que se queda cuando saquemos el debug.
  ctx.textAlign = 'right';
  ctx.fillText(String(state.score), GAME_WIDTH - 4, 4);
  ctx.textAlign = 'left';

  ctx.fillText(`${state.fps} FPS`, 4, 4);
  ctx.fillText(state.player.state, 4, 14);

  if (!state.debug) return;
  const p = state.player;
  const spr = playerSpriteRect(p);
  const box = playerHitbox(p);
  ctx.fillText(`vy ${p.vy.toFixed(2)}`, 4, 24);
  ctx.fillText(`hit ${box.w}x${box.h}`, 4, 34);
  ctx.fillText(`spr ${spr.w}x${spr.h}`, 4, 44);
  ctx.fillText(`spd ${state.speed.toFixed(2)}`, 4, 54);
  let activos = 0;
  for (const o of state.obstacles) if (o.active) activos += 1;
  ctx.fillText(`obs ${activos}/${state.obstacles.length}`, 4, 64);
  ctx.fillText(state.phase, 4, 74);
}

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  drawBackground(ctx);
  drawObstacles(ctx, state.obstacles);
  drawPlayer(ctx, state.player);
  if (state.debug) drawDebugOverlay(ctx, state);
  drawHud(ctx, state);
}
