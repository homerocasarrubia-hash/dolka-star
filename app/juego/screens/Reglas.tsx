// Reglas del concurso.
//
// Lo que está acá es lo que el código ya garantiza: la semana, el corte, el
// tamaño de la tabla y la validación presencial. El premio y las condiciones
// comerciales las tiene que definir el negocio, así que quedan marcadas.
'use client';

import { PALETTE } from '../game/config';
import { Boton, Pantalla, Titulo } from '../ui';

const REGLAS = [
  'La semana va de lunes 00:00 a domingo 23:59, hora de Argentina.',
  'Entran los 20 mejores puntajes de la semana. Cada partida se registra una sola vez.',
  'Al cierre del domingo gana el puntaje más alto de la tabla.',
  'Para cobrar el premio hay que pasar por el local y validar el puntaje.',
  'El WhatsApp es opcional y solo se usa para avisarle al ganador. No se publica.',
];

export default function Reglas({ onVolver }: { onVolver: () => void }) {
  return (
    <Pantalla>
      <Titulo className="mb-4 text-[12px]">REGLAS</Titulo>

      <ul className="flex w-full flex-1 flex-col gap-3">
        {REGLAS.map((regla) => (
          <li key={regla} className="flex gap-2 leading-snug">
            <span style={{ color: PALETTE.accent }}>▸</span>
            <span className="opacity-85">{regla}</span>
          </li>
        ))}
      </ul>

      {/* TODO: reemplazar con el premio y las condiciones que defina Dolka Star. */}
      <p className="mt-4 w-full border-2 px-2 py-2 leading-snug opacity-60"
         style={{ borderColor: `${PALETTE.white}44`, borderRadius: 0 }}>
        El premio de esta semana se anuncia en @dolkastar.
      </p>

      <div className="w-full pt-4">
        <Boton onClick={onVolver}>VOLVER</Boton>
      </div>
    </Pantalla>
  );
}
