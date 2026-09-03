// La partida en sí: canvas, loop e input. Se monta al empezar a jugar y se
// desmonta al terminar, así cada partida arranca de cero sin estado colgado.
'use client';

import { useEffect, useRef, useState } from 'react';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import { createGame } from '../game/engine';
import { attachInput } from '../game/input';

export default function GameCanvas({
  onGameOver,
}: {
  onGameOver: (score: number, durationMs: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  /** Excepción del loop, para relanzarla en render y que la agarre error.tsx. */
  const [fatal, setFatal] = useState<Error | null>(null);

  // El callback puede cambiar de identidad entre renders, pero el efecto tiene
  // que correr una sola vez: se lee siempre la última versión desde el ref.
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sin interpolación: el upscale por CSS tiene que quedar pixelado.
    ctx.imageSmoothingEnabled = false;

    const game = createGame(ctx, {
      onGameOver: (score, durationMs) => onGameOverRef.current(score, durationMs),
      onError: setFatal,
    });

    const detachInput = attachInput(surface, {
      onJumpPress: game.pressJump,
      onJumpRelease: game.releaseJump,
      onTouchStart: game.touchStart,
      onTouchDescend: game.touchDescend,
      onTouchSettle: game.touchSettle,
      onTouchRelease: game.touchRelease,
      onTouchCancel: game.touchCancel,
      onSlide: game.pressSlide,
      onToggleDebug: game.toggleDebug,
      onInputKind: game.setInputKind,
    });
    game.start();

    return () => {
      game.stop(); // cancela el rAF pendiente
      detachInput();
    };
  }, []);

  // Relanzar en render es la única forma de que un error nacido en el loop
  // llegue al error boundary de la ruta.
  if (fatal) throw fatal;

  return (
    <div ref={surfaceRef} style={{ touchAction: 'none' }} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        style={{
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated',
          display: 'block',
          backgroundColor: '#000000',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
