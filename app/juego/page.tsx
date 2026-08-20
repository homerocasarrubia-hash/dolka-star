import type { Metadata } from 'next';
import GameClient from './GameClient';

export const metadata: Metadata = {
  title: 'Dolka Run',
  // Fuera del índice: el juego no es contenido del negocio y no debería
  // competir en buscadores con las páginas reales del sitio.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <GameClient />;
}
