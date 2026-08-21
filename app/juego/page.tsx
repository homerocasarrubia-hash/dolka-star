import type { Metadata } from 'next';
import GameClient from './GameClient';
import { pixelFont } from './font';

export const metadata: Metadata = {
  title: 'Dolka Run',
  // Fuera del índice: el juego no es contenido del negocio y no debería
  // competir en buscadores con las páginas reales del sitio.
  robots: { index: false, follow: false },
};

export default function Page() {
  // La variable de la fuente se declara acá y se hereda por el árbol: el
  // contenedor del juego es descendiente de este div aunque esté en position fixed.
  return (
    <div className={pixelFont.variable}>
      <GameClient />
    </div>
  );
}
