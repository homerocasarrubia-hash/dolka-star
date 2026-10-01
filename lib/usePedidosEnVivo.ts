'use client'

// La conexión en vivo de las tres pantallas internas.
//
// Las tres hacían lo mismo escrito tres veces: un fetch al montar, un canal de
// Pusher y listo. Eso alcanza mientras nada falle, y en un local algo falla:
//
//   • Se corta el WiFi dos minutos. Pusher reconecta solo, pero los pedidos que
//     entraron durante el corte no los manda de nuevo: la cocina nunca se
//     entera de esas comandas. Acá, cada vez que el socket vuelve, se pide la
//     lista otra vez.
//
//   • La tablet queda en otra pestaña o con la pantalla apagada. Al volver, la
//     lista se refresca en vez de mostrar lo de hace una hora.
//
//   • Si falta NEXT_PUBLIC_PUSHER_KEY, `new Pusher(undefined)` tira y la
//     pantalla se cae entera. Acá se sigue sin tiempo real, refrescando cada
//     veinte segundos, que es mucho mejor que una pantalla en blanco.
//
// `conectado` sale para afuera a propósito: el que está cocinando tiene que
// poder ver de un vistazo si lo que mira está vivo o congelado.

import { useCallback, useEffect, useRef, useState } from 'react'
import Pusher from 'pusher-js'
import { canalDelLocal } from './canal'

export interface PedidoConId {
  id: number
  estado: string
  creadoEn: string
}

/**
 * Cada cuánto se le vuelve a preguntar al servidor, haya socket o no.
 *
 * Antes, con el socket "conectado", se preguntaba cada cinco minutos. Eso
 * alcanza sólo si el socket además está entregando: en el local pasó que la
 * conexión figuraba viva pero los pedidos no llegaban, y la pantalla se quedaba
 * atrasada hasta que alguien la recargaba a mano. Pusher sigue sirviendo para
 * que el pedido entre al instante; esto es la red de seguridad, y tiene que
 * estar lo bastante seguido como para que nadie necesite recargar nada.
 */
const REFRESCO_MS = 15 * 1000

interface Opciones<T> {
  /** Local elegido en la pantalla. */
  local: string
  /** Qué se le agrega al pedido a la API, además del `local`. Ej: `&desde=...`. */
  extra?: string
  /** Qué pedidos le importan a esta pantalla. Los demás ni entran ni se quedan. */
  filtrar?: (pedido: T) => boolean
  /**
   * Un pedido que llega o cambia. Sirve para el aviso sonoro: recibe también la
   * lista de antes, para saber si es nuevo o qué estado tenía.
   */
  alCambiar?: (pedido: T, anteriores: T[]) => void
  /** false mientras la pantalla todavía no sabe qué pedir (caja espera el turno). */
  activo?: boolean
}

export function usePedidosEnVivo<T extends PedidoConId>({
  local,
  extra = '',
  filtrar,
  alCambiar,
  activo = true,
}: Opciones<T>) {
  const [pedidos, setPedidos] = useState<T[]>([])
  const [error, setError] = useState<string | null>(null)
  const [conectado, setConectado] = useState(false)
  // Cuándo fue la última vez que el servidor contestó. Se muestra en pantalla:
  // si algo se traba, se nota en vez de parecer que no hay pedidos.
  const [ultimaCarga, setUltimaCarga] = useState<Date | null>(null)

  // Estas cambian de identidad en cada render. Por ref, para que el efecto no
  // se vuelva a suscribir sesenta veces por minuto.
  const filtrarRef = useRef(filtrar)
  const alCambiarRef = useRef(alCambiar)
  const pedidosRef = useRef(pedidos)
  filtrarRef.current = filtrar
  alCambiarRef.current = alCambiar
  pedidosRef.current = pedidos

  const url = `/api/pedidos?local=${local}${extra}`

  // Cada carga lleva número: si una respuesta vieja llega tarde, se descarta en
  // vez de pisar a la nueva.
  const cargaActual = useRef(0)
  // La primera carga de cada local no avisa nada: son los pedidos que ya
  // estaban, no novedades. Sonarían veinte comandas juntas al abrir la pantalla.
  const yaCargoUnaVez = useRef(false)
  // Momento del último cierre de caja. Lo anterior a esa hora ya no se muestra:
  // sin esto, el próximo refresco volvía a traer toda la noche a una pantalla
  // que se acababa de limpiar a propósito.
  const corte = useRef<number | null>(null)

  const refrescar = useCallback(async () => {
    if (!activo) return
    const mia = ++cargaActual.current
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`GET /api/pedidos ${res.status}`)
      const data: T[] = await res.json()
      if (mia !== cargaActual.current) return

      const filtro = filtrarRef.current
      const deEsteTurno = corte.current === null
        ? data
        : data.filter(p => new Date(p.creadoEn).getTime() >= corte.current!)
      const lista = filtro ? deEsteTurno.filter(filtro) : deEsteTurno

      // Lo que cambió mientras la pantalla no escuchaba también merece aviso.
      // Si no, los pedidos que entraron durante un corte de WiFi aparecían
      // callados en una pantalla que nadie estaba mirando.
      if (yaCargoUnaVez.current) {
        const anteriores = pedidosRef.current
        for (const pedido of lista) {
          const antes = anteriores.find(p => p.id === pedido.id)
          if (!antes || antes.estado !== pedido.estado) {
            alCambiarRef.current?.(pedido, anteriores)
          }
        }
      }
      yaCargoUnaVez.current = true

      setPedidos(lista)
      setUltimaCarga(new Date())
      setError(null)
    } catch (err) {
      if (mia !== cargaActual.current) return
      console.error('[pedidos] no se pudo cargar la lista:', err)
      setError('No se pudo cargar la lista de pedidos.')
    }
  }, [url, activo])

  useEffect(() => {
    if (!activo) return

    // Al cambiar de local, la lista se vacía antes de pedir la nueva: si no, se
    // ven los pedidos del otro local hasta que responda el fetch. Y lo que
    // llegue en esa primera carga es "lo que ya había", no una novedad.
    setPedidos([])
    yaCargoUnaVez.current = false
    // Turno nuevo o local nuevo: se mira todo lo que devuelva la API.
    corte.current = null
    refrescar()

    function upsert(pedido: T) {
      // El aviso va afuera del updater: React puede correr un updater dos veces
      // y el beep sonaría doble.
      alCambiarRef.current?.(pedido, pedidosRef.current)

      const filtro = filtrarRef.current
      setPedidos(prev => {
        // Un pedido que dejó de importarle a esta pantalla (caja lo devolvió a
        // "pendiente", por ejemplo) se saca en vez de quedar congelado.
        if (filtro && !filtro(pedido)) return prev.filter(p => p.id !== pedido.id)
        if (prev.some(p => p.id === pedido.id)) {
          return prev.map(p => (p.id === pedido.id ? { ...p, ...pedido } : p))
        }
        return [pedido, ...prev]
      })
    }

    const clave = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    let pusher: Pusher | null = null

    if (clave && cluster) {
      pusher = new Pusher(clave, { cluster })
      const channel = pusher.subscribe(canalDelLocal(local))
      channel.bind('nuevo-pedido', upsert)
      channel.bind('pedido-actualizado', upsert)

      // El socket puede conectar y la suscripción al canal fallar igual. Sin
      // esto la pantalla se mostraba "en vivo" sin estarlo, que es peor que
      // decir la verdad: no llega ningún pedido y nadie entiende por qué.
      channel.bind('pusher:subscription_error', (datos: unknown) => {
        console.error('[pedidos] no se pudo suscribir al canal del local:', datos)
        setConectado(false)
      })
      channel.bind('pusher:subscription_succeeded', () => setConectado(true))
      channel.bind('caja-cerrada', () => {
        corte.current = Date.now()
        setPedidos([])
      })

      let yaEstuvoConectado = false
      pusher.connection.bind('state_change', ({ current }: { current: string }) => {
        const vivo = current === 'connected'
        setConectado(vivo)
        // La primera conexión no: la lista se acaba de pedir al montar. Las
        // siguientes sí, porque mientras estuvo caído pudo entrar cualquier cosa.
        if (vivo && yaEstuvoConectado) refrescar()
        if (vivo) yaEstuvoConectado = true
      })
    } else {
      console.error(
        '[pedidos] falta NEXT_PUBLIC_PUSHER_KEY o NEXT_PUBLIC_PUSHER_CLUSTER: sin tiempo real, la pantalla se refresca sola',
      )
    }

    function alVolver() {
      if (document.visibilityState === 'visible') refrescar()
    }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('online', refrescar)

    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('online', refrescar)
      if (pusher) {
        pusher.connection.unbind_all()
        // `disconnect` da de baja el canal y cierra el socket. Sin esto, cada
        // cambio de local deja un WebSocket abierto para siempre: en una tablet
        // que no se recarga nunca, se van sumando toda la noche.
        pusher.disconnect()
      }
      setConectado(false)
    }
  }, [local, activo, refrescar])

  // La red de seguridad: se vuelve a pedir la lista cada tanto, siempre. Va en
  // su propio efecto para no volver a suscribir el canal en cada vuelta.
  useEffect(() => {
    if (!activo) return
    const reloj = setInterval(refrescar, REFRESCO_MS)
    return () => clearInterval(reloj)
  }, [activo, refrescar])

  return { pedidos, setPedidos, error, setError, conectado, ultimaCarga, refrescar }
}
