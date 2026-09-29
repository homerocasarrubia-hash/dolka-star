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
