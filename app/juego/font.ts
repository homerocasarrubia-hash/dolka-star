// Press Start 2P, solo para títulos y botones: a tamaños chicos es ilegible
// para texto corrido, así que el cuerpo sigue con una monoespaciada del sistema.
import { Press_Start_2P } from 'next/font/google';

export const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pixel',
});
