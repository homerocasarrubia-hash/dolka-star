'use client'

import { useEffect, useState } from 'react'
import Pusher from 'pusher-js'
import { sonar } from '@/lib/alerta'

interface ItemPedido {
  nombre: string
  variante?: string
  cantidad: number
  precio: number
  aclaracion?: string
}

interface Pedido {
  id: number
  cliente: string
  modalidad: string
  direccion?: string
  items: ItemPedido[]
  total: number
  estado: string
  creadoEn: string
  local: string
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente:      'PENDIENTE',
  en_espera:      'PENDIENTE',       // llega de caja/mozo, espera que cocina arranque
  en_preparacion: 'EN PREPARACIÓN',
  listo:          'LISTO ✅',
  cobrado:        'COBRADO ✓',
  entregado:      'ENTREGADO',
  eliminado:      'ELIMINADO',
}

const ESTADO_COLOR: Record<string, string> = {
  pendiente:      'bg-red-600 text-white',
  en_espera:      'bg-red-600 text-white',
  en_preparacion: 'bg-amber-400 text-black',
  listo:          'bg-green-600 text-white',
  cobrado:        'bg-teal-600 text-white',
  entregado:      'bg-zinc-600 text-white',
  eliminado:      'bg-zinc-800 text-zinc-400',
}

const LEFT_BORDER: Record<string, string> = {
  pendiente:      'border-l-4 border-red-600',
  en_espera:      'border-l-4 border-red-600',
  en_preparacion: 'border-l-4 border-amber-400',
  listo:          'border-l-4 border-green-500',
  cobrado:        'border-l-4 border-teal-500',
  entregado:      'border-l-4 border-zinc-600',
  eliminado:      'border-l-4 border-zinc-700',
}

const PROXIMO: Record<string, { estado: string; label: string; clase: string } | null> = {
  pendiente:      { estado: 'en_preparacion', label: '🍳 INICIAR',      clase: 'bg-amber-400 hover:bg-amber-300 text-black' },
  en_espera:      { estado: 'en_preparacion', label: '🍳 INICIAR',      clase: 'bg-amber-400 hover:bg-amber-300 text-black' },
  en_preparacion: { estado: 'listo',          label: '✅ MARCAR LISTO', clase: 'bg-green-600 hover:bg-green-500 text-white' },
  listo:          null, // espera que caja cobre
  cobrado:        { estado: 'entregado',      label: '🛵 ENTREGAR',     clase: 'bg-red-600 hover:bg-red-500 text-white' },
  entregado:      null,
  eliminado:      null,
}

const PREVIO: Record<string, { estado: string; label: string } | null> = {
  pendiente:      null,
  en_espera:      null,
  en_preparacion: { estado: 'en_espera',      label: '↩ PENDIENTE' },
  listo:          { estado: 'en_preparacion', label: '↩ EN PREP.' },
  cobrado:        { estado: 'listo',          label: '↩ LISTO' },
  entregado:      null,
  eliminado:      { estado: 'en_espera',      label: '↩ RECUPERAR' },
}

/** Aviso de pedido nuevo: un tono seco, fuerte y corto. */
function beep() {
  sonar([520], { volumen: 0.3, duracion: 0.4 })
}

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [local, setLocal] = useState<'andalgala' | 'belen'>('andalgala')
  const [confirmandoBorrar, setConfirmandoBorrar] = useState<number | null>(null)
  const [verHistorial, setVerHistorial] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Al cambiar de local la lista se vacía primero: si no, se veían los
    // pedidos del otro local hasta que respondía el fetch nuevo.
    setPedidos([])
    let vigente = true

    // Cargamos todo lo que ya salió de pendiente (en_espera en adelante)
    fetch(`/api/pedidos?local=${local}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`GET /api/pedidos ${r.status}`)))
      .then((data: Pedido[]) => {
        // Si mientras respondía se cambió de local, esta respuesta ya no sirve.
        if (!vigente) return
        setPedidos(data.filter(p => p.estado !== 'pendiente'))
      })
      .catch(err => console.error('[cocina] no se pudo cargar la lista de pedidos:', err))

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })

    const channel = pusher.subscribe(`cocina-${local}`)

    channel.bind('pedido-actualizado', (pedido: Pedido) => {
      // 'pendiente' puro no llega a cocina; en_espera y el resto sí
      if (pedido.estado === 'pendiente') return
      // Beep al cocina cuando llega un pedido nuevo o editado desde caja
      if (pedido.estado === 'en_espera') beep()
      setPedidos(prev => {
        const existe = prev.some(p => p.id === pedido.id)
        if (existe) return prev.map(p => p.id === pedido.id ? pedido : p)
        return [pedido, ...prev] // llegó por primera vez (en_espera)
      })
    })

    channel.bind('caja-cerrada', () => {
      setPedidos([])
    })

    return () => {
      vigente = false
      channel.unbind_all()
      // `disconnect` da de baja el canal y cierra el socket. Sin esto, cada
      // cambio de local dejaba un WebSocket abierto para siempre: en una
      // tablet que no se recarga nunca, se iban sumando toda la noche.
      pusher.disconnect()
    }
  }, [local])

  // El cambio se pinta recién cuando el servidor confirma. Antes se pintaba
  // igual: si el PATCH fallaba, la comanda se veía "LISTO" en la tablet y en la
  // base seguía en preparación, y nadie se enteraba hasta recargar.
  async function cambiarEstado(id: number, estado: string) {
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      })
      if (!res.ok) throw new Error(`PATCH ${res.status}`)
      setPedidos(prev => prev.map(p => (p.id === id ? { ...p, estado } : p)))
      setError(null)
    } catch (err) {
      console.error('[cocina] no se pudo cambiar el estado del pedido', id, err)
      setError(`No se pudo actualizar el pedido #${id}. Revisá la conexión y probá de nuevo.`)
    }
  }

  async function borrarPedido(id: number) {
    try {
      const res = await fetch(`/api/pedidos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`DELETE ${res.status}`)
      setPedidos(prev => prev.map(p => (p.id === id ? { ...p, estado: 'eliminado' } : p)))
      setError(null)
    } catch (err) {
      console.error('[cocina] no se pudo eliminar el pedido', id, err)
      setError(`No se pudo eliminar el pedido #${id}. Revisá la conexión y probá de nuevo.`)
    } finally {
      setConfirmandoBorrar(null)
    }
  }

  const activos  = pedidos.filter(p => p.estado !== 'entregado' && p.estado !== 'eliminado')
  const historial = pedidos.filter(p => p.estado === 'entregado' || p.estado === 'eliminado')

  const tarjeta = (pedido: Pedido, enHistorial = false) => {
    const proximo = PROXIMO[pedido.estado]
    const previo  = PREVIO[pedido.estado]
    return (
      <div
        key={pedido.id}
        className={`bg-zinc-900 rounded-lg ${LEFT_BORDER[pedido.estado]} p-4 flex flex-col gap-3 ${enHistorial ? 'opacity-60' : ''}`}
      >
        {/* Encabezado */}
        <div className="flex justify-between items-start">
          <div className="flex items-baseline gap-2">
            <span className="text-red-500 font-black text-xl leading-none">#{pedido.id}</span>
            <span className="font-bold text-white uppercase tracking-wide text-sm">{pedido.cliente}</span>
          </div>
          <span className="text-xs text-zinc-500 tabular-nums">
            {new Date(pedido.creadoEn).toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Badge estado */}
        <span className={`self-start text-[10px] font-black px-2 py-0.5 rounded tracking-widest ${ESTADO_COLOR[pedido.estado]}`}>
          {ESTADO_LABEL[pedido.estado]}
        </span>

        {/* Modalidad */}
        <p className="text-xs text-zinc-400 uppercase tracking-wide">
          {pedido.modalidad === 'llevar'
            ? `🛵 Para llevar — ${pedido.direccion}`
            : pedido.modalidad === 'retirar'
            ? '🏃 Retiro en el local'
            : '🪑 En el local'}
        </p>

        {/* Separador */}
        <div className="border-t border-zinc-800" />

        {/* Items */}
        <ul className="space-y-1.5">
          {(pedido.items as unknown as ItemPedido[]).map((item, i) => (
            <li key={i} className="text-sm">
              <span className="font-bold text-white">{item.cantidad}×</span>
              <span className="ml-1 text-zinc-200 uppercase text-xs tracking-wide font-semibold">{item.nombre}</span>
              {item.variante && (
                <span className="text-zinc-500 text-xs"> ({item.variante})</span>
              )}
              {item.aclaracion && (
                <p className="text-amber-400 text-xs mt-0.5 ml-3">↳ {item.aclaracion}</p>
              )}
            </li>
          ))}
        </ul>

        {/* Acciones */}
        {(!enHistorial || previo) && (
          <div className="flex gap-2 pt-1">
            {previo && (
              <button
                onClick={() => cambiarEstado(pedido.id, previo.estado)}
                className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition"
                title="Volver al estado anterior"
              >
                {previo.label}
              </button>
            )}
            {/* Cuando está listo, mostrar botón cobrado deshabilitado (espera a caja) */}
            {!enHistorial && pedido.estado === 'listo' && (
              <button
                disabled
                className="flex-1 text-xs font-black uppercase tracking-wider px-4 py-2 rounded bg-zinc-700 text-zinc-500 cursor-not-allowed"
              >
                Cobrado
              </button>
            )}
            {!enHistorial && proximo && (
              <button
                onClick={() => cambiarEstado(pedido.id, proximo.estado)}
                className={`flex-1 text-xs font-black uppercase tracking-wider px-4 py-2 rounded transition ${proximo.clase}`}
              >
                {proximo.label}
              </button>
            )}

            {!enHistorial && (confirmandoBorrar === pedido.id ? (
              <div className="flex gap-2 flex-1">
                <button
                  onClick={() => borrarPedido(pedido.id)}
                  className="flex-1 text-xs font-black uppercase px-3 py-2 rounded bg-red-700 hover:bg-red-600 text-white transition"
                >
                  Borrar
                </button>
                <button
                  onClick={() => setConfirmandoBorrar(null)}
                  className="flex-1 text-xs font-black uppercase px-3 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white transition"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmandoBorrar(pedido.id)}
                className="text-sm px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-white transition"
                title="Borrar pedido"
              >
                🗑️
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="bg-black">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Dolka Star" className="h-10 w-auto" />
            <span className="font-black text-white uppercase tracking-widest text-lg">Cocina</span>
          </div>
          <select
            value={local}
            onChange={e => setLocal(e.target.value as 'andalgala' | 'belen')}
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white"
          >
            <option value="andalgala">Andalgalá</option>
            <option value="belen">Belén</option>
          </select>
        </div>
        <div
          className="h-4 w-full"
          style={{
            backgroundColor: '#dc2626',
            backgroundImage:
              'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%), linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 8px 8px',
          }}
        />
      </header>

      <main className="p-4 max-w-7xl mx-auto">
        {error && (
          <div
            role="alert"
            className="mt-2 mb-4 flex items-center justify-between gap-3 rounded bg-red-950 border border-red-600 px-4 py-3"
          >
            <span className="text-sm font-bold text-red-200">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-xs font-black uppercase tracking-wider text-red-300 hover:text-white transition"
            >
              Cerrar
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 mb-5 mt-2">
          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
            Pedidos activos
          </span>
          <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-full">
            {activos.length}
          </span>
        </div>

        {activos.length === 0 && (
          <p className="text-zinc-600 text-center mt-20 text-sm font-bold uppercase tracking-widest">
            Sin pedidos activos
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activos.map(p => tarjeta(p, false))}
        </div>

        <div className="mt-10">
          <button
            onClick={() => setVerHistorial(v => !v)}
            className="flex items-center gap-2 mb-4 group"
          >
            <span className="text-zinc-600 group-hover:text-zinc-400 transition text-xs">{verHistorial ? '▲' : '▼'}</span>
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition">
              Historial
            </span>
            <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {historial.length}
            </span>
          </button>

          {verHistorial && (
            historial.length === 0 ? (
              <p className="text-zinc-700 text-xs font-bold uppercase tracking-widest">Sin registros</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {historial.map(p => tarjeta(p, true))}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  )
}