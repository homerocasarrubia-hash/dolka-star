// Máquina de pantallas del juego. No dibuja nada del juego en sí: decide qué
// pantalla se ve y sostiene lo que cruza entre ellas, que es la identidad del
// jugador, la sesión del servidor y el resultado de la última partida.
'use client';

import { useCallback, useEffect, useState } from 'react';
import './juego.css';
import { BarraSuperior, ColumnaArte, VARIABLES_DE_TEMA } from './layout-piezas';
import { mejorPuntaje, obtenerPerfil, obtenerPlayerId, type Perfil } from './game/prefs';
import { cargarSprites } from './game/sprites';
import Cargando from './screens/Cargando';
import ComoSeJuega from './screens/ComoSeJuega';
import GameCanvas from './screens/GameCanvas';
import GameOver from './screens/GameOver';
import Inicio from './screens/Inicio';
import PerfilScreen from './screens/Perfil';
import Ranking from './screens/Ranking';
import Reglas from './screens/Reglas';

/** Dibujo de las columnas laterales, solo decorativo. */
const ARTE_COLUMNA = '/juego/sprites/dolka-completo.png';

type Pantalla =
  | 'CARGANDO'
  | 'PERFIL'
  | 'INICIO'
  | 'COMO_SE_JUEGA'
  | 'JUGANDO'
  | 'GAME_OVER'
  | 'RANKING'
  | 'REGLAS';

export default function GameClient() {
  // Arranca en CARGANDO porque la identidad vive en localStorage y todavía no
  // se puede leer: en el render del servidor no existe. Sin este paso la
  // pantalla de nombre parpadearía en cada visita de alguien que ya lo dio.
  const [pantalla, setPantalla] = useState<Pantalla>('CARGANDO');
  const [playerId, setPlayerId] = useState('');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [iniciando, setIniciando] = useState(false);
  const [errorInicio, setErrorInicio] = useState<string | null>(null);
  const [mejor, setMejor] = useState(0);

  const [avisoSprites, setAvisoSprites] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setPlayerId(obtenerPlayerId()); // se genera acá la primera vez
    const guardado = obtenerPerfil();
    setPerfil(guardado);
    setMejor(mejorPuntaje());

    // No se muestra nada jugable hasta que los sprites estén en memoria.
    void cargarSprites().then((sprites) => {
      if (!vivo) return;
      if (!sprites) {
        setAvisoSprites('No se pudieron cargar los dibujos. Se juega igual, con las figuras simples.');
      }
      // Sin nombre todavía: se pide una única vez, antes de la primera partida.
      setPantalla(guardado ? 'INICIO' : 'PERFIL');
    });

    return () => {
      vivo = false;
    };
  }, []);

  // El récord puede haber cambiado durante la partida.
  useEffect(() => {
    if (pantalla === 'INICIO') setMejor(mejorPuntaje());
  }, [pantalla]);

  /**
   * La partida no arranca hasta que el servidor registró la sesión: ese
   * `startedAt` es la referencia contra la que después se valida la duración, y
   * el playerId queda pegado a la sesión ahí mismo.
   */
  const jugar = useCallback(async () => {
    setIniciando(true);
    setErrorInicio(null);
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      const datos: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const mensaje =
          typeof datos === 'object' && datos !== null && typeof (datos as { error?: unknown }).error === 'string'
            ? (datos as { error: string }).error
            : 'No se pudo iniciar la partida. Probá de nuevo.';
        setErrorInicio(mensaje);
        return;
      }

      const id = (datos as { sessionId?: unknown })?.sessionId;
      if (typeof id !== 'string') {
        setErrorInicio('El servidor respondió algo inesperado. Probá de nuevo.');
        return;
      }

      setSessionId(id);
      setScore(0);
      setPantalla('JUGANDO');
    } catch {
      setErrorInicio('No hay conexión. Revisá internet y probá de nuevo.');
    } finally {
      setIniciando(false);
    }
  }, [playerId]);

  const terminar = useCallback((puntaje: number) => {
    setScore(puntaje);
    setPantalla('GAME_OVER');
  }, []);

  const guardarPerfilYSeguir = useCallback((nuevo: Perfil) => {
    setPerfil(nuevo);
    setPantalla('INICIO');
  }, []);

  return (
    <div className="juego-pagina" style={VARIABLES_DE_TEMA}>
      {/* Permanente: no depende de la pantalla, así no salta el layout. */}
      <BarraSuperior nombre={perfil?.nombre ?? null} />

      <div className="juego-cuerpo">
        <ColumnaArte src={ARTE_COLUMNA} espejada />

        <main className="juego-marco">
          {pantalla === 'CARGANDO' && <Cargando />}

          {pantalla === 'PERFIL' && (
            <PerfilScreen
              inicial={perfil}
              onListo={guardarPerfilYSeguir}
              onCancelar={perfil ? () => setPantalla('INICIO') : undefined}
            />
          )}

          {pantalla === 'INICIO' && (
            <Inicio
              onJugar={jugar}
              onComoSeJuega={() => setPantalla('COMO_SE_JUEGA')}
              onRanking={() => setPantalla('RANKING')}
              onCambiarNombre={() => setPantalla('PERFIL')}
              cargando={iniciando}
              error={errorInicio ?? avisoSprites}
              mejor={mejor}
              nombre={perfil?.nombre ?? null}
            />
          )}

          {pantalla === 'COMO_SE_JUEGA' && <ComoSeJuega onVolver={() => setPantalla('INICIO')} />}

          {pantalla === 'JUGANDO' && <GameCanvas onGameOver={terminar} />}

          {pantalla === 'GAME_OVER' && perfil && (
            <GameOver
              score={score}
              sessionId={sessionId}
              perfil={perfil}
              onJugarDeNuevo={jugar}
              onRanking={() => setPantalla('RANKING')}
            />
          )}

          {pantalla === 'RANKING' && (
            <Ranking onVolver={() => setPantalla('INICIO')} onReglas={() => setPantalla('REGLAS')} />
          )}

          {pantalla === 'REGLAS' && <Reglas onVolver={() => setPantalla('RANKING')} />}
        </main>

        <ColumnaArte src={ARTE_COLUMNA} />
      </div>
    </div>
  );
}
