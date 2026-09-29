// Teléfonos en el formato que espera WhatsApp.
//
// Vive acá y no adentro de la página porque un archivo de página sólo puede
// exportar lo que Next espera, y esto se puede probar por separado.

/** Cuántos dígitos tiene un número nacional argentino: área + abonado. */
const LARGO_NACIONAL = 10;

/**
 * ¿La persona escribió el número con código de país?
 *
 * Es la única señal confiable. Un "+" o un "00" adelante significa "esto ya
 * viene completo"; sin eso, damos por hecho que es un número argentino escrito
 * como se escribe acá.
 */
function traeCodigoDePais(telefono: string): boolean {
  const limpio = telefono.trim();
  return limpio.startsWith("+") || limpio.replace(/\D/g, "").startsWith("00");
}

/**
 * Pasa un teléfono escrito como lo escribe cualquiera al formato que espera
 * wa.me: código de país + número, todo junto y sin signos.
 *
 * Para Argentina eso es 54 + 9 + código de área + abonado. El 9 es obligatorio
 * en los celulares y era justo lo que faltaba: se armaba `54` + el número y
 * quedaba `543835517049`, que no le llega a nadie. Cada mensaje al cliente
 * salía a un número inexistente y en caja no se notaba, porque WhatsApp abre
 * igual y el error lo muestra él.
 *
 * No mira códigos de área: sirve igual para 3835, para 351 de Córdoba, para el
 * 11 de Buenos Aires o para uno de cuatro dígitos como 2966. Lo que mira es la
 * forma: sacar el 0 de larga distancia y el 15, que así se escriben los
 * celulares acá adentro pero no existen en el formato internacional.
 *
 * Si el número vino con código de país y NO es 54, se deja tal cual: puede ser
 * un turista o alguien de afuera, y no hay nada que adivinar ahí.
 */
export function numeroDeWhatsapp(telefono: string): string {
  const deAfuera = traeCodigoDePais(telefono);

  let d = telefono.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);

  // Vino completo y no es argentino: va como está.
  if (deAfuera && !d.startsWith("54")) return d;

  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9")) d = d.slice(1); // ningún área argentina empieza con 9
  if (d.startsWith("0")) d = d.slice(1); // 0 de larga distancia

  // El 15 va pegado después del código de área, que tiene entre 2 y 4 dígitos.
  // Sólo se saca si lo que queda son los 10 dígitos de un número nacional.
  if (d.length > LARGO_NACIONAL) {
    for (const largoArea of [4, 3, 2]) {
      if (d.slice(largoArea, largoArea + 2) === "15" && d.length - 2 === LARGO_NACIONAL) {
        d = d.slice(0, largoArea) + d.slice(largoArea + 2);
        break;
      }
    }
  }

  return `549${d}`;
}

/**
 * ¿El número da para mandarle un WhatsApp?
 *
 * Un celular argentino son 10 dígitos más el 549 adelante. Uno de afuera se
 * acepta con el largo que permite el estándar internacional, porque no hay
 * forma de validarlo mejor sin saber de qué país es.
 *
 * No distingue un celular de un fijo: en Argentina se escriben igual. Es un
 * aviso para que en caja miren el número antes de mandar, no un candado.
 */
export function pareceCelular(telefono: string): boolean {
  const numero = numeroDeWhatsapp(telefono);

  if (traeCodigoDePais(telefono) && !numero.startsWith("549")) {
    return numero.length >= 8 && numero.length <= 15;
  }

  return numero.length === 3 + LARGO_NACIONAL;
}
