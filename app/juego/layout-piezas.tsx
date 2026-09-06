// Piezas del layout de la ruta: fondo, barra superior y columnas de arte.
//
// Todos los colores salen de PALETTE y entran a juego.css como custom
// properties. El CSS no tiene ni un color escrito: así sigue habiendo una sola
// fuente de verdad aunque el estilo viva en dos archivos.
'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { alternarSilencio, estaSilenciado, prepararAudio } from './game/audio';
import { PALETTE } from './game/config';
import { pixelFont } from './font';

/** Alto de la barra superior. Lo usa el CSS para calcular el alto del juego. */
const ALTO_BARRA = '34px';

/** `#RRGGBB` a `rgba(r, g, b, alpha)`, para resplandores y líneas tenues. */
function conAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Patrón de estrellas en pixel art, como data URI.
 *
 * Se arma acá y no en el CSS para que el color salga de PALETTE. Son rects de
 * 1 y 2 px sin antialias, repartidos irregularmente en un mosaico de 96x96 para
 * que la repetición no se lea como una grilla.
 */
function patronDeEstrellas(): string {
  const estrellas = [
    [11, 7, 2], [43, 19, 1], [72, 11, 1], [88, 34, 2], [26, 41, 1],
    [57, 52, 2], [8, 63, 1], [35, 77, 2], [66, 84, 1], [90, 69, 1],
    [19, 27, 1], [79, 47, 1],
  ];
  const rects = estrellas
    .map(([x, y, s]) => `<rect x='${x}' y='${y}' width='${s}' height='${s}'/>`)
    .join('');
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' shape-rendering='crispEdges'>` +
    `<g fill='${PALETTE.white}' fill-opacity='0.13'>${rects}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Variables que consume juego.css. */
export const VARIABLES_DE_TEMA: CSSProperties = {
  '--jz-sky': PALETTE.sky,
  '--jz-frame': PALETTE.frame,
  '--jz-accent': PALETTE.accent,
  '--jz-white': PALETTE.white,
  '--jz-barra': ALTO_BARRA,
  // El resplandor del marco y las líneas tenues son el mismo color con alpha.
  '--jz-glow': conAlpha(PALETTE.accent, 0.45),
  '--jz-barra-linea': conAlpha(PALETTE.accent, 0.25),
  '--jz-barra-fondo': conAlpha(PALETTE.frame, 0.75),
  '--jz-columna-borde': conAlpha(PALETTE.white, 0.12),
  // Las estrellas van muy tenues: acompañan el fondo, no compiten con el juego.
  '--jz-estrellas': patronDeEstrellas(),
} as CSSProperties;

/**
 * Parlante en pixel art, dibujado con rects para que no tenga antialias y
 * acompañe al resto. Con ondas cuando hay sonido, con una cruz cuando no.
 */
function IconoSonido({ silenciado }: { silenciado: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden
    >
      <rect x="2" y="6" width="3" height="4" />
      <rect x="5" y="5" width="1" height="6" />
      <rect x="6" y="4" width="1" height="8" />
      <rect x="7" y="3" width="1" height="10" />
      {silenciado ? (
        <>
          <rect x="10" y="5" width="1" height="1" />
          <rect x="11" y="6" width="1" height="1" />
          <rect x="12" y="7" width="1" height="1" />
          <rect x="13" y="8" width="1" height="1" />
          <rect x="13" y="5" width="1" height="1" />
          <rect x="12" y="6" width="1" height="1" />
          <rect x="11" y="7" width="1" height="1" />
          <rect x="10" y="8" width="1" height="1" />
        </>
      ) : (
        <>
          <rect x="10" y="6" width="1" height="4" />
          <rect x="12" y="4" width="1" height="8" />
        </>
      )}
    </svg>
  );
}

/**
 * Botón de sonido. Vive en la barra, que está en todas las pantallas, así que
 * se puede silenciar sin salir de la partida.
 *
 * El estado se lee del módulo de audio, no de una prop: la barra no se vuelve a
 * renderizar sola cuando cambia, por eso guarda una copia local.
 */
function BotonSonido() {
  const [silenciado, setSilenciado] = useState(true);

  useEffect(() => {
    prepararAudio();
    setSilenciado(estaSilenciado());
  }, []);

  return (
    <button
      type="button"
      onClick={() => setSilenciado(alternarSilencio())}
      className="juego-barra-sonido"
      aria-pressed={silenciado}
      aria-label={silenciado ? 'Activar sonido' : 'Silenciar'}
      title={silenciado ? 'Activar sonido' : 'Silenciar'}
    >
      <IconoSonido silenciado={silenciado} />
    </button>
  );
}

export function BarraSuperior({ nombre }: { nombre: string | null }) {
  return (
    <header className={`juego-barra ${pixelFont.className}`}>
      <Link href="/">← DOLKA STAR</Link>
      <div className="juego-barra-derecha">
        <span className="juego-barra-jugador">{nombre ?? ''}</span>
        <BotonSonido />
      </div>
    </header>
  );
}

/**
 * Columna de arte, solo en escritorio. Es decoración: va a opacidad baja para
 * acompañar al marco sin pelearle la atención al juego, que es lo único que se
 * mira mientras se juega.
 */
export function ColumnaArte({
  src,
  espejada = false,
  children,
}: {
  src?: string;
  /** Da vuelta el dibujo, para que las dos columnas miren al centro. */
  espejada?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="juego-columna" aria-hidden>
      {src ? (
        <img
          src={src}
          alt=""
          style={{ opacity: 0.1, transform: espejada ? 'scaleX(-1)' : undefined }}
        />
      ) : (
        children
      )}
    </div>
  );
}
