// Traduce eventos del DOM a intenciones del jugador. No conoce la física:
// solo avisa "saltó", "soltó", "quiere deslizarse".

import { SWIPE } from './config';

export interface InputHandlers {
  onJumpPress(): void;
  onJumpRelease(): void;
  onSlide(): void;
  onToggleDebug(): void;
}

function isJumpKey(e: KeyboardEvent): boolean {
  return e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ' || e.key === 'ArrowUp';
}

function isSlideKey(e: KeyboardEvent): boolean {
  return e.code === 'ArrowDown' || e.key === 'ArrowDown';
}

function isDebugKey(e: KeyboardEvent): boolean {
  return e.code === 'KeyD' || e.key === 'd' || e.key === 'D';
}

/**
 * Eventos que nacen en un control del DOM (el botón de reintentar) son del
 * navegador, no del juego. Sin esta guarda el preventDefault los rompe: en
 * touch anula el click sintetizado y el botón deja de responder, y con teclado
 * bloquea la activación con Espacio.
 */
function vieneDeUnControl(e: Event): boolean {
  const t = e.target;
  return t instanceof HTMLElement && t.closest('button, a, input, select, textarea') !== null;
}

/**
 * Conecta teclado, mouse y touch. Devuelve la función de limpieza: hay que
 * llamarla al desmontar o los listeners quedan colgados en window.
 *
 * `surface` es el elemento que recibe tap y swipe (el contenedor del canvas).
 */
export function attachInput(surface: HTMLElement, handlers: InputHandlers): () => void {
  // --- Teclado ---------------------------------------------------------
  const onKeyDown = (e: KeyboardEvent) => {
    if (vieneDeUnControl(e)) return;
    if (isJumpKey(e)) {
      e.preventDefault(); // que la barra espaciadora no scrollee la página
      if (!e.repeat) handlers.onJumpPress();
    } else if (isSlideKey(e)) {
      e.preventDefault();
      if (!e.repeat) handlers.onSlide();
    } else if (isDebugKey(e)) {
      // Sin preventDefault: la D no scrollea nada y así no pisamos atajos del navegador.
      if (!e.repeat) handlers.onToggleDebug();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (vieneDeUnControl(e)) return;
    if (isJumpKey(e)) {
      e.preventDefault();
      handlers.onJumpRelease();
    }
  };

  // --- Mouse -----------------------------------------------------------
  const onMouseDown = (e: MouseEvent) => {
    if (vieneDeUnControl(e)) return;
    e.preventDefault();
    handlers.onJumpPress();
  };

  // El mouseup va en window: si se suelta fuera del canvas, el salto igual se corta.
  const onMouseUp = () => handlers.onJumpRelease();

  // --- Touch -----------------------------------------------------------
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let swipeUsado = false;

  const onTouchStart = (e: TouchEvent) => {
    if (vieneDeUnControl(e)) return;
    e.preventDefault(); // sin esto la página scrollea y se disparan mouse events fantasma
    const t = e.changedTouches[0];
    startX = t.clientX;
    startY = t.clientY;
    startTime = performance.now();
    swipeUsado = false;
    // El salto arranca acá para que mantener apretado dé un salto más alto.
    handlers.onJumpPress();
  };

  const onTouchMove = (e: TouchEvent) => {
    if (vieneDeUnControl(e)) return;
    e.preventDefault();
    if (swipeUsado) return;

    const t = e.changedTouches[0];
    const dy = t.clientY - startY;
    const dx = Math.abs(t.clientX - startX);
    const dt = performance.now() - startTime;

    // Swipe hacia abajo: más de 30px verticales en menos de 300ms, y más
    // vertical que horizontal.
    if (dy > SWIPE.MIN_DISTANCE_PX && dy > dx && dt < SWIPE.MAX_DURATION_MS) {
      swipeUsado = true;
      handlers.onJumpRelease(); // el toque deja de contar como salto sostenido
      handlers.onSlide();
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (vieneDeUnControl(e)) return;
    e.preventDefault();
    handlers.onJumpRelease();
  };

  // Si la ventana pierde el foco con el botón apretado, el salto quedaría trabado.
  const onBlur = () => handlers.onJumpRelease();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onBlur);
  surface.addEventListener('mousedown', onMouseDown);
  // passive:false es obligatorio: sin eso el navegador ignora el preventDefault.
  surface.addEventListener('touchstart', onTouchStart, { passive: false });
  surface.addEventListener('touchmove', onTouchMove, { passive: false });
  surface.addEventListener('touchend', onTouchEnd, { passive: false });
  surface.addEventListener('touchcancel', onTouchEnd, { passive: false });

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('blur', onBlur);
    surface.removeEventListener('mousedown', onMouseDown);
    surface.removeEventListener('touchstart', onTouchStart);
    surface.removeEventListener('touchmove', onTouchMove);
    surface.removeEventListener('touchend', onTouchEnd);
    surface.removeEventListener('touchcancel', onTouchEnd);
  };
}
