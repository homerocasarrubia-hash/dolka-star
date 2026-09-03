// Preloader. El juego no arranca hasta que los sprites están en memoria: si
// empezara antes, el perro aparecería como un rectángulo y cambiaría de forma a
// mitad de la primera partida.
'use client';

import { PALETTE } from '../game/config';
import { Pantalla, Titulo } from '../ui';

export default function Cargando({ error }: { error?: string | null }) {
  return (
    <Pantalla>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Titulo className="text-[13px]">DOLKA RUN</Titulo>
        <p className="uppercase tracking-widest opacity-70" style={{ color: PALETTE.accent }}>
          {error ? 'Listo' : 'Cargando...'}
        </p>
        {error && (
          <p className="max-w-[15rem] leading-snug opacity-60">{error}</p>
        )}
      </div>
    </Pantalla>
  );
}
