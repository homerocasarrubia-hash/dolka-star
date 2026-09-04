// Pantalla de arranque: la portada del juego.
//
// De arriba hacia abajo: logo, quién sos y tu récord, el perro como figura
// principal, y los botones. El perro se lleva el espacio que sobra, así que en
// una pantalla alta se ve entero y en una baja se achica solo sin empujar nada.
'use client';

import { PALETTE } from '../game/config';
import { Boton, Enlace, FONDO_PORTADA, MensajeError, Pantalla } from '../ui';

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
    <Pantalla fondo={FONDO_PORTADA} oscurecer={0.72}>
      {/* El logo ya dice DOLKA RUN: no lleva título de texto al lado. */}
      <img
        src="/juego/sprites/logo-dolka-run.png"
        alt="Dolka Run"
        className="w-[72%] max-w-[240px] shrink-0 object-contain"
      />

      <div className="mt-3 shrink-0 text-center">
        {nombre && (
          <>
            <p className="uppercase tracking-widest">
              Hola, <span style={{ color: PALETTE.pickup }}>{nombre}</span>
            </p>
            <div className="mt-1 text-[9px]">
              <Enlace onClick={onCambiarNombre}>cambiar nombre</Enlace>
            </div>
          </>
        )}
        {mejor > 0 && (
          <p className="mt-2 uppercase tracking-widest opacity-70">
            Tu récord: <span style={{ color: PALETTE.pickup }}>{mejor}</span>
          </p>
        )}
      </div>

      {/* min-h-0 es lo que deja que se achique en pantallas bajas en vez de
          desbordar y empujar los botones fuera de vista. */}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center py-3">
        <img
          src="/juego/sprites/dolka-completo.png"
          alt=""
          aria-hidden
          className="h-full max-h-[340px] w-auto object-contain"
        />
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3">
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
