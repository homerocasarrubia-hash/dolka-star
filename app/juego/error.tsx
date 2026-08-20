// Error boundary de la ruta /juego. Next lo exige como componente cliente.
// Acota la caída al juego: si el canvas o el loop explotan, el resto del sitio
// (header, footer, menú, contacto) sigue navegable.
'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { PALETTE } from './game/config';

/**
 * Cuándo se apretó REINTENTAR por última vez. Vive en el módulo y no en estado
 * de React a propósito: el boundary se desmonta al resetear y se vuelve a
 * montar con el error siguiente, así que cualquier estado del componente se
 * perdería justo entre los dos errores que hay que comparar.
 */
let ultimoReintentoEn = 0;

/**
 * Si el error vuelve dentro de esta ventana después de un reintento, no fue
 * algo pasajero: es determinístico y reintentar solo repite el choque.
 */
const VENTANA_DE_REINTENTO_MS = 3000;

export default function JuegoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sin esto el error se pierde: el boundary lo atrapa y no llega a la consola.
    console.error('[juego] la partida se cayó:', error);
  }, [error]);

  // Lectura pura durante el render: si el boundary reapareció dentro de la
  // ventana, el reintento anterior falló al instante y no vale ofrecer otro.
  const elReintentoFallo = Date.now() - ultimoReintentoEn < VENTANA_DE_REINTENTO_MS;

  const reintentar = () => {
    ultimoReintentoEn = Date.now();
    reset();
  };

  return (
    <div
      className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center font-mono"
      style={{ backgroundColor: PALETTE.frame }}
    >
      <p className="text-2xl font-bold tracking-[0.2em]" style={{ color: PALETTE.white }}>
        SE CORTÓ LA PARTIDA
      </p>

      <p className="max-w-xs text-sm leading-relaxed" style={{ color: PALETTE.accent }}>
        {elReintentoFallo
          ? 'Volvió a fallar apenas reintentaste, así que el problema no se va a arreglar solo. El sitio está entero.'
          : 'El juego se rompió, pero el sitio está entero. Podés reintentar o volver y seguir mirando el menú.'}
      </p>

      <div className="flex w-56 flex-col gap-3">
        {!elReintentoFallo && (
          <button
            type="button"
            onClick={reintentar}
            className="px-6 py-3 text-sm font-bold tracking-[0.2em] transition-opacity hover:opacity-80"
            style={{ backgroundColor: PALETTE.accent, color: PALETTE.frame }}
          >
            REINTENTAR
          </button>
        )}

        <Link
          href="/"
          className="border px-6 py-3 text-sm font-bold tracking-[0.2em] transition-opacity hover:opacity-80"
          style={{ borderColor: PALETTE.white, color: PALETTE.white }}
        >
          VOLVER AL INICIO
        </Link>
      </div>
    </div>
  );
}
