// Instrucciones en tres pasos, ilustradas con los sprites del propio juego:
// lo que se explica acá es exactamente lo que se va a ver en la partida.
'use client';

import type { ReactNode } from 'react';
import { INGREDIENT_ORDER, PALETTE, SPRITES } from '../game/config';
import { spritesListos } from '../game/sprites';
import { Boton, FONDO_PORTADA, Pantalla, Titulo } from '../ui';

/** Los sprites van al doble para que se lean, y sin suavizado. */
const LADO = 96;
const PIXELADO = { imageRendering: 'pixelated' as const };

function Sprite({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      width={LADO}
      height={LADO}
      style={PIXELADO}
      className="block"
    />
  );
}

/** La celda del ingrediente mide 24 y acá se dibuja al doble. */
const ESCALA = 2;
const CELDA = SPRITES.ingredient.sprite.w * ESCALA;

/**
 * Las cuatro capas apiladas como en el HUD del juego.
 *
 * Los desplazamientos NO son fijos: salen de las filas que ocupa el dibujo de
 * cada archivo, medidas del canal alfa al cargar. Cada capa se ubica para que su
 * última fila con dibujo caiga justo encima de la primera fila de la de abajo:
 * ni superpuestas ni con hueco. Si mañana cambia un sprite, la pila se reacomoda
 * sola sin tocar este archivo.
 */
function capasApiladas() {
  const sprites = spritesListos();
  if (!sprites) return null;

  // INGREDIENT_ORDER ya viene de abajo hacia arriba: es el orden en que se
  // junta la hamburguesa, y también el orden en que se apila.
  const puestas: { url: string; top: number; arriba: number }[] = [];
  let base = 0; // fila donde tiene que terminar el dibujo de la capa en curso

  for (const tipo of INGREDIENT_ORDER) {
    const { celda } = sprites.ingredientes[tipo];
    // El dibujo de la fila r ocupa, al doble, las filas 2r y 2r+1.
    const top = base - (celda.ultimaFila * ESCALA + ESCALA - 1);
    const arriba = top + celda.primeraFila * ESCALA;
    puestas.push({ url: celda.url, top, arriba });
    base = arriba - 1; // la próxima termina justo encima de esta
  }

  // La pila se armó hacia arriba desde 0, así que arranca en negativo: se la
  // corre entera para centrarla en el cuadro del paso.
  const arribaDeTodo = Math.min(...puestas.map((p) => p.arriba));
  const alto = 0 - arribaDeTodo + 1;
  const corrimiento = Math.round((LADO - alto) / 2) - arribaDeTodo;

  return puestas.map((p) => ({ ...p, top: p.top + corrimiento }));
}

function Hamburguesa() {
  const capas = capasApiladas();
  if (!capas) return <div style={{ width: LADO, height: LADO }} />;

  return (
    <div className="relative" style={{ width: LADO, height: LADO }}>
      {capas.map((capa, i) => (
        <img
          key={i}
          src={capa.url}
          alt=""
          aria-hidden
          width={CELDA}
          height={CELDA}
          style={{
            ...PIXELADO,
            position: 'absolute',
            left: (LADO - CELDA) / 2,
            top: capa.top,
          }}
        />
      ))}
    </div>
  );
}

const PASOS: { n: number; titulo: string; texto: string; dibujo: ReactNode }[] = [
  {
    n: 1,
    titulo: 'SALTÁ',
    texto: 'Tocá la pantalla o apretá Espacio. Cuanto más lo mantenés, más alto saltás.',
    dibujo: <Sprite src="/juego/sprites/dolka-jump.png" />,
  },
  {
    n: 2,
    titulo: 'AGACHATE',
    texto: 'Deslizá el dedo hacia abajo o apretá la flecha abajo para pasar por debajo de los carteles.',
    dibujo: <Sprite src="/juego/sprites/dolka-slide.png" />,
  },
  {
    n: 3,
    titulo: 'ARMÁ LA HAMBURGUESA',
    texto: 'Juntá pan, carne, queso y pan en ese orden. Completarla multiplica todo lo que sumes después.',
    dibujo: <Hamburguesa />,
  },
];

export default function ComoSeJuega({ onVolver }: { onVolver: () => void }) {
  return (
    <Pantalla fondo={FONDO_PORTADA} oscurecer={0.88}>
      <Titulo className="mb-4 shrink-0 text-[13px]">CÓMO SE JUEGA</Titulo>

      <div className="flex w-full flex-1 flex-col justify-evenly gap-3 py-2">
        {PASOS.map((paso) => (
          <div key={paso.n} className="flex items-center gap-3">
            <div className="shrink-0">{paso.dibujo}</div>
            <div className="min-w-0">
              <p className="uppercase tracking-widest" style={{ color: PALETTE.accent }}>
                {paso.n}. {paso.titulo}
              </p>
              <p className="mt-1 leading-snug opacity-90">{paso.texto}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full shrink-0 pt-4">
        <Boton onClick={onVolver}>VOLVER</Boton>
      </div>
    </Pantalla>
  );
}
