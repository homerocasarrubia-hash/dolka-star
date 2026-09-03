// Carga de sprites, apoyo en el piso y armado del contorno.
//
// Todo esto pasa UNA vez, antes de que el juego arranque: el loop de render no
// puede quedarse esperando una imagen, ni recalcular contornos o buscar el
// borde inferior del dibujo por frame.

import { SPRITES, PALETTE } from './config';

/**
 * Los archivos, agrupados por estado. La corrida es el único grupo con más de
 * un cuadro: los demás estados son una pose fija.
 */
const RUTAS = {
  correr: [
    '/juego/sprites/dolka-run-1.png',
    '/juego/sprites/dolka-run-2.png',
    '/juego/sprites/dolka-run-3.png',
  ],
  saltar: ['/juego/sprites/dolka-jump.png'],
  deslizar: ['/juego/sprites/dolka-slide.png'],
  golpe: ['/juego/sprites/dolka-hit.png'],
} as const;

/** Un cuadro listo para dibujar: imagen, contorno y corrección de apoyo. */
export interface Frame {
  imagen: CanvasImageSource;
  /**
   * Silueta del sprite expandida 1px, pintada en accent. Se dibuja debajo de la
   * imagen, corrida (-1,-1), y el resultado es un contorno que sigue la forma
   * del personaje en vez de encerrarlo en una caja.
   */
  contorno: CanvasImageSource;
  /**
   * Cuánto hay que bajar el cuadro de 48x48 para que el dibujo quede apoyado en
   * los pies. Ver `apoyoDelGrupo`.
   */
  ajusteY: number;
}

export interface Sprites {
  correr: Frame[];
  saltar: Frame;
  deslizar: Frame;
  golpe: Frame;
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
 * Umbral para considerar un píxel "fondo blanco", en la limpieza de respaldo.
 */
const UMBRAL_FONDO = 240;

/** Imagen ya lista, más la última fila del cuadro donde hay dibujo. */
interface Preparada {
  lienzo: HTMLCanvasElement;
  ultimaFila: number;
}

/**
 * Pasa la imagen a un canvas y devuelve la última fila con dibujo.
 *
 * De paso, y SOLO si el archivo viene sin nada de transparencia, borra el fondo
 * blanco con un relleno por inundación desde los cuatro bordes. Es una red para
 * un export mal hecho: si el PNG ya trae alfa —como los actuales— no se toca
 * nada, porque el dibujo puede apoyarse en el borde del cuadro (el del slide lo
 * hace) y una limpieza a ciegas se le comería píxeles.
 */
function prepararImagen(img: HTMLImageElement, ancho: number, alto: number): Preparada {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  if (!ctx) return { lienzo, ultimaFila: alto - 1 };

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, ancho, alto);

  const datos = ctx.getImageData(0, 0, ancho, alto);
  const px = datos.data;

  let transparentes = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] === 0) transparentes += 1;

  if (transparentes === 0) {
    console.warn('[juego] sprite sin canal alfa: se limpia el fondo blanco a mano');
    quitarFondoBlanco(px, ancho, alto);
    ctx.putImageData(datos, 0, 0);
  }

  // Borde inferior real del dibujo, ignorando el aire de abajo del cuadro.
  let ultimaFila = alto - 1;
  for (let y = alto - 1; y >= 0; y -= 1) {
    let hayDibujo = false;
    for (let x = 0; x < ancho; x += 1) {
      if (px[(y * ancho + x) * 4 + 3] > 0) {
        hayDibujo = true;
        break;
      }
    }
    if (hayDibujo) {
      ultimaFila = y;
      break;
    }
  }

  return { lienzo, ultimaFila };
}

/**
 * Relleno por inundación desde los bordes: borra solo el blanco CONECTADO al
 * borde, así los blancos internos del dibujo (ojos, brillos, dientes) quedan
 * intactos. Modifica el buffer en el lugar.
 */
function quitarFondoBlanco(px: Uint8ClampedArray, ancho: number, alto: number): void {
  const visto = new Uint8Array(ancho * alto);
  const cola: number[] = [];

  for (let x = 0; x < ancho; x += 1) cola.push(x, (alto - 1) * ancho + x);
  for (let y = 0; y < alto; y += 1) cola.push(y * ancho, y * ancho + ancho - 1);

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
 * Fila del cuadro de 48x48 donde tienen que terminar los pies.
 *
 * `playerSpriteRect` ubica el cuadro en `feetY - hitbox.h - hitboxOffset.y`, y
 * la última fila de aire antes del piso es `feetY - 1`. Restando una cosa de la
 * otra queda la fila del cuadro que corresponde al piso.
 */
const FILA_DE_APOYO = SPRITES.player.hitbox.h + SPRITES.player.hitboxOffset.y - 1;

/**
 * Cuánto bajar un grupo de cuadros para que quede apoyado en el piso.
 *
 * Los dibujos no ocupan todo el cuadro de 48x48 y cada estado deja una cantidad
 * distinta de aire abajo: el del slide, por ser más ancho que alto, queda casi
 * centrado y sin corrección flotaría más de diez píxeles. Se mide dónde termina
 * el dibujo de verdad y se lo baja hasta el piso.
 *
 * El ajuste es UNO POR GRUPO, no por cuadro: en la corrida, la diferencia de
 * 1px entre un cuadro y otro es la pata levantada, o sea la animación misma.
 * Apoyando cada cuadro por separado esa diferencia se perdería.
 */
function apoyoDelGrupo(preparadas: Preparada[]): number {
  const masBajo = Math.max(...preparadas.map((p) => p.ultimaFila));
  return FILA_DE_APOYO - masBajo;
}

function armarGrupo(imagenes: HTMLImageElement[]): Frame[] {
  const { sprite } = SPRITES.player;
  const preparadas = imagenes.map((img) => prepararImagen(img, sprite.w, sprite.h));
  const ajusteY = apoyoDelGrupo(preparadas);

  return preparadas.map(({ lienzo }) => ({
    imagen: lienzo,
    contorno: armarContorno(lienzo, sprite.w, sprite.h),
    ajusteY,
  }));
}

/**
 * Carga los sprites una sola vez. Si alguno falla devuelve null y el juego
 * sigue con los rectángulos: quedarse sin poder jugar por una imagen que no
 * bajó sería peor que jugar con el placeholder.
 */
export function cargarSprites(): Promise<Sprites | null> {
  if (cargados) return Promise.resolve(cargados);
  if (enCurso) return enCurso;

  const grupos = [RUTAS.correr, RUTAS.saltar, RUTAS.deslizar, RUTAS.golpe];

  enCurso = Promise.all(grupos.map((rutas) => Promise.all(rutas.map(cargarImagen))))
    .then(([correr, saltar, deslizar, golpe]) => {
      cargados = {
        correr: armarGrupo(correr),
        saltar: armarGrupo(saltar)[0],
        deslizar: armarGrupo(deslizar)[0],
        golpe: armarGrupo(golpe)[0],
      };
      return cargados;
    })
    .catch((error: unknown) => {
      console.error('[juego] no se pudieron cargar los sprites:', error);
      return null;
    });

  return enCurso;
}
