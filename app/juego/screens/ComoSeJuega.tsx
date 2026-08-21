// Instrucciones en tres pasos. Los dibujos son SVG con las mismas formas y
// colores que el juego, para que lo que se explica acá se reconozca allá.
'use client';

import { PALETTE } from '../game/config';
import { Boton, Pantalla, Titulo } from '../ui';

/** shapeRendering crispEdges: sin antialias, como el canvas. */
const SVG_PROPS = { shapeRendering: 'crispEdges' as const, xmlns: 'http://www.w3.org/2000/svg' };

function DibujoSaltar() {
  return (
    <svg viewBox="0 0 60 40" className="h-12 w-[90px]" {...SVG_PROPS}>
      <rect x="0" y="34" width="60" height="6" fill={PALETTE.street} />
      {/* el jugador, en el aire */}
      <rect x="10" y="8" width="12" height="16" fill={PALETTE.clothes} />
      <rect x="10" y="8" width="12" height="16" fill="none" stroke={PALETTE.accent} strokeWidth="1" />
      {/* flecha de salto */}
      <rect x="15" y="2" width="2" height="4" fill={PALETTE.accent} />
      <rect x="13" y="4" width="6" height="1" fill={PALETTE.accent} />
      {/* el obstáculo */}
      <rect x="38" y="22" width="14" height="12" fill={PALETTE.danger} />
    </svg>
  );
}

function DibujoDeslizar() {
  return (
    <svg viewBox="0 0 60 40" className="h-12 w-[90px]" {...SVG_PROPS}>
      <rect x="0" y="34" width="60" height="6" fill={PALETTE.street} />
      {/* el cartel colgando */}
      <rect x="34" y="6" width="20" height="10" fill={PALETTE.danger} />
      {/* el jugador, agachado y pasando por abajo */}
      <rect x="10" y="26" width="16" height="8" fill={PALETTE.clothes} />
      <rect x="10" y="26" width="16" height="8" fill="none" stroke={PALETTE.accent} strokeWidth="1" />
      {/* flecha hacia abajo */}
      <rect x="15" y="16" width="6" height="1" fill={PALETTE.accent} />
      <rect x="17" y="17" width="2" height="4" fill={PALETTE.accent} />
    </svg>
  );
}

function DibujoHamburguesa() {
  return (
    <svg viewBox="0 0 60 40" className="h-12 w-[90px]" {...SVG_PROPS}>
      {/* las cuatro capas, de abajo hacia arriba */}
      <rect x="20" y="30" width="22" height="4" fill={PALETTE.pickup} />
      <rect x="20" y="24" width="22" height="5" fill={PALETTE.pickup} />
      <rect x="20" y="20" width="22" height="3" fill={PALETTE.pickup} />
      <rect x="22" y="14" width="18" height="5" fill={PALETTE.pickup} />
      <rect x="24" y="12" width="14" height="2" fill={PALETTE.pickup} />
    </svg>
  );
}

const PASOS = [
  {
    n: 1,
    titulo: 'SALTÁ',
    texto: 'Tocá la pantalla o apretá Espacio. Cuanto más lo mantenés, más alto saltás.',
    dibujo: <DibujoSaltar />,
  },
  {
    n: 2,
    titulo: 'AGACHATE',
    texto: 'Deslizá el dedo hacia abajo o apretá la flecha abajo para pasar por debajo de los carteles.',
    dibujo: <DibujoDeslizar />,
  },
  {
    n: 3,
    titulo: 'ARMÁ LA HAMBURGUESA',
    texto: 'Juntá pan, carne, queso y pan en ese orden. Completarla multiplica todo lo que sumes después.',
    dibujo: <DibujoHamburguesa />,
  },
];

export default function ComoSeJuega({ onVolver }: { onVolver: () => void }) {
  return (
    <Pantalla>
      <Titulo className="mb-4 text-[13px]">CÓMO SE JUEGA</Titulo>

      <div className="flex w-full flex-1 flex-col gap-4">
        {PASOS.map((paso) => (
          <div key={paso.n} className="flex items-center gap-3">
            <div className="shrink-0">{paso.dibujo}</div>
            <div className="min-w-0">
              <p className="uppercase tracking-widest" style={{ color: PALETTE.accent }}>
                {paso.n}. {paso.titulo}
              </p>
              <p className="mt-1 leading-snug opacity-80">{paso.texto}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full pt-4">
        <Boton onClick={onVolver}>VOLVER</Boton>
      </div>
    </Pantalla>
  );
}
