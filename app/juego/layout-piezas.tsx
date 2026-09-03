// Piezas del layout de la ruta: fondo, barra superior y columnas de arte.
//
// Todos los colores salen de PALETTE y entran a juego.css como custom
// properties. El CSS no tiene ni un color escrito: así sigue habiendo una sola
// fuente de verdad aunque el estilo viva en dos archivos.
'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
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

export function BarraSuperior({ nombre }: { nombre: string | null }) {
  return (
    <header className={`juego-barra ${pixelFont.className}`}>
      <Link href="/">← DOLKA STAR</Link>
      <span className="juego-barra-jugador">{nombre ?? ''}</span>
    </header>
  );
}

/**
 * Columna de arte. Hoy es un contenedor vacío del tamaño correcto; cuando
 * llegue el dibujo alcanza con pasarle `src`.
 */
export function ColumnaArte({
  src,
  alt = '',
  children,
}: {
  src?: string;
  alt?: string;
  children?: ReactNode;
}) {
  return (
    <div className="juego-columna" aria-hidden={src ? undefined : true}>
      {src ? <img src={src} alt={alt} /> : children}
    </div>
  );
}
