// Alerta sonora de las pantallas internas (cocina y mozo).
//
// Un solo AudioContext para toda la página, creado la primera vez que suena.
// Antes cada aviso hacía `new AudioContext()` y no lo cerraba nunca: los
// navegadores permiten un puñado por documento (Chrome corta cerca de seis) y
// después el constructor tira. Con el `catch {}` que envolvía al beep, eso no
// se veía: la cocina simplemente dejaba de sonar en mitad del servicio y los
// pedidos entraban en silencio.

let ctx: AudioContext | null = null;

function contexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    ctx = new AudioCtx();
    return ctx;
  } catch {
    return null;
  }
}

type Opciones = {
  /** Pico de volumen, 0 a 1. */
  volumen?: number;
  /** Cuánto dura cada nota, en segundos. */
  duracion?: number;
  /** Cuánto se separa una nota de la siguiente, en segundos. */
  separacion?: number;
};

/**
 * Toca una secuencia de notas (en Hz). No tira nunca: si el navegador no
 * soporta Web Audio o la política de autoplay lo bloquea, no suena y listo.
 */
export function sonar(
  notas: number[],
  { volumen = 0.3, duracion = 0.3, separacion = 0.2 }: Opciones = {},
): void {
  const audio = contexto();
  if (!audio) return;
  try {
    // Después de un rato sin uso, o hasta el primer gesto del usuario, el
    // contexto queda "suspended" y los osciladores no se escuchan.
    if (audio.state === "suspended") void audio.resume();

    notas.forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = audio.currentTime + i * separacion;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volumen, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duracion);
      osc.start(t);
      osc.stop(t + duracion);
      // Los nodos se sueltan solos, pero desconectarlos al terminar evita que
      // queden colgados del destino durante toda la noche de servicio.
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  } catch {
    // Nada que hacer: el aviso visual sigue estando.
  }
}

/**
 * Deja el audio listo y avisa si el navegador lo tiene trabado.
 *
 * Chrome y Safari no dejan sonar nada hasta que alguien toca la página. En una
 * tablet de cocina eso importa: se entra con el PIN, la página recarga, y el
 * primer pedido de la noche entraba sin hacer ruido. Acá el contexto se
 * destraba con el primer toque —cualquiera, en cualquier parte de la pantalla—
 * y mientras siga trabado la pantalla lo puede decir en vez de fallar callada.
 *
 * Devuelve la función para desengancharlo todo.
 */
export function prepararSonido(avisar: (bloqueado: boolean) => void): () => void {
  const audio = contexto();
  if (!audio) {
    // Navegador sin Web Audio: no hay nada que destrabar ni que avisar.
    avisar(false);
    return () => {};
  }

  const revisar = () => avisar(audio.state !== "running");
  revisar();

  const destrabar = () => {
    audio.resume().then(revisar).catch(revisar);
  };

  // Los listeners quedan puestos: un contexto destrabado se puede volver a
  // suspender solo después de un rato largo sin uso.
  audio.addEventListener("statechange", revisar);
  window.addEventListener("pointerdown", destrabar);
  window.addEventListener("keydown", destrabar);

  return () => {
    audio.removeEventListener("statechange", revisar);
    window.removeEventListener("pointerdown", destrabar);
    window.removeEventListener("keydown", destrabar);
  };
}

/**
 * Enciende el sonido, a pedido de la persona.
 *
 * Esto existe porque en el local pasó lo esperable: nadie tocaba la pantalla
 * después de entrar con el PIN, el navegador mantenía el audio bloqueado y las
 * comandas entraban mudas. Un cartel pidiendo "tocá la pantalla" es fácil de
 * ignorar; un botón que suena cuando lo apretás no deja dudas de si quedó
 * andando.
 *
 * Tiene que llamarse desde el click, no después de un await: el permiso del
 * navegador vale para el gesto que lo disparó.
 */
export async function activarSonido(): Promise<boolean> {
  const audio = contexto();
  if (!audio) return false;
  try {
    await audio.resume();
  } catch {
    return false;
  }
  if (audio.state !== "running") return false;
  // Un tono corto de confirmación: si se escucha, está listo de verdad.
  sonar([880], { volumen: 0.3, duracion: 0.18 });
  return true;
}

/** ¿El navegador está dejando sonar? */
export function sonidoAndando(): boolean {
  return contexto()?.state === "running";
}

/**
 * El aviso de comanda nueva en la cocina: tres pulsos, no uno.
 *
 * Un pitido corto y solo se pierde entre la plancha y la música. Repetido se
 * impone, y si alguien está de espaldas igual lo escucha.
 */
export function avisoDeComanda(): void {
  sonar([880, 880, 880], { volumen: 0.6, duracion: 0.22, separacion: 0.32 });
}
