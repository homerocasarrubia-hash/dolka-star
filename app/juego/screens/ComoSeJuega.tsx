// Instrucciones en tres pasos, ilustradas con los sprites del propio juego:
// lo que se explica acá es exactamente lo que se va a ver en la partida.
'use client';

import type { ReactNode } from 'react';
import { PALETTE } from '../game/config';
import { Boton, FONDO_PORTADA, Pantalla, Titulo } from '../ui';

/** Los sprites van al doble para que se lean, y sin suavizado. */
const LADO = 96;
const PIXELADO = { imageRendering: 'pixelated' as const };

function Sprite({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      width={LADO}
      height={LADO}
      style={PIXELADO}
      className="block"
    />
  );
}

/**
 * Las cuatro capas apiladas como en el HUD del juego: cada una apoya sobre el
 * dibujo de la de abajo, no sobre su cuadro. Los desplazamientos son las filas
 * que ocupa el dibujo dentro de cada cuadro de 24x24, al doble.
 */
const CAPAS = [
  { src: '/juego/sprites/ing-pan-arriba.png', top: 0 },
  { src: '/juego/sprites/ing-queso.png', top: 12 },
  { src: '/juego/sprites/ing-carne.png', top: 22 },
  { src: '/juego/sprites/ing-pan-abajo.png', top: 36 },
];

function Hamburguesa() {
  return (
    <div className="relative" style={{ width: LADO, height: LADO }}>
      {CAPAS.map((capa) => (
        <img
          key={capa.src}
          src={capa.src}
          alt=""
          aria-hidden
          width={48}
          height={48}
          // +7 centra la pila dentro del cuadro: el dibujo mide 54 de los 96 y
          // el pan de arriba ya trae 14 filas de aire propias.
          style={{ ...PIXELADO, position: 'absolute', left: 24, top: capa.top + 7 }}
        />
      ))}
    </div>
  );
}

const PASOS: { n: number; titulo: string; texto: string; dibujo: ReactNode }[] = [
  {
    n: 1,
    titulo: 'SALTÁ',
    texto: 'Tocá la pantalla o apretá Espacio. Cuanto más lo mantenés, más alto saltás.',
    dibujo: <Sprite src="/juego/sprites/dolka-jump.png" />,
  },
  {
    n: 2,
    titulo: 'AGACHATE',
    texto: 'Deslizá el dedo hacia abajo o apretá la flecha abajo para pasar por debajo de los carteles.',
    dibujo: <Sprite src="/juego/sprites/dolka-slide.png" />,
  },
  {
    n: 3,
    titulo: 'ARMÁ LA HAMBURGUESA',
    texto: 'Juntá pan, carne, queso y pan en ese orden. Completarla multiplica todo lo que sumes después.',
    dibujo: <Hamburguesa />,
  },
];

export default function ComoSeJuega({ onVolver }: { onVolver: () => void }) {
  return (
    <Pantalla fondo={FONDO_PORTADA} oscurecer={0.88}>
      <Titulo className="mb-4 shrink-0 text-[13px]">CÓMO SE JUEGA</Titulo>

      <div className="flex w-full flex-1 flex-col justify-evenly gap-3 py-2">
        {PASOS.map((paso) => (
          <div key={paso.n} className="flex items-center gap-3">
            <div className="shrink-0">{paso.dibujo}</div>
            <div className="min-w-0">
              <p className="uppercase tracking-widest" style={{ color: PALETTE.accent }}>
                {paso.n}. {paso.titulo}
              </p>
              <p className="mt-1 leading-snug opacity-90">{paso.texto}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full shrink-0 pt-4">
        <Boton onClick={onVolver}>VOLVER</Boton>
      </div>
    </Pantalla>
  );
}
