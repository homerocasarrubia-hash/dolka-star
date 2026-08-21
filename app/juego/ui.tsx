// Piezas visuales compartidas por las pantallas del juego.
//
// Todos los colores salen de PALETTE: no hay ni un hex escrito acá. Los bordes
// son duros, sin border-radius, para que el chrome acompañe al pixel art.
'use client';

import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from './game/config';
import { pixelFont } from './font';

/**
 * Caja con la misma forma y tamaño que el canvas. Todas las pantallas viven
 * adentro de ella, así el juego y el menú ocupan exactamente el mismo rectángulo
 * y no hay saltos visuales al pasar de una cosa a la otra.
 */
export const MARCO_STYLE: CSSProperties = {
  width: `min(100vw, calc(100dvh * ${GAME_WIDTH} / ${GAME_HEIGHT}))`,
  aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`,
};

export function Pantalla({ children }: { children: ReactNode }) {
  return (
    <div
      style={{ ...MARCO_STYLE, backgroundColor: PALETTE.sky, color: PALETTE.white }}
      className="flex flex-col items-center overflow-y-auto px-5 py-6 font-mono text-[11px]"
    >
      {children}
    </div>
  );
}

export function Titulo({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h1
      className={`${pixelFont.className} text-center leading-relaxed ${className}`}
      style={{ color: PALETTE.accent }}
    >
      {children}
    </h1>
  );
}

type Variante = 'primario' | 'secundario';

export function Boton({
  children,
  onClick,
  variante = 'secundario',
  disabled = false,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variante?: Variante;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const primario = variante === 'primario';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${pixelFont.className} w-full border-2 px-3 py-3 text-[9px] leading-none transition-opacity hover:opacity-80 disabled:opacity-40`}
      style={{
        backgroundColor: primario ? PALETTE.accent : 'transparent',
        color: primario ? PALETTE.frame : PALETTE.white,
        borderColor: primario ? PALETTE.accent : PALETTE.white,
        borderRadius: 0,
      }}
    >
      {children}
    </button>
  );
}

/** Enlace discreto, para acciones secundarias que no merecen un botón. */
export function Enlace({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="underline underline-offset-2 opacity-70 transition-opacity hover:opacity-100"
      style={{ color: PALETTE.white }}
    >
      {children}
    </button>
  );
}

export function Campo({
  etiqueta,
  ayuda,
  ...props
}: {
  etiqueta: string;
  ayuda?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block w-full">
      <span className="mb-1 block uppercase tracking-widest" style={{ color: PALETTE.accent }}>
        {etiqueta}
      </span>
      <input
        {...props}
        className="w-full border-2 bg-transparent px-2 py-2 font-mono text-[12px] outline-none"
        style={{ borderColor: PALETTE.white, color: PALETTE.white, borderRadius: 0 }}
      />
      {ayuda && (
        <span className="mt-1 block leading-snug opacity-60" style={{ color: PALETTE.white }}>
          {ayuda}
        </span>
      )}
    </label>
  );
}

/**
 * Mensaje de error del servidor, mostrado tal cual llega.
 *
 * Usa `danger`, el mismo rosa de los obstáculos. En el canvas ese color está
 * reservado a lo que te mata, así que acá refuerza esa lectura en vez de
 * contradecirla: si es rosa, algo salió mal.
 */
export function MensajeError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="w-full border-2 px-2 py-2 leading-snug"
      style={{ borderColor: PALETTE.danger, color: PALETTE.white, borderRadius: 0 }}
    >
      {children}
    </p>
  );
}
