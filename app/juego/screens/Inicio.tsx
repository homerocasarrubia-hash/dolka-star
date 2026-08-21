// Pantalla de arranque.
'use client';

import Image from 'next/image';
import { PALETTE } from '../game/config';
import { Boton, Enlace, MensajeError, Pantalla, Titulo } from '../ui';

export default function Inicio({
  onJugar,
  onComoSeJuega,
  onRanking,
  onCambiarNombre,
  cargando,
  error,
  mejor,
  nombre,
}: {
  onJugar: () => void;
  onComoSeJuega: () => void;
  onRanking: () => void;
  onCambiarNombre: () => void;
  cargando: boolean;
  error: string | null;
  mejor: number;
  /** null la primera vez, antes de que el jugador diga cómo se llama. */
  nombre: string | null;
}) {
  return (
    <Pantalla>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-4">
        <Image
          src="/assets/logodolka.jpg"
          alt="Dolka Star"
          width={72}
          height={72}
          className="object-cover"
          priority
        />
        <Titulo className="text-[18px]">DOLKA RUN</Titulo>

        {nombre && (
          <div className="text-center">
            <p className="uppercase tracking-widest">
              Hola, <span style={{ color: PALETTE.pickup }}>{nombre}</span>
            </p>
            <div className="mt-1 text-[9px]">
              <Enlace onClick={onCambiarNombre}>cambiar nombre</Enlace>
            </div>
          </div>
        )}

        {mejor > 0 && (
          <p className="text-center uppercase tracking-widest opacity-70">
            Tu récord: <span style={{ color: PALETTE.pickup }}>{mejor}</span>
          </p>
        )}
      </div>

      <div className="flex w-full flex-col gap-3 pb-2">
        {error && <MensajeError>{error}</MensajeError>}
        <Boton variante="primario" onClick={onJugar} disabled={cargando}>
          {cargando ? 'INICIANDO...' : 'JUGAR'}
        </Boton>
        <Boton onClick={onComoSeJuega}>CÓMO SE JUEGA</Boton>
        <Boton onClick={onRanking}>RANKING</Boton>
      </div>
    </Pantalla>
  );
}
