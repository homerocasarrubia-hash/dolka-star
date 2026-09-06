// Sonido del juego: música de fondo y golpe de derrota.
//
// Dos decisiones de fondo, las dos por el celular:
//
// 1. ARRANCA SILENCIADO. Los navegadores móviles bloquean el autoplay y una
//    llamada a play() sin gesto del usuario queda rechazada; peor todavía, un
//    juego que suena solo apenas se abre es una razón para cerrarlo. El sonido
//    se enciende solo si el jugador toca el botón.
//
// 2. NO BLOQUEA NADA. Los archivos se piden aparte del preloader de sprites y
//    todas las llamadas a play() se tragan el rechazo. Si el mp3 no cargó, o
//    falló, o el navegador se planta, el juego se juega igual en silencio y sin
//    ningún cartel: el audio es un adorno, no un requisito.
//
// Se usan elementos Audio y no Web Audio API a propósito: para dos pistas
// sueltas, con loop y volumen, el elemento alcanza y es lo más predecible en
// Safari de iOS, donde el AudioContext arrastra su propio estado suspendido.

const RUTAS = {
  musica: '/juego/audio/musica.mp3',
  derrota: '/juego/audio/game-over.mp3',
} as const;

/** Se recuerda entre visitas: el que silenció una vez no lo quiere de nuevo. */
const CLAVE = 'dolkastar.juego.audio.v1';

const VOLUMEN = { musica: 0.45, derrota: 0.8 } as const;

let musica: HTMLAudioElement | null = null;
let derrota: HTMLAudioElement | null = null;

let silenciado = true;
let preparado = false;
/** Hay una partida en curso: la música tiene que sonar salvo que falte foco. */
let enPartida = false;

function leerPreferencia(): boolean {
  try {
    const guardado = window.localStorage.getItem(CLAVE);
    return guardado === null ? true : guardado === 'silenciado';
  } catch {
    return true; // modo incógnito o storage bloqueado: silencio, que es el default
  }
}

function guardarPreferencia(): void {
  try {
    window.localStorage.setItem(CLAVE, silenciado ? 'silenciado' : 'con-sonido');
  } catch {
    // Sin storage se pierde la preferencia al recargar. No es motivo para nada más.
  }
}

/** play() puede rechazar por autoplay bloqueado, o ni existir en un navegador viejo. */
function reproducir(audio: HTMLAudioElement | null): void {
  if (!audio || silenciado) return;
  void audio.play().catch(() => {
    // Silencio y seguimos: el juego no depende de esto.
  });
}

function crear(ruta: string, loop: boolean, volumen: number): HTMLAudioElement | null {
  try {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = loop;
    audio.volume = volumen;
    audio.src = ruta;
    audio.load();
    return audio;
  } catch {
    return null;
  }
}

/**
 * Crea los elementos y engancha los listeners de foco. Idempotente: la llama la
 * pantalla al montarse y no pasa nada si se llama de nuevo.
 */
export function prepararAudio(): void {
  if (preparado || typeof window === 'undefined') return;
  preparado = true;

  silenciado = leerPreferencia();
  musica = crear(RUTAS.musica, true, VOLUMEN.musica);
  derrota = crear(RUTAS.derrota, false, VOLUMEN.derrota);

  // Pestaña en segundo plano o ventana sin foco: se pausa la música y se
  // retoma al volver, en el mismo punto.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pausarPorFoco();
    else reanudarPorFoco();
  });
  window.addEventListener('blur', pausarPorFoco);
  window.addEventListener('focus', reanudarPorFoco);
}

export function estaSilenciado(): boolean {
  return silenciado;
}

/**
 * Cambia el estado y lo guarda. Devuelve el nuevo valor.
 *
 * OJO: hay que llamarla desde el handler del click, sin await en el medio. Al
 * encender el sonido se "destraba" cada pista tocándola y pausándola dentro del
 * gesto del usuario, que es lo que después habilita a reproducirlas por código.
 * En iOS, sin esa destrabada, la música nunca arranca sola.
 */
export function alternarSilencio(): boolean {
  silenciado = !silenciado;
  guardarPreferencia();

  if (silenciado) {
    if (musica) musica.pause();
    if (derrota) derrota.pause();
    return silenciado;
  }

  destrabar(derrota);
  if (enPartida) reproducir(musica);
  else destrabar(musica);

  return silenciado;
}

/** Toca y pausa en el acto: deja la pista habilitada para sonar más tarde. */
function destrabar(audio: HTMLAudioElement | null): void {
  if (!audio) return;
  void audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
    })
    .catch(() => {
      // Igual que siempre: si no se puede, no se puede.
    });
}

/** Arranca la música desde el principio. Cada partida empieza con el mismo tema. */
export function musicaDeLaPartida(): void {
  enPartida = true;
  if (!musica) return;
  try {
    musica.currentTime = 0;
  } catch {
    // Todavía sin metadata: arranca de donde esté, que es el principio.
  }
  reproducir(musica);
}

/**
 * Fin de partida: para la música y suena la derrota. En ese orden, para que no
 * se pisen.
 */
export function sonidoDeDerrota(): void {
  enPartida = false;
  if (musica) musica.pause();
  if (derrota) {
    try {
      derrota.currentTime = 0;
    } catch {
      // Ver arriba.
    }
    reproducir(derrota);
  }
}

/** Salir de la partida sin perder (volver al menú): corta todo sin sonido. */
export function pararMusica(): void {
  enPartida = false;
  if (musica) musica.pause();
}

function pausarPorFoco(): void {
  if (musica) musica.pause();
}

function reanudarPorFoco(): void {
  if (enPartida) reproducir(musica);
}
