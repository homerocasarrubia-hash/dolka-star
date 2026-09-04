// Fin de partida.
//
// El guardado es automático: el jugador ya dio su nombre una sola vez al
// principio, así que no hay nada que completar acá. Si el envío falla se
// muestra el mensaje real del servidor y queda un botón para reintentar, para
// que un problema de red no le cueste el puntaje.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PALETTE } from '../game/config';
import { guardarMejorSemanal, registrarPuntaje, type Perfil } from '../game/prefs';
import { pixelFont } from '../font';
import { Boton, FONDO_PORTADA, MensajeError, Pantalla, Titulo } from '../ui';

type Estado = 'guardando' | 'listo' | 'error';

export default function GameOver({
  score,
  sessionId,
  perfil,
  onJugarDeNuevo,
  onRanking,
}: {
  score: number;
  sessionId: string | null;
  perfil: Perfil;
  onJugarDeNuevo: () => void;
  onRanking: () => void;
}) {
  const [estado, setEstado] = useState<Estado>('guardando');
  const [error, setError] = useState<string | null>(null);
  const [mejoro, setMejoro] = useState(false);
  const [mejorSemana, setMejorSemana] = useState(score);

  const guardar = useCallback(async () => {
    if (!sessionId) {
      setError('Esta partida no se puede guardar porque no llegó a registrarse al empezar.');
      setEstado('error');
      return;
    }
    setEstado('guardando');
    setError(null);

    try {
      const res = await fetch('/api/game/finish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          score,
          playerName: perfil.nombre,
          whatsapp: perfil.whatsapp || undefined,
        }),
      });
      const datos: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const mensaje =
          typeof datos === 'object' && datos !== null && typeof (datos as { error?: unknown }).error === 'string'
            ? (datos as { error: string }).error
            : 'No se pudo guardar el puntaje. Probá de nuevo.';
        setError(mensaje);
        setEstado('error');
        return;
      }

      const r = datos as { improved?: boolean; bestScore?: number };
      const best = typeof r.bestScore === 'number' ? r.bestScore : score;
      setMejoro(r.improved === true);
      setMejorSemana(best);
      guardarMejorSemanal({ playerName: perfil.nombre, score: best });
      registrarPuntaje(score); // récord histórico local, para la pantalla de inicio
      setEstado('listo');
    } catch {
      setError('No hay conexión. Revisá internet y reintentá: tu puntaje no se perdió.');
      setEstado('error');
    }
  }, [score, sessionId, perfil.nombre, perfil.whatsapp]);

  // Se envía una sola vez al montar. El ref evita que un re-render dispare un
  // segundo envío, que el servidor rechazaría por sesión ya cerrada.
  const yaEnviado = useRef(false);
  useEffect(() => {
    if (yaEnviado.current) return;
    yaEnviado.current = true;
    void guardar();
  }, [guardar]);

  const esRecord = estado === 'listo' && mejoro;

  return (
    <Pantalla fondo={FONDO_PORTADA} oscurecer={0.82}>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 text-center">
        {/* El récord se anuncia con texto en accent y el fin de partida con el
            cartel rojo: dos noticias distintas, dos lecturas distintas. */}
        {esRecord ? (
          <Titulo className="text-[13px]">¡NUEVO RÉCORD!</Titulo>
        ) : (
          <img
            src="/juego/sprites/game-over.png"
            alt="Game over"
            className="w-[78%] max-w-[260px] object-contain"
          />
        )}

        <p className="mt-4 uppercase tracking-widest opacity-60">Puntaje</p>
        <p
          className={`${pixelFont.className} text-[34px] leading-none`}
          style={{ color: esRecord ? PALETTE.pickup : PALETTE.accent }}
        >
          {score}
        </p>

        {estado === 'listo' && !esRecord && (
          <p className="mt-4 text-[10px] uppercase tracking-widest opacity-60">
            Tu mejor de la semana:{' '}
            <span style={{ color: PALETTE.pickup }}>{mejorSemana}</span>
          </p>
        )}

        <div className="mt-3 h-4 text-[10px] opacity-60">
          {estado === 'guardando' && <span>Guardando...</span>}
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3">
        {error && <MensajeError>{error}</MensajeError>}
        {estado === 'error' && (
          <Boton variante="primario" onClick={() => void guardar()}>
            REINTENTAR GUARDADO
          </Boton>
        )}
        <Boton variante={estado === 'error' ? 'secundario' : 'primario'} onClick={onJugarDeNuevo}>
          JUGAR DE NUEVO
        </Boton>
        <Boton onClick={onRanking}>VER RANKING</Boton>
      </div>
    </Pantalla>
  );
}
