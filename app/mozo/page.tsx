'use client'

import { useEffect, useState } from 'react'
import Pusher from 'pusher-js'
import { menu, MenuItem, MenuCategoria } from '@/data/menu'
import PinGate from '@/components/PinGate'

// ─────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────

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
  telefono?: string
  modalidad: string
  direccion?: string
  items: ItemPedido[]
  total: number
  metodoPago: string
  estado: string
  creadoEn: string
  local: string
}

interface ItemForm {
  nombre: string
  variante: string
  cantidad: number
  precio: string
  aclaracion: string
}

// ─────────────────────────────────────────
// CARTA — vinculada a data/menu.ts
// ─────────────────────────────────────────

const EMOJI_POR_CAT: Record<string, string> = {
  hamburguesas:       '🍔',
  pizzas:             '🍕',
  lomos:              '🥩',
  milanesas:          '🍖',
  'milanesas-al-plato': '🍽️',
  empanadas:          '🫔',
  'papas-nuggets':    '🍟',
  picadas:            '🧀',
  pastas:             '🍝',
  saludables:         '🥗',
  bebidas:            '🥤',
}

// Etiqueta corta para las pestañas (la label completa puede ser muy larga)
const LABEL_CORTO: Record<string, string> = {
  hamburguesas:         'Hamburgue.',
  pizzas:               'Pizzas',
  lomos:                'Lomos',
  milanesas:            'Mila Sangú',
  'milanesas-al-plato': 'Mila Plato',
  empanadas:            'Empanadas',
  'papas-nuggets':      'Papas',
  picadas:              'Picada',
  pastas:               'Pastas',
  saludables:           'Saludables',
  bebidas:              'Bebidas',
}

// Categorías visibles por local (en orden)
const CAT_IDS_POR_LOCAL: Record<string, string[]> = {
  andalgala: [
    'hamburguesas', 'pizzas', 'lomos', 'milanesas', 'milanesas-al-plato',
    'empanadas', 'papas-nuggets', 'picadas', 'pastas', 'saludables', 'bebidas',
  ],
  belen: [
    'hamburguesas', 'lomos', 'milanesas', 'milanesas-al-plato',
    'papas-nuggets', 'bebidas',
  ],
}

function cartaParaLocal(local: string): MenuCategoria[] {
  const ids = CAT_IDS_POR_LOCAL[local] ?? CAT_IDS_POR_LOCAL.andalgala
  return ids
    .map(id => menu.find(c => c.id === id))
    .filter((c): c is MenuCategoria => c != null)
}

/** Convierte MenuItem.precios en array de variantes { nombre, precio } */
function variantesDeItem(item: MenuItem): { nombre: string; precio: number }[] {
  if (!item.precios) return []
  const vs: { nombre: string; precio: number }[] = [
    { nombre: 'Simple', precio: item.precios.simple },
  ]
  if (item.precios.doble  != null) vs.push({ nombre: 'Doble',  precio: item.precios.doble })
  if (item.precios.triple != null) vs.push({ nombre: 'Triple', precio: item.precios.triple })
  return vs
}

// ─────────────────────────────────────────
// CONSTANTES DE ESTADOS / ESTILOS
// ─────────────────────────────────────────

const ESTADO_LABEL: Record<string, string> = {
  pendiente:      'PENDIENTE',
  en_espera:      'EN COCINA',
  en_preparacion: 'EN PREPARACIÓN',
  listo:          'LISTO ✅',
  cobrado:        'COBRADO ✓',
  entregado:      'ENTREGADO',
  eliminado:      'ELIMINADO',
}

const ESTADO_COLOR: Record<string, string> = {
  pendiente:      'bg-red-700 text-white',
  en_espera:      'bg-red-700 text-white',
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

function formatearPrecio(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

function tiempoTranscurrido(creadoEn: string): string {
  const diff = Math.floor((Date.now() - new Date(creadoEn).getTime()) / 1000 / 60)
  if (diff < 1) return 'ahora'
  return `${diff} min`
}

function claseTimer(creadoEn: string): string {
  const diff = Math.floor((Date.now() - new Date(creadoEn).getTime()) / 1000 / 60)
  if (diff >= 30) return 'text-red-400 font-black'
  if (diff >= 15) return 'text-amber-400 font-bold'
  return 'text-zinc-500'
}

const ITEM_VACIO: ItemForm = { nombre: '', variante: '', cantidad: 1, precio: '', aclaracion: '' }

// ─────────────────────────────────────────
// ALERTA SONORA (Web Audio API)
// ─────────────────────────────────────────

function beep() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    // Dos tonos ascendentes: A5 → C#6  (suena como "ding-dong")
    const notas = [880, 1108]
    notas.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.2
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.4, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
      osc.start(t)
      osc.stop(t + 0.22)
    })
  } catch {
    // navegador sin soporte o política de autoplay bloqueada
  }
}

// ─────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────

export default function MozoPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [local, setLocal] = useState<'andalgala' | 'belen'>('andalgala')
  const [vista, setVista] = useState<'servicio' | 'delivery'>('servicio')
  const [formAbierto, setFormAbierto] = useState(false)
  const [, setTick] = useState(0)

  // ── Form: datos del pedido ──
  const [cliente, setCliente] = useState('')
  const [telefono, setTelefono] = useState('')
  const [modalidad, setModalidad] = useState<'local' | 'retirar' | 'llevar'>('local')
  const [direccion, setDireccion] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'tarjeta'>('efectivo')

  // ── Form: items ──
  const [items, setItems] = useState<ItemForm[]>([])

  // ── Form: carta picker ──
  const [modoPicker, setModoPicker] = useState<'carta' | 'manual'>('carta')
  const [categoriaActiva, setCategoriaActiva] = useState(0)
  const [variantePendiente, setVariantePendiente] = useState<MenuItem | null>(null)

  // Carta activa según el local seleccionado (derivada de data/menu.ts)
  const carta = cartaParaLocal(local)

  // ── Form: manual item ──
  const [itemManual, setItemManual] = useState<ItemForm>({ ...ITEM_VACIO })

  // ── Form: delivery ──
  const [costoEnvio, setCostoEnvio] = useState('')

  // ── Form: estado ──
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [marcando, setMarcando] = useState<Set<number>>(new Set())
  const [busqueda, setBusqueda] = useState('')
  const [notaRapida, setNotaRapida] = useState<{ item: MenuItem; nota: string } | null>(null)

  // ── Pusher + fetch ──
  useEffect(() => {
    fetch(`/api/pedidos?local=${local}`)
      .then(r => r.json())
      .then(setPedidos)

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    const channel = pusher.subscribe(`cocina-${local}`)
    channel.bind('nuevo-pedido', (pedido: Pedido) => {
      setPedidos(prev =>
        prev.some(p => p.id === pedido.id) ? prev : [pedido, ...prev]
      )
    })
    channel.bind('pedido-actualizado', (pedido: Pedido) => {
      setPedidos(prev => {
        // Alerta sonora cuando un pedido pasa a "listo" por primera vez
        if (pedido.estado === 'listo' && !prev.some(p => p.id === pedido.id && p.estado === 'listo')) {
          beep()
        }
        const existe = prev.some(p => p.id === pedido.id)
        if (existe) return prev.map(p => p.id === pedido.id ? { ...p, ...pedido } : p)
        return [pedido, ...prev]
      })
    })
    channel.bind('caja-cerrada', () => {
      setPedidos([])
    })
    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`cocina-${local}`)
    }
  }, [local])

  // Tick cada minuto para actualizar timers
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // C. Título del browser con contador de pedidos listos
  useEffect(() => {
    const listos = pedidos.filter(p =>
      p.estado === 'listo' && (p.modalidad === 'local' || p.modalidad === 'retirar')
    ).length
    document.title = listos > 0 ? `(${listos}) Mozo — Dolka Star` : 'Mozo — Dolka Star'
  }, [pedidos])

  // ── Acciones sobre pedidos ──

  async function marcarEntregado(id: number) {
    if (marcando.has(id)) return
    setMarcando(prev => new Set(prev).add(id))
    try {
      await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'entregado' }),
      })
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: 'entregado' } : p))
    } finally {
      setMarcando(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  // ── Reset form ──

  function resetForm() {
    setCliente('')
    setTelefono('')
    setModalidad('local')
    setDireccion('')
    setMetodoPago('efectivo')
    setItems([])
    setModoPicker('carta')
    setCategoriaActiva(0)
    setVariantePendiente(null)
    setNotaRapida(null)
    setBusqueda('')
    setItemManual({ ...ITEM_VACIO })
    setCostoEnvio('')
    setEnviado(false)
    setErrorEnvio(null)
  }

  function cerrarForm(force = false) {
    if (!force && items.length > 0) {
      if (!confirm('¿Cancelar el pedido en curso? Se van a perder los productos cargados.')) return
    }
    resetForm()
    setFormAbierto(false)
  }

  // ── Lógica de items ──

  function quitarItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function cambiarCantidadItem(i: number, delta: number) {
    setItems(prev => {
      const nueva = prev[i].cantidad + delta
      if (nueva <= 0) return prev.filter((_, idx) => idx !== i)
      return prev.map((it, idx) => idx === i ? { ...it, cantidad: nueva } : it)
    })
  }

  function actualizarAclaracion(i: number, valor: string) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, aclaracion: valor } : it))
  }

  // ── Carta picker ──

  function agregarDesdeCarta(item: MenuItem, variante?: { nombre: string; precio: number }, nota = '') {
    const vNombre = variante?.nombre ?? ''
    const precio  = variante?.precio ?? item.precio ?? 0
    const idx = items.findIndex(it => it.nombre === item.nombre && it.variante === vNombre)
    if (idx >= 0) {
      setItems(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: it.cantidad + 1 } : it))
    } else {
      setItems(prev => [...prev, {
        nombre:     item.nombre,
        variante:   vNombre,
        cantidad:   1,
        precio:     String(precio),
        aclaracion: nota,
      }])
    }
    setVariantePendiente(null)
    setNotaRapida(null)
  }

  // ── Manual picker ──

  function agregarManual() {
    if (!itemManual.nombre.trim()) return
    setItems(prev => [...prev, { ...itemManual }])
    setItemManual({ ...ITEM_VACIO })
  }

  // ── Totales ──

  const costoEnvioNum = modalidad === 'llevar' ? (parseFloat(costoEnvio) || 0) : 0
  const subtotalItems = items.reduce((s, it) => s + it.cantidad * (parseFloat(it.precio) || 0), 0)
  const totalForm = subtotalItems + costoEnvioNum

  const puedeEnviar =
    cliente.trim().length > 0 &&
    items.some(it => it.nombre.trim().length > 0) &&
    subtotalItems > 0 &&
    (modalidad !== 'llevar' || direccion.trim().length > 0)

  // ── Enviar pedido ──

  async function enviarPedido() {
    if (!puedeEnviar || enviando) return
    setEnviando(true)
    setErrorEnvio(null)
    try {
      const itemsPayload = items
        .filter(it => it.nombre.trim())
        .map(it => ({
          nombre:     it.nombre.trim(),
          variante:   it.variante.trim() || undefined,
          cantidad:   it.cantidad,
          precio:     parseFloat(it.precio) || 0,
          aclaracion: it.aclaracion.trim() || undefined,
        }))

      // Agregar costo de envío como ítem separado si es delivery
      if (modalidad === 'llevar' && costoEnvioNum > 0) {
        itemsPayload.push({
          nombre:     'Costo de envío',
          variante:   undefined,
          cantidad:   1,
          precio:     costoEnvioNum,
          aclaracion: undefined,
        })
      }

      const payload = {
        cliente:    cliente.trim(),
        telefono:   telefono.trim() || undefined,
        modalidad,
        direccion:  modalidad === 'llevar' ? direccion.trim() : undefined,
        metodoPago,
        total:      totalForm,
        local,
        items:      itemsPayload,
      }

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`Error al crear pedido (${res.status})`)
      const pedido = await res.json()

      // Mandar a la cola de cocina (en_espera)
      const res2 = await fetch(`/api/pedidos/${pedido.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'en_espera' }),
      })
      if (!res2.ok) throw new Error(`Pedido creado (#${pedido.id}) pero no llegó a cocina. Avisá a caja.`)

      setEnviado(true)
      setTimeout(() => cerrarForm(true), 1800)
    } catch (err) {
      setErrorEnvio(err instanceof Error ? err.message : 'Error desconocido. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  // ─────────────────────────────────────────
  // FILTROS DE VISTA
  // ─────────────────────────────────────────

  const listosMesa = pedidos.filter(p =>
    p.estado === 'listo' && (p.modalidad === 'local' || p.modalidad === 'retirar')
  )
  const enPreparacionMesa = pedidos.filter(p =>
    ['en_espera', 'en_preparacion'].includes(p.estado) &&
    (p.modalidad === 'local' || p.modalidad === 'retirar')
  )
  const deliveryParaEntregar = pedidos.filter(p =>
    p.modalidad === 'llevar' && p.estado === 'cobrado'
  )
  const deliveryEnCurso = pedidos.filter(p =>
    p.modalidad === 'llevar' && ['en_espera', 'en_preparacion', 'listo'].includes(p.estado)
  )

  // ─────────────────────────────────────────
  // CARDS DE PEDIDOS
  // ─────────────────────────────────────────

  const cardMesa = (pedido: Pedido, conBoton: boolean) => (
    <div
      key={pedido.id}
      className={`bg-zinc-900 rounded-lg ${LEFT_BORDER[pedido.estado]} p-4 flex flex-col gap-3 ${!conBoton ? 'opacity-55' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-baseline gap-2">
          <span className="text-red-500 font-black text-xl leading-none">#{pedido.id}</span>
          <span className="font-bold text-white uppercase tracking-wide text-sm">{pedido.cliente}</span>
        </div>
        <span className={`text-xs tabular-nums ${claseTimer(pedido.creadoEn)}`}>
          ⏱ {tiempoTranscurrido(pedido.creadoEn)}
        </span>
      </div>

      <span className={`self-start text-[10px] font-black px-2 py-0.5 rounded tracking-widest ${ESTADO_COLOR[pedido.estado]}`}>
        {ESTADO_LABEL[pedido.estado]}
      </span>

      <p className="text-xs text-zinc-400 uppercase tracking-wide">
        {pedido.modalidad === 'retirar' ? '🏃 Retiro en el local' : '🪑 En el local'}
      </p>

      <div className="border-t border-zinc-800" />

      <ul className="space-y-1">
        {(pedido.items as unknown as ItemPedido[]).map((item, i) => (
          <li key={i} className="text-sm">
            <span className="font-bold text-white">{item.cantidad}×</span>
            <span className="ml-1 text-zinc-200 uppercase text-xs font-semibold">{item.nombre}</span>
            {item.variante && <span className="text-zinc-500 text-xs"> ({item.variante})</span>}
            {item.aclaracion && <p className="text-amber-400 text-xs mt-0.5 ml-3">↳ {item.aclaracion}</p>}
          </li>
        ))}
      </ul>

      {conBoton && (
        <button
          onClick={() => marcarEntregado(pedido.id)}
          disabled={marcando.has(pedido.id)}
          className={`w-full text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded text-white transition ${
            marcando.has(pedido.id)
              ? 'bg-green-800 opacity-60 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-500'
          }`}
        >
          {marcando.has(pedido.id) ? '…' : '✓ SERVIDO'}
        </button>
      )}
    </div>
  )

  const cardDelivery = (pedido: Pedido) => (
    <div
      key={pedido.id}
      className={`bg-zinc-900 rounded-lg ${LEFT_BORDER[pedido.estado]} p-4 flex flex-col gap-3 ${pedido.estado !== 'cobrado' ? 'opacity-65' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-baseline gap-2">
          <span className="text-red-500 font-black text-xl leading-none">#{pedido.id}</span>
          <span className="font-bold text-white uppercase tracking-wide text-sm">{pedido.cliente}</span>
        </div>
        <span className={`text-xs tabular-nums ${claseTimer(pedido.creadoEn)}`}>
          ⏱ {tiempoTranscurrido(pedido.creadoEn)}
        </span>
      </div>

      <span className={`self-start text-[10px] font-black px-2 py-0.5 rounded tracking-widest ${ESTADO_COLOR[pedido.estado]}`}>
        {ESTADO_LABEL[pedido.estado]}
      </span>

      {pedido.direccion && (
        <div className="bg-zinc-800 rounded-lg px-3 py-2.5 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">📍 Dirección</p>
          <p className="text-white font-semibold text-sm">{pedido.direccion}</p>
          {pedido.telefono && (
            <a href={`tel:${pedido.telefono}`} className="text-blue-400 text-xs hover:underline block">
              📞 {pedido.telefono}
            </a>
          )}
        </div>
      )}

      <div className="border-t border-zinc-800" />

      <ul className="space-y-1">
        {(pedido.items as unknown as ItemPedido[]).map((item, i) => (
          <li key={i} className="text-sm">
            <span className="font-bold text-white">{item.cantidad}×</span>
            <span className="ml-1 text-zinc-200 uppercase text-xs font-semibold">{item.nombre}</span>
            {item.variante && <span className="text-zinc-500 text-xs"> ({item.variante})</span>}
            {item.aclaracion && <p className="text-amber-400 text-xs mt-0.5 ml-3">↳ {item.aclaracion}</p>}
          </li>
        ))}
      </ul>

      <div className="flex justify-between items-center border-t border-zinc-800 pt-2">
        <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Total</span>
        <span className="font-black text-white text-lg">{formatearPrecio(pedido.total)}</span>
      </div>

      {pedido.estado === 'cobrado' && (
        <button
          onClick={() => marcarEntregado(pedido.id)}
          disabled={marcando.has(pedido.id)}
          className={`w-full text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded text-white transition ${
            marcando.has(pedido.id)
              ? 'bg-red-900 opacity-60 cursor-not-allowed'
              : 'bg-red-700 hover:bg-red-600'
          }`}
        >
          {marcando.has(pedido.id) ? '…' : '🛵 MARCAR ENTREGADO'}
        </button>
      )}
    </div>
  )

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────

  return (
    <PinGate role="Mozo" pin="mozo2026">
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="bg-black">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Dolka Star" className="h-10 w-auto" />
            <span className="font-black text-white uppercase tracking-widest text-lg">Mozo</span>
          </div>
          <select
            value={local}
            onChange={e => { setLocal(e.target.value as 'andalgala' | 'belen'); setCategoriaActiva(0); setVariantePendiente(null) }}
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
        {/* Botón nuevo pedido */}
        <button
          onClick={() => setFormAbierto(true)}
          className="w-full mb-5 mt-2 py-3 rounded-lg bg-red-700 hover:bg-red-600 text-white font-black uppercase tracking-widest text-sm transition flex items-center justify-center gap-2"
        >
          <span className="text-lg leading-none">+</span> NUEVO PEDIDO
        </button>

        {/* Tabs de vista */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setVista('servicio')}
            className={`flex-1 py-2.5 rounded text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2 ${
              vista === 'servicio' ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            🪑 Servicio
            {listosMesa.length > 0 && (
              <span className="bg-green-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {listosMesa.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setVista('delivery')}
            className={`flex-1 py-2.5 rounded text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2 ${
              vista === 'delivery' ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            🛵 Delivery
            {deliveryParaEntregar.length > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {deliveryParaEntregar.length}
              </span>
            )}
          </button>
        </div>

        {/* Vista: Servicio en mesa */}
        {vista === 'servicio' && (
          <>
            {listosMesa.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-widest text-green-500">Listos para servir</span>
                  <span className="bg-green-600 text-white text-xs font-black px-2 py-0.5 rounded-full">{listosMesa.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {listosMesa.map(p => cardMesa(p, true))}
                </div>
              </section>
            )}

            {enPreparacionMesa.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Preparando</span>
                  <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-2 py-0.5 rounded-full">{enPreparacionMesa.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {enPreparacionMesa.map(p => cardMesa(p, false))}
                </div>
              </section>
            )}

            {listosMesa.length === 0 && enPreparacionMesa.length === 0 && (
              <p className="text-zinc-600 text-center mt-20 text-sm font-bold uppercase tracking-widest">
                Sin pedidos activos en mesa
              </p>
            )}
          </>
        )}

        {/* Vista: Delivery */}
        {vista === 'delivery' && (
          <>
            {deliveryParaEntregar.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-widest text-red-500">Para entregar ahora</span>
                  <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-full">{deliveryParaEntregar.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {deliveryParaEntregar.map(p => cardDelivery(p))}
                </div>
              </section>
            )}

            {deliveryEnCurso.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Preparando</span>
                  <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-2 py-0.5 rounded-full">{deliveryEnCurso.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {deliveryEnCurso.map(p => cardDelivery(p))}
                </div>
              </section>
            )}

            {deliveryParaEntregar.length === 0 && deliveryEnCurso.length === 0 && (
              <p className="text-zinc-600 text-center mt-20 text-sm font-bold uppercase tracking-widest">
                Sin pedidos de delivery
              </p>
            )}
          </>
        )}
      </main>

      {/* ───────────── MODAL: Nuevo pedido ───────────── */}
      {formAbierto && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-zinc-900 w-full md:max-w-lg md:rounded-xl max-h-[96vh] flex flex-col shadow-2xl">

            {/* Header del modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
              <span className="font-black text-white uppercase tracking-widest text-sm">Nuevo pedido</span>
              <button
                onClick={() => cerrarForm()}
                className="text-zinc-500 hover:text-white transition text-xl leading-none w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Confirmación enviado */}
            {enviado ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-16">
                  <p className="text-6xl mb-4">✅</p>
                  <p className="text-white font-black uppercase tracking-widest text-lg">Pedido enviado</p>
                  <p className="text-zinc-400 text-sm mt-2">Ya aparece en caja y cocina</p>
                </div>
              </div>
            ) : (
              <>
                {/* ── Contenido del formulario (scrollable) ── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                  {/* Nombre / Mesa */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
                      Nombre / Mesa *
                    </label>
                    <input
                      value={cliente}
                      onChange={e => setCliente(e.target.value)}
                      placeholder='Ej: "Mesa 4" o "Carlos"'
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-red-600 transition"
                    />
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
                      Teléfono (opcional)
                    </label>
                    <input
                      value={telefono}
                      onChange={e => setTelefono(e.target.value)}
                      placeholder="11 1234-5678"
                      type="tel"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-red-600 transition"
                    />
                  </div>

                  {/* Modalidad */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
                      Modalidad *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { val: 'local',   label: '🪑 Mesa' },
                        { val: 'retirar', label: '🏃 Retiro' },
                        { val: 'llevar',  label: '🛵 Delivery' },
                      ] as const).map(({ val, label }) => (
                        <button
                          key={val}
                          onClick={() => setModalidad(val)}
                          className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                            modalidad === val
                              ? 'bg-red-700 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dirección (solo delivery) */}
                  {modalidad === 'llevar' && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
                        Dirección *
                      </label>
                      <input
                        value={direccion}
                        onChange={e => setDireccion(e.target.value)}
                        placeholder="Av. Siempre Viva 742"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-red-600 transition"
                      />
                    </div>
                  )}

                  {/* Método de pago */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">
                      Método de pago *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { val: 'efectivo',      label: '💵 Efect.' },
                        { val: 'transferencia', label: '📲 Transf.' },
                        { val: 'tarjeta',       label: '💳 Tarjeta' },
                      ] as const).map(({ val, label }) => (
                        <button
                          key={val}
                          onClick={() => setMetodoPago(val)}
                          className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                            metodoPago === val
                              ? 'bg-red-700 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── PRODUCTOS ── */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Productos *
                      </label>
                      {/* Modo tabs: Carta / Manual */}
                      <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5">
                        <button
                          onClick={() => { setModoPicker('carta'); setVariantePendiente(null) }}
                          className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition ${
                            modoPicker === 'carta' ? 'bg-red-700 text-white' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          📋 Carta
                        </button>
                        <button
                          onClick={() => { setModoPicker('manual'); setVariantePendiente(null) }}
                          className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition ${
                            modoPicker === 'manual' ? 'bg-red-700 text-white' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          ✏️ Manual
                        </button>
                      </div>
                    </div>

                    {/* ── MODO CARTA ── */}
                    {modoPicker === 'carta' && (
                      <div className="space-y-3">

                        {/* B. Búsqueda */}
                        <input
                          value={busqueda}
                          onChange={e => {
                            setBusqueda(e.target.value)
                            setVariantePendiente(null)
                            setNotaRapida(null)
                          }}
                          placeholder="🔍 Buscar producto…"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-red-600 transition"
                        />

                        {/* Category tabs — ocultas durante búsqueda */}
                        {!busqueda.trim() && (
                          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
                            {carta.map((cat, i) => (
                              <button
                                key={cat.id}
                                onClick={() => { setCategoriaActiva(i); setVariantePendiente(null); setNotaRapida(null) }}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                                  categoriaActiva === i
                                    ? 'bg-zinc-700 text-white'
                                    : 'bg-zinc-800 text-zinc-500 hover:text-white'
                                }`}
                              >
                                {EMOJI_POR_CAT[cat.id] ?? '🍽️'} {LABEL_CORTO[cat.id] ?? cat.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Nota de categoría (ej: "precio por docena") — oculta durante búsqueda */}
                        {!busqueda.trim() && carta[categoriaActiva]?.nota && (
                          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                            ⚠️ {carta[categoriaActiva].nota}
                          </p>
                        )}

                        {/* D. Panel de nota rápida (items sin variante) — ARRIBA de la grilla */}
                        {notaRapida && (
                          <div className="bg-zinc-700 rounded-xl p-3">
                            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-2">
                              {notaRapida.item.nombre} — nota para cocina:
                            </p>
                            <div className="flex flex-col gap-2">
                              <input
                                autoFocus
                                value={notaRapida.nota}
                                onChange={e => setNotaRapida(prev => prev ? { ...prev, nota: e.target.value } : null)}
                                placeholder="Sin cebolla, bien cocida… (opcional)"
                                onKeyDown={e => { if (e.key === 'Enter') agregarDesdeCarta(notaRapida.item, undefined, notaRapida.nota) }}
                                className="w-full bg-zinc-600 border-0 rounded-lg px-3 py-2 text-amber-400 text-xs placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => agregarDesdeCarta(notaRapida.item, undefined, notaRapida.nota)}
                                  className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-black rounded-lg transition"
                                >
                                  + Agregar al pedido
                                </button>
                                <button
                                  onClick={() => setNotaRapida(null)}
                                  className="px-3 py-2 bg-zinc-600 text-zinc-300 text-xs rounded-lg transition hover:bg-zinc-500"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Variant picker — ARRIBA de la grilla para que sea visible de inmediato */}
                        {variantePendiente && (
                          <div className="bg-zinc-700 rounded-xl p-3">
                            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-2">
                              {variantePendiente.nombre} — elegí variante:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {variantesDeItem(variantePendiente).map((v, vi) => (
                                <button
                                  key={vi}
                                  onClick={() => agregarDesdeCarta(variantePendiente, v)}
                                  className="flex flex-col items-center px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-black rounded-lg transition"
                                >
                                  <span>{v.nombre}</span>
                                  <span className="text-red-300 font-normal text-[10px]">{formatearPrecio(v.precio)}</span>
                                </button>
                              ))}
                              <button
                                onClick={() => setVariantePendiente(null)}
                                className="px-3 py-2 bg-zinc-600 text-zinc-300 text-xs rounded-lg transition hover:bg-zinc-500"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Product grid — cambia source según búsqueda */}
                        {(() => {
                          const q = busqueda.trim().toLowerCase()
                          const itemsDeGrid = q
                            ? carta.flatMap(cat =>
                                cat.items
                                  .filter(item => item.nombre.toLowerCase().includes(q))
                                  .map(item => ({ item, catId: cat.id }))
                              )
                            : (carta[categoriaActiva]?.items ?? []).map(item => ({ item, catId: carta[categoriaActiva]?.id ?? '' }))

                          if (q && itemsDeGrid.length === 0) {
                            return (
                              <p className="text-zinc-600 text-xs text-center py-4">
                                Sin resultados para &ldquo;{busqueda}&rdquo;
                              </p>
                            )
                          }

                          return (
                            <div className="grid grid-cols-2 gap-2">
                              {itemsDeGrid.map(({ item, catId }, pi) => {
                                const variantes = variantesDeItem(item)
                                const tieneVariantes = variantes.length > 0
                                const precioMin = tieneVariantes ? variantes[0].precio : (item.precio ?? 0)
                                // A. Badge: total de este producto en el pedido actual
                                const cantEnPedido = items
                                  .filter(it => it.nombre === item.nombre)
                                  .reduce((s, it) => s + it.cantidad, 0)
                                const seleccionado =
                                  variantePendiente?.nombre === item.nombre ||
                                  notaRapida?.item.nombre === item.nombre
                                return (
                                  <button
                                    key={pi}
                                    onClick={() => {
                                      if (tieneVariantes) {
                                        setVariantePendiente(seleccionado ? null : item)
                                        setNotaRapida(null)
                                      } else {
                                        // D. Nota rápida para items sin variante
                                        setNotaRapida(seleccionado ? null : { item, nota: '' })
                                        setVariantePendiente(null)
                                      }
                                    }}
                                    className={`relative text-left px-3 py-2.5 rounded-lg transition active:scale-95 ${
                                      seleccionado
                                        ? 'bg-red-900 border border-red-600 text-white'
                                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                                    }`}
                                  >
                                    {/* A. Badge de cantidad */}
                                    {cantEnPedido > 0 && (
                                      <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[9px] font-black min-w-[1rem] h-4 px-0.5 rounded-full flex items-center justify-center leading-none tabular-nums">
                                        {cantEnPedido}
                                      </span>
                                    )}
                                    {/* Categoría (solo en modo búsqueda) */}
                                    {q && (
                                      <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-0.5">
                                        {EMOJI_POR_CAT[catId]} {LABEL_CORTO[catId] ?? catId}
                                      </p>
                                    )}
                                    {item.etiqueta && (
                                      <p className="text-amber-400 text-[9px] font-black uppercase tracking-widest mb-0.5">
                                        ★ {item.etiqueta}
                                      </p>
                                    )}
                                    <p className="font-bold text-xs leading-snug pr-4">{item.nombre}</p>
                                    <p className="text-zinc-400 text-[11px] mt-0.5">
                                      {tieneVariantes ? `desde ${formatearPrecio(precioMin)}` : formatearPrecio(precioMin)}
                                    </p>
                                    {tieneVariantes && (
                                      <p className="text-zinc-600 text-[10px] mt-0.5">▾ elegir variante</p>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })()}

                      </div>
                    )}

                    {/* ── MODO MANUAL ── */}
                    {modoPicker === 'manual' && (
                      <div className="bg-zinc-800 rounded-xl p-3 space-y-2">
                        {/* Nombre */}
                        <input
                          value={itemManual.nombre}
                          onChange={e => setItemManual(prev => ({ ...prev, nombre: e.target.value }))}
                          placeholder="Nombre del producto"
                          className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-red-600"
                        />
                        {/* Cant + Precio */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Cant.</p>
                            <input
                              type="number"
                              min={1}
                              value={itemManual.cantidad}
                              onChange={e => setItemManual(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 1 }))}
                              className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-red-600"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Precio unit.</p>
                            <input
                              type="number"
                              min={0}
                              value={itemManual.precio}
                              onChange={e => setItemManual(prev => ({ ...prev, precio: e.target.value }))}
                              placeholder="0"
                              className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-red-600"
                            />
                          </div>
                        </div>
                        {/* Variante */}
                        <input
                          value={itemManual.variante}
                          onChange={e => setItemManual(prev => ({ ...prev, variante: e.target.value }))}
                          placeholder="Variante (ej: grande, sin cebolla)"
                          className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-red-600"
                        />
                        {/* Nota cocina */}
                        <input
                          value={itemManual.aclaracion}
                          onChange={e => setItemManual(prev => ({ ...prev, aclaracion: e.target.value }))}
                          placeholder="Nota para cocina"
                          className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-amber-400 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          onClick={agregarManual}
                          disabled={!itemManual.nombre.trim()}
                          className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition ${
                            itemManual.nombre.trim()
                              ? 'bg-red-700 hover:bg-red-600 text-white'
                              : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          + Agregar al pedido
                        </button>
                      </div>
                    )}

                    {/* ── LISTA DE ITEMS AGREGADOS ── */}
                    {items.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          Pedido ({items.length} ítem{items.length !== 1 ? 's' : ''})
                        </p>
                        {items.map((item, i) => (
                          <div key={i} className="bg-zinc-800 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                              {/* Nombre + variante */}
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-bold truncate">{item.nombre}</p>
                                {item.variante && (
                                  <p className="text-zinc-500 text-[10px]">{item.variante}</p>
                                )}
                              </div>
                              {/* Stepper cantidad */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => cambiarCantidadItem(i, -1)}
                                  className="w-6 h-6 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-black transition flex items-center justify-center"
                                >
                                  −
                                </button>
                                <span className="text-white text-xs font-black w-4 text-center tabular-nums">
                                  {item.cantidad}
                                </span>
                                <button
                                  onClick={() => cambiarCantidadItem(i, +1)}
                                  className="w-6 h-6 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-black transition flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                              {/* Precio */}
                              <span className="text-zinc-300 text-xs font-bold tabular-nums shrink-0 w-16 text-right">
                                {formatearPrecio(item.cantidad * (parseFloat(item.precio) || 0))}
                              </span>
                              {/* Eliminar */}
                              <button
                                onClick={() => quitarItem(i)}
                                className="text-zinc-600 hover:text-red-500 transition text-xs ml-1 shrink-0"
                              >
                                ✕
                              </button>
                            </div>
                            {/* Nota cocina */}
                            <input
                              value={item.aclaracion}
                              onChange={e => actualizarAclaracion(i, e.target.value)}
                              placeholder="Nota para cocina…"
                              className="mt-2 w-full bg-zinc-700 border-0 rounded-lg px-2.5 py-1.5 text-amber-400 text-[11px] placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {items.length === 0 && modoPicker === 'carta' && (
                      <p className="text-center text-zinc-600 text-xs py-3">
                        Tocá un producto para agregarlo
                      </p>
                    )}
                  </div>

                  {/* ── COSTO DE ENVÍO (solo delivery) ── */}
                  {modalidad === 'llevar' && (
                    <div className="bg-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
                      <span className="text-sm">🛵</span>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 shrink-0">
                        Envío
                      </label>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-zinc-400 text-sm font-bold">$</span>
                        <input
                          type="number"
                          min={0}
                          value={costoEnvio}
                          onChange={e => setCostoEnvio(e.target.value)}
                          placeholder="0"
                          className="w-24 bg-zinc-700 border border-zinc-600 rounded-lg px-2.5 py-1.5 text-white text-sm text-right placeholder:text-zinc-500 focus:outline-none focus:border-red-600 transition"
                        />
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  {totalForm > 0 && (
                    <div className="flex justify-between items-center bg-zinc-800 rounded-xl px-4 py-3">
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Total</span>
                      <span className="font-black text-white text-xl">{formatearPrecio(totalForm)}</span>
                    </div>
                  )}
                </div>

                {/* Footer con botón enviar */}
                <div className="px-5 py-4 border-t border-zinc-800 shrink-0 space-y-2">
                  {errorEnvio && (
                    <div className="bg-red-950 border border-red-700 rounded-lg px-3 py-2.5 flex items-start gap-2">
                      <span className="text-red-400 text-sm shrink-0">⚠️</span>
                      <p className="text-red-300 text-xs leading-snug">{errorEnvio}</p>
                    </div>
                  )}
                  <button
                    onClick={enviarPedido}
                    disabled={!puedeEnviar || enviando}
                    className={`w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition ${
                      puedeEnviar && !enviando
                        ? 'bg-red-700 hover:bg-red-600 text-white'
                        : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    {enviando ? 'Enviando…' : '🍳 ENVIAR A COCINA'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </PinGate>
  )
}