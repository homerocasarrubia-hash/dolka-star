// Top 20 de la semana, con el puntaje propio resaltado y el contador de cierre.
'use client';

import { useEffect, useState } from 'react';
import { formatearRestante, tiempoHastaElCierre } from '@/lib/game/countdown';
import { PALETTE } from '../game/config';
import { mejorSemanal, type MejorSemanal } from '../game/prefs';
import { Boton, Enlace, MensajeError, Pantalla, Titulo } from '../ui';

interface Puesto {
  posicion: number;
  playerName: string;
  score: number;
}

export default function Ranking({
  onVolver,
  onReglas,
}: {
  onVolver: () => void;
  onReglas: () => void;
}) {
  const [puestos, setPuestos] = useState<Puesto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mio, setMio] = useState<MejorSemanal | null>(null);
  const [restante, setRestante] = useState('');

  useEffect(() => {
    setMio(mejorSemanal());
  }, []);

  useEffect(() => {
    let vivo = true;
    fetch('/api/leaderboard')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('respuesta no ok'))))
      .then((datos: { puestos: Puesto[] }) => {
        if (vivo) setPuestos(datos.puestos);
      })
      .catch(() => {
        if (vivo) setError('No se pudo cargar el ranking. Revisá tu conexión.');
      });
    return () => {
      vivo = false;
    };
  }, []);

  // El contador se recalcula contra la hora de Argentina en cada tick, no se
  // va restando solo: así un cambio de hora o una pestaña dormida no lo desfasan.
  useEffect(() => {
    const tick = () => setRestante(formatearRestante(tiempoHastaElCierre()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Pantalla>
      <Titulo className="text-[13px]">RANKING</Titulo>

      <p className="mt-2 text-center uppercase tracking-widest opacity-70">
        Cierra en <span style={{ color: PALETTE.pickup }}>{restante}</span>
      </p>
      <p className="mb-3 text-center text-[9px] leading-snug opacity-50">
        Domingo 23:59, hora de Argentina
      </p>

      <div className="w-full flex-1">
        {error && <MensajeError>{error}</MensajeError>}

        {!error && puestos === null && (
          <p className="py-6 text-center opacity-60">Cargando...</p>
        )}

        {puestos !== null && puestos.length === 0 && (
          <p className="py-6 text-center leading-snug opacity-60">
            Todavía no hay puntajes esta semana. Podés ser el primero.
          </p>
        )}

        {puestos?.map((p) => {
          const esMio = mio !== null && p.playerName === mio.playerName && p.score === mio.score;
          return (
            <div
              key={`${p.posicion}-${p.playerName}`}
              className="flex items-center gap-2 border-b py-1.5"
              style={{
                borderColor: `${PALETTE.white}22`,
                color: esMio ? PALETTE.frame : PALETTE.white,
                backgroundColor: esMio ? PALETTE.accent : 'transparent',
              }}
            >
              <span className="w-6 shrink-0 text-right opacity-70">{p.posicion}</span>
              <span className="min-w-0 flex-1 truncate">{p.playerName}</span>
              <span
                className="shrink-0 tabular-nums"
                style={{ color: esMio ? PALETTE.frame : PALETTE.pickup }}
              >
                {p.score}
              </span>
            </div>
          );
        })}
      </div>

      <div className="w-full pt-4">
        <Boton onClick={onVolver}>VOLVER</Boton>
        <div className="mt-3 text-center">
          <Enlace onClick={onReglas}>Reglas del concurso</Enlace>
        </div>
      </div>
    </Pantalla>
  );
}
