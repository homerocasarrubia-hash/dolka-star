// Carga de sprites y armado del contorno.
//
// Todo esto pasa UNA vez, antes de que el juego arranque: el loop de render no
// puede quedarse esperando una imagen ni recalcular contornos por frame.

import { PALETTE, SPRITES } from './config';

/** Frames de la corrida, en orden de animación. */
const RUTAS_CORRIDA = [
  '/juego/sprites/dolka-run-1.png',
  '/juego/sprites/dolka-run-2.png',
  '/juego/sprites/dolka-run-3.png',
];

/** Un frame listo para dibujar: la imagen y su contorno ya calculado. */
export interface Frame {
  imagen: CanvasImageSource;
  /**
   * Silueta del sprite expandida 1px, pintada en accent. Se dibuja debajo de la
   * imagen, corrida (-1,-1), y el resultado es un contorno que sigue la forma
   * del personaje en vez de encerrarlo en una caja.
   */
  contorno: CanvasImageSource;
}

export interface Sprites {
  correr: Frame[];
}

let cargados: Sprites | null = null;
let enCurso: Promise<Sprites | null> | null = null;

/** Los sprites ya disponibles, o null si todavía no cargaron o fallaron. */
export function spritesListos(): Sprites | null {
  return cargados;
}

function cargarImagen(ruta: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${ruta}`));
    img.src = ruta;
  });
}

/**
 * Umbral para considerar un píxel "fondo blanco". Los PNG entregados vienen sin
 * canal alfa y con el fondo en blancos entre #F7F7F7 y #FFFFFF.
 */
const UMBRAL_FONDO = 240;

/**
 * Deja transparente el fondo blanco del sprite.
 *
 * Los archivos vinieron sin transparencia, así que sobre el fondo oscuro del
 * juego el perro se vería como un cuadrado blanco. Se limpia con un relleno por
 * inundación desde los cuatro bordes: solo se borra el blanco CONECTADO al
 * borde, así los blancos internos del dibujo (ojos, brillos, dientes) quedan
 * intactos.
 *
 * Si algún día los sprites llegan ya recortados, esto no hace nada: no hay
 * blanco de borde que quitar. Lo correcto sigue siendo exportarlos con alfa.
 */
function quitarFondoBlanco(img: HTMLImageElement, ancho: number, alto: number): HTMLCanvasElement {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  if (!ctx) return lienzo;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, ancho, alto);

  const datos = ctx.getImageData(0, 0, ancho, alto);
  const px = datos.data;
  const visto = new Uint8Array(ancho * alto);
  const cola: number[] = [];

  for (let x = 0; x < ancho; x += 1) {
    cola.push(x, (alto - 1) * ancho + x);
  }
  for (let y = 0; y < alto; y += 1) {
    cola.push(y * ancho, y * ancho + ancho - 1);
  }

  while (cola.length > 0) {
    const p = cola.pop() as number;
    if (visto[p]) continue;
    visto[p] = 1;

    const i = p * 4;
    const esFondo =
      px[i + 3] === 0 ||
      (px[i] >= UMBRAL_FONDO && px[i + 1] >= UMBRAL_FONDO && px[i + 2] >= UMBRAL_FONDO);
    if (!esFondo) continue; // el dibujo corta la inundación

    px[i + 3] = 0;
    const x = p % ancho;
    const y = (p / ancho) | 0;
    if (x > 0) cola.push(p - 1);
    if (x < ancho - 1) cola.push(p + 1);
    if (y > 0) cola.push(p - ancho);
    if (y < alto - 1) cola.push(p + ancho);
  }

  ctx.putImageData(datos, 0, 0);
  return lienzo;
}

/**
 * Contorno de 1px que sigue la silueta.
 *
 * Se dibuja la imagen ocho veces, corrida un píxel en cada dirección, y después
 * se tiñe todo de accent con 'source-in'. Queda la silueta engordada 1px; al
 * poner la imagen original encima, lo único que asoma es el borde.
 */
function armarContorno(img: CanvasImageSource, ancho: number, alto: number): HTMLCanvasElement {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho + 2;
  lienzo.height = alto + 2;
  const ctx = lienzo.getContext('2d');
  if (!ctx) return lienzo;

  ctx.imageSmoothingEnabled = false;
  const desplazamientos = [
    [0, 1], [2, 1], [1, 0], [1, 2],
    [0, 0], [2, 0], [0, 2], [2, 2],
  ];
  for (const [dx, dy] of desplazamientos) ctx.drawImage(img, dx, dy, ancho, alto);

  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = PALETTE.accent;
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);

  return lienzo;
}

/**
 * Carga los sprites una sola vez. Si alguno falla devuelve null y el juego
 * sigue con los rectángulos: quedarse sin poder jugar por una imagen que no
 * bajó sería peor que jugar con el placeholder.
 */
export function cargarSprites(): Promise<Sprites | null> {
  if (cargados) return Promise.resolve(cargados);
  if (enCurso) return enCurso;

  const { sprite } = SPRITES.player;
  enCurso = Promise.all(RUTAS_CORRIDA.map(cargarImagen))
    .then((imagenes) => {
      cargados = {
        correr: imagenes.map((cruda) => {
          const imagen = quitarFondoBlanco(cruda, sprite.w, sprite.h);
          return { imagen, contorno: armarContorno(imagen, sprite.w, sprite.h) };
        }),
      };
      return cargados;
    })
    .catch((error: unknown) => {
      console.error('[juego] no se pudieron cargar los sprites:', error);
      return null;
    });

  return enCurso;
}
