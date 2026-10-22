// Piezas visuales compartidas por las pantallas del juego.
//
// Todos los colores salen de PALETTE: no hay ni un hex escrito acá. Los bordes
// son duros, sin border-radius, para que el chrome acompañe al pixel art.
'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { PALETTE } from './game/config';
import { pixelFont } from './font';

/** Foto del local, de fondo en las pantallas de menú. */
export const FONDO_PORTADA = '/juego/sprites/bg-portada.png';

/** `#RRGGBB` a `rgba(...)`, para las capas que oscurecen el fondo. */
function conAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Contenido de una pantalla. NO se dimensiona a sí misma: el tamaño y la
 * relación de aspecto los pone el marco de la ruta (ver juego.css), así el
 * rectángulo es idéntico en todas las pantallas y no hay salto al cambiar.
 *
 * `oscurecer` es cuánto se tapa la foto de fondo, de 0 a 1. La foto tiene el
 * cartel de neón y la puerta iluminada, que es justo donde el texto se pierde:
 * la portada usa 0.72 porque el dibujo tiene que verse, y las pantallas de
 * lectura usan 0.88, donde la foto queda como textura y nada más.
 */
export function Pantalla({
  children,
  fondo,
  oscurecer = 0.72,
}: {
  children: ReactNode;
  fondo?: string;
  oscurecer?: number;
}) {
  return (
    <div className="relative h-full w-full">
      {fondo && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              // Dos capas: un velo parejo y un refuerzo arriba y abajo, que es
              // donde caen los títulos y los botones.
              `linear-gradient(to bottom, ${conAlpha(PALETTE.frame, Math.min(1, oscurecer + 0.12))} 0%, ` +
              `${conAlpha(PALETTE.frame, oscurecer)} 35%, ` +
              `${conAlpha(PALETTE.frame, Math.min(1, oscurecer + 0.14))} 100%), ` +
              `url(${fondo})`,
          }}
        />
      )}
      {/* Scanlines CRT — textura sutil que refuerza el mood retro-arcade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.07) 0px, rgba(0,0,0,0.07) 1px, transparent 1px, transparent 3px)',
        }}
      />
      <div
        style={{ color: PALETTE.white }}
        className="relative flex h-full w-full flex-col items-center overflow-y-auto px-5 py-5 font-mono text-[11px]"
      >
        {children}
      </div>
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
      className={`${pixelFont.className} w-full border-2 px-3 py-3 text-[9px] leading-none transition-all duration-150 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100`}
      style={{
        backgroundColor: primario ? PALETTE.accent : 'transparent',
        color: primario ? PALETTE.frame : PALETTE.white,
        borderColor: primario ? PALETTE.accent : PALETTE.white,
        borderRadius: 0,
        boxShadow: primario
          ? `0 0 10px rgba(61,240,224,0.55), 0 0 24px rgba(61,240,224,0.25)`
          : 'none',
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
        className="w-full border-2 bg-transparent px-2 py-2 font-mono text-[12px] outline-none transition-all duration-150 focus:border-[#3DF0E0]"
        style={{
          borderColor: PALETTE.white,
          color: PALETTE.white,
          borderRadius: 0,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = PALETTE.accent;
          e.currentTarget.style.boxShadow = `0 0 8px rgba(61,240,224,0.4)`;
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = PALETTE.white;
          e.currentTarget.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
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
