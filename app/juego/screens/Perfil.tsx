// Nombre y WhatsApp. Se piden UNA sola vez, antes de la primera partida, y
// después solo si el jugador toca "cambiar nombre". No vuelve a aparecer en
// cada game over: ahí el guardado ya es automático.
'use client';

import { useState } from 'react';
import { guardarPerfil, type Perfil as DatosPerfil } from '../game/prefs';
import { Boton, Campo, Enlace, FONDO_PORTADA, Pantalla, Titulo } from '../ui';

export default function Perfil({
  inicial,
  onListo,
  onCancelar,
}: {
  inicial: DatosPerfil | null;
  onListo: (perfil: DatosPerfil) => void;
  /** Solo se ofrece si ya había un perfil: la primera vez no hay a dónde volver. */
  onCancelar?: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [whatsapp, setWhatsapp] = useState(inicial?.whatsapp ?? '');

  const limpio = nombre.trim().replace(/\s+/g, ' ');
  const valido = limpio.length >= 3 && limpio.length <= 12;

  function confirmar() {
    if (!valido) return;
    const perfil = { nombre: limpio, whatsapp: whatsapp.trim() };
    guardarPerfil(perfil);
    onListo(perfil);
  }

  return (
    <Pantalla fondo={FONDO_PORTADA} oscurecer={0.88}>
      <Titulo className="mb-1 text-[12px]">
        {inicial ? 'CAMBIAR NOMBRE' : '¿CÓMO TE LLAMÁS?'}
      </Titulo>
      <p className="mb-5 text-center leading-snug opacity-70">
        {inicial
          ? 'El ranking va a mostrar tu nombre nuevo.'
          : 'Con esto aparecés en el ranking. Se pide una sola vez.'}
      </p>

      <div className="flex w-full flex-1 flex-col gap-4">
        <Campo
          etiqueta="Tu nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={12}
          placeholder="3 a 12 caracteres"
          autoComplete="nickname"
          autoFocus
        />
        <Campo
          etiqueta="WhatsApp (opcional)"
          ayuda="Solo para avisarte si ganás, no se muestra a nadie."
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          inputMode="tel"
          placeholder="3835 517049"
          autoComplete="tel"
        />
      </div>

      <div className="w-full pt-4">
        <Boton variante="primario" onClick={confirmar} disabled={!valido}>
          LISTO
        </Boton>
        {onCancelar && (
          <div className="mt-3 text-center">
            <Enlace onClick={onCancelar}>Cancelar</Enlace>
          </div>
        )}
      </div>
    </Pantalla>
  );
}
