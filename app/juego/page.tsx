'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from './game/config';
import { createGame, type Game } from './game/engine';
import { recordRun } from './game/history';
import { attachInput } from './game/input';

export default function JuegoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  /** Puntaje final: null mientras se está jugando. */
  const [scoreFinal, setScoreFinal] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sin interpolación: el upscale por CSS tiene que quedar pixelado.
    ctx.imageSmoothingEnabled = false;

    const game = createGame(ctx, {
      onGameOver: (score, durationMs) => {
        setScoreFinal(score);
        recordRun(score, durationMs); // métricas de prueba, no se muestran
      },
    });
    gameRef.current = game;

    const detachInput = attachInput(surface, {
      onJumpPress: game.pressJump,
      onJumpRelease: game.releaseJump,
      onSlide: game.pressSlide,
      onToggleDebug: game.toggleDebug,
    });
    game.start();

    return () => {
      game.stop(); // cancela el rAF pendiente
      detachInput();
      gameRef.current = null;
    };
  }, []);

  const reintentar = useCallback(() => {
    gameRef.current?.restart();
    setScoreFinal(null);
  }, []);

  return (
    // Ocupa el viewport completo por encima del Header/Footer del layout.
    <div
      ref={surfaceRef}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      // touch-action:none en todo el contenedor: el gesto es del juego, no del scroll.
      style={{ backgroundColor: PALETTE.frame, touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        style={{
          // Escala al alto del viewport manteniendo la relación de aspecto,
          // sin desbordar a lo ancho en pantallas angostas.
          width: `min(100vw, calc(100dvh * ${GAME_WIDTH} / ${GAME_HEIGHT}))`,
          height: 'auto',
          aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`,
          imageRendering: 'pixelated',
          display: 'block',
          backgroundColor: '#000000',
          touchAction: 'none',
        }}
      />

      {scoreFinal !== null && (
        // TODO: pantalla provisoria. Falta arte, animación de entrada y récord.
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-center"
          style={{ backgroundColor: 'rgba(13, 7, 22, 0.88)' }}
        >
          <p
            className="text-2xl font-bold tracking-[0.2em]"
            style={{ color: PALETTE.white }}
          >
            GAME OVER
          </p>

          <p style={{ color: PALETTE.accent }}>
            <span className="block text-xs tracking-[0.3em] opacity-70">PUNTAJE</span>
            <span className="text-5xl font-bold tabular-nums">{scoreFinal}</span>
          </p>

          <button
            type="button"
            onClick={reintentar}
            // autoFocus para que Espacio y Enter reintenten sin tocar la pantalla.
            autoFocus
            className="px-6 py-3 text-sm font-bold tracking-[0.2em] transition-opacity hover:opacity-80"
            style={{ backgroundColor: PALETTE.accent, color: PALETTE.frame }}
          >
            REINTENTAR
          </button>
        </div>
      )}
    </div>
  );
}
