// Traduce eventos del DOM a intenciones del jugador. No conoce la física:
// solo avisa "saltó", "soltó", "quiere deslizarse".

import { SWIPE, type InputKind } from './config';

export interface InputHandlers {
  /** Teclado y mouse: el salto arranca en el acto. */
  onJumpPress(): void;
  onJumpRelease(): void;
  /**
   * Touch: no salta, abre la ventana de intención. El salto se compromete más
   * tarde, o se descarta si el gesto resulta ser un swipe hacia abajo.
   */
  onTouchStart(): void;
  /** El dedo bajó un poco más: la ventana de intención se estira. */
  onTouchDescend(): void;
  /** El dedo cambió de dirección: era un toque, resolver ya. */
  onTouchSettle(): void;
  onTouchRelease(): void;
  onTouchCancel(): void;
  onSlide(): void;
  onToggleDebug(): void;
  /** Se avisa una sola vez, con el primer evento que llegue. */
  onInputKind(kind: InputKind): void;
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
  // --- Con qué se está jugando -----------------------------------------
  // Por el primer evento, nunca por el user agent. Arranca asumiendo touch
  // porque el juego es vertical y se va a jugar sobre todo en celular; en
  // desktop el primer movimiento del mouse lo corrige antes de que el jugador
  // llegue a leer el cartel.
  let tipoResuelto = false;
  const resolverTipo = (kind: InputKind) => {
    if (tipoResuelto) return;
    tipoResuelto = true;
    window.removeEventListener('pointermove', onPointerMove);
    handlers.onInputKind(kind);
  };

  const onPointerMove = (e: PointerEvent) => {
    resolverTipo(e.pointerType === 'touch' ? 'touch' : 'desktop');
  };

  // --- Teclado ---------------------------------------------------------
  const onKeyDown = (e: KeyboardEvent) => {
    if (vieneDeUnControl(e)) return;
    resolverTipo('desktop');
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
    resolverTipo('desktop');
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
  /** Máximo descenso alcanzado en este gesto, para detectar si sigue bajando. */
  let maxDy = 0;

  const onTouchStart = (e: TouchEvent) => {
    if (vieneDeUnControl(e)) return;
    resolverTipo('touch');
    e.preventDefault(); // sin esto la página scrollea y se disparan mouse events fantasma
    const t = e.changedTouches[0];
    startX = t.clientX;
    startY = t.clientY;
    startTime = performance.now();
    swipeUsado = false;
    maxDy = 0;
    // Acá NO se salta: solo se marca la intención. Saltar en el touchstart hacía
    // que al deslizar hacia abajo el jugador brincara antes de tirarse al piso.
    handlers.onTouchStart();
  };

  const onTouchMove = (e: TouchEvent) => {
    if (vieneDeUnControl(e)) return;
    e.preventDefault();
    if (swipeUsado) return;

    const t = e.changedTouches[0];
    const dy = t.clientY - startY;
    const dx = Math.abs(t.clientX - startX);
    const dt = performance.now() - startTime;

    // Swipe hacia abajo: más de 30px verticales dentro de la ventana, y más
    // vertical que horizontal.
    if (dy > SWIPE.MIN_DISTANCE_PX && dy > dx && dt < SWIPE.MAX_DURATION_MS) {
      swipeUsado = true;
      // Si el salto todavía no se comprometió, esto lo descarta entero.
      handlers.onSlide();
      return;
    }

    // Todavía no llegó al umbral. Lo que importa es si sigue bajando: mientras
    // baje, la ventana de intención se estira y el salto no arranca.
    if (dy > maxDy) {
      maxDy = dy;
      handlers.onTouchDescend();
    } else if (dy < maxDy - SWIPE.REVERSE_TOLERANCE_PX) {
      // Cambió de sentido de verdad, no es temblor: fue un toque.
      handlers.onTouchSettle();
    }
    // Entre medio (ni avanza ni retrocede lo suficiente) no se hace nada: si el
    // dedo se quedó quieto, la gracia se agota sola y sale el salto.
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (vieneDeUnControl(e)) return;
    e.preventDefault();
    handlers.onTouchRelease();
  };

  const onTouchCancel = (e: TouchEvent) => {
    if (vieneDeUnControl(e)) return;
    e.preventDefault();
    handlers.onTouchCancel();
  };

  // Si la ventana pierde el foco con el botón apretado, el salto quedaría trabado.
  const onBlur = () => handlers.onJumpRelease();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  surface.addEventListener('mousedown', onMouseDown);
  // passive:false es obligatorio: sin eso el navegador ignora el preventDefault.
  surface.addEventListener('touchstart', onTouchStart, { passive: false });
  surface.addEventListener('touchmove', onTouchMove, { passive: false });
  surface.addEventListener('touchend', onTouchEnd, { passive: false });
  surface.addEventListener('touchcancel', onTouchCancel, { passive: false });

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('pointermove', onPointerMove);
    surface.removeEventListener('mousedown', onMouseDown);
    surface.removeEventListener('touchstart', onTouchStart);
    surface.removeEventListener('touchmove', onTouchMove);
    surface.removeEventListener('touchend', onTouchEnd);
    surface.removeEventListener('touchcancel', onTouchCancel);
  };
}
