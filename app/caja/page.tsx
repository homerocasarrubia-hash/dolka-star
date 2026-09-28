'use client'

import { useEffect, useState } from 'react'
import Pusher from 'pusher-js'
import { categorias } from '@/data/menu'
import type { MenuItem } from '@/data/menu'
import PinGate from '@/components/PinGate'

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

const METODO_LABEL: Record<string, { texto: string; icono: string; clase: string }> = {
  efectivo:      { texto: 'Efectivo',      icono: '💵', clase: 'bg-emerald-700 text-white' },
  transferencia: { texto: 'Transferencia', icono: '📲', clase: 'bg-blue-700 text-white' },
  tarjeta:       { texto: 'Tarjeta',       icono: '💳', clase: 'bg-violet-700 text-white' },
}

const MODALIDAD_LABEL: Record<string, string> = {
  local:   'En el local',
  retirar: 'Retiro en el local',
  llevar:  'A domicilio',
}

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
  en_espera:      'bg-zinc-600 text-zinc-200',
  en_preparacion: 'bg-amber-400 text-black',
  listo:          'bg-green-600 text-white',
  cobrado:        'bg-teal-600 text-white',
  entregado:      'bg-zinc-600 text-white',
  eliminado:      'bg-zinc-800 text-zinc-400',
}

function formatearPrecio(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

// ─────────────────────────────────────────
// Armar mensaje de WhatsApp para el cliente
// ─────────────────────────────────────────

function armarMensajeCliente(pedido: Pedido, costoEnvio: number, descuento: number): string {
  const items = (pedido.items as unknown as ItemPedido[])
    .map((it) => {
      let linea = `${it.cantidad}× ${it.nombre}`
      if (it.variante) linea += ` (${it.variante})`
      linea += ` — ${formatearPrecio(it.precio * it.cantidad)}`
      if (it.aclaracion) linea += `\n  ↳ ${it.aclaracion}`
      return linea
    })
    .join('\n')

  const modalidad = MODALIDAD_LABEL[pedido.modalidad] ?? pedido.modalidad
  const entrega = pedido.modalidad === 'llevar' && pedido.direccion
    ? `\nDirección: ${pedido.direccion}`
    : ''

  const lineaEnvio = pedido.modalidad === 'llevar' && costoEnvio > 0
    ? `\n🛵 Costo de envío: ${formatearPrecio(costoEnvio)}`
    : ''

  const lineaDescuento = descuento > 0
    ? `\n🎁 Descuento: -${formatearPrecio(descuento)}`
    : ''

  const totalFinal = Math.max(0, pedido.total + costoEnvio - descuento)

  let pago = `Pago: ${METODO_LABEL[pedido.metodoPago]?.texto ?? pedido.metodoPago}`
  if (pedido.metodoPago === 'transferencia') {
    pago += '\nAlias: *dolka2026*'
  }

  return (
    `Hola ${pedido.cliente}! Tu pedido en Dolka Star ya está en marcha.\n` +
    items +
    `\n${modalidad}${entrega}${lineaEnvio}${lineaDescuento}\n` +
    `TOTAL: ${formatearPrecio(totalFinal)}\n` +
    `${pago}\n` +
    `Gracias por elegirnos!`
  )
}

function linkWhatsApp(telefono: string, mensaje: string): string {
  const digits = telefono.replace(/\D/g, '')
  const numero = digits.startsWith('54') ? digits : `54${digits}`
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}

// ─────────────────────────────────────────
// Exportar CSV al cerrar la caja
// ─────────────────────────────────────────

function exportarCSV(pedidos: Pedido[], local: string, sesionInicio: string) {
  const SEP = ';'
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`
  const row = (...celdas: string[]) => celdas.map(q).join(SEP)

  const cobrados = pedidos.filter(p => p.estado === 'cobrado' || p.estado === 'entregado')
  const totalEfectivo      = cobrados.filter(p => p.metodoPago === 'efectivo').reduce((s, p) => s + p.total, 0)
  const totalTransferencia = cobrados.filter(p => p.metodoPago === 'transferencia').reduce((s, p) => s + p.total, 0)
  const totalTarjeta       = cobrados.filter(p => p.metodoPago === 'tarjeta').reduce((s, p) => s + p.total, 0)
  const granTotal = totalEfectivo + totalTransferencia + totalTarjeta

  const fechaInicio = new Date(sesionInicio)
  const dd   = String(fechaInicio.getDate()).padStart(2, '0')
  const mm   = String(fechaInicio.getMonth() + 1).padStart(2, '0')
  const yyyy = fechaInicio.getFullYear()
  const fechaLabel = `${dd}/${mm}/${yyyy}`
  const localLabel = local === 'andalgala' ? 'Andalgalá' : 'Belén'

  const lineas: string[] = [
    row('DOLKA STAR', '', '', '', '', '', '', '', ''),
    row(`Cierre de Caja — ${localLabel}`, '', '', '', '', '', '', '', ''),
    row(fechaLabel, '', '', '', '', '', '', '', ''),
    row('', '', '', '', '', '', '', '', ''),
    row('#', 'Hora', 'Cliente', 'Modalidad', 'Dirección', 'Productos', 'Total', 'Método de pago', 'Estado'),
  ]

  for (const p of pedidos) {
    const hora = new Date(p.creadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    const productos = (p.items as unknown as ItemPedido[])
      .map(i => {
        let s = `${i.cantidad}× ${i.nombre}`
        if (i.variante) s += ` ${i.variante}`
        if (i.aclaracion) s += ` (${i.aclaracion})`
        return s
      })
      .join(' / ')
    lineas.push(row(
      String(p.id),
      hora,
      p.cliente,
      MODALIDAD_LABEL[p.modalidad] ?? p.modalidad,
      p.direccion ?? '',
      productos,
      fmt(p.total),
      METODO_LABEL[p.metodoPago]?.texto ?? p.metodoPago,
      ESTADO_LABEL[p.estado] ?? p.estado,
    ))
  }

  lineas.push(row('', '', '', '', '', '', '', '', ''))
  lineas.push(row('', '', '', '', '', '💵 Efectivo',      fmt(totalEfectivo),      '', ''))
  lineas.push(row('', '', '', '', '', '📲 Transferencia', fmt(totalTransferencia), '', ''))
  lineas.push(row('', '', '', '', '', '💳 Tarjeta',       fmt(totalTarjeta),       '', ''))
  lineas.push(row('', '', '', '', '', 'TOTAL DEL DÍA',    fmt(granTotal),          '', ''))

  const csvContent = lineas.join('\n')
  const filename = `caja-${local}-${dd}-${mm}-${yyyy}.csv`

  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────

export default function CajaPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [local, setLocal] = useState<'andalgala' | 'belen'>('andalgala')
  const [verHistorial, setVerHistorial] = useState(false)
  const [mensajeEnviado, setMensajeEnviado] = useState<Record<number, boolean>>({})

  // Costos de envío por pedido — sólo para el mensaje de WhatsApp
  const [costosEnvio, setCostosEnvio] = useState<Record<number, string>>({})

  // Descuentos por pedido (monto fijo en $)
  const [descuentos, setDescuentos] = useState<Record<number, string>>({})

  // Sesión
  const [sesionInicio, setSesionInicio] = useState<string>('')
  const [confirmandoCerrar, setConfirmandoCerrar] = useState(false)

  // ── Editor de pedido ──
  const [editandoPedido, setEditandoPedido]     = useState<Pedido | null>(null)
  const [itemsEdicion, setItemsEdicion]         = useState<ItemPedido[]>([])
  const [catEdicion, setCatEdicion]             = useState(0)
  const [varEdicion, setVarEdicion]             = useState<MenuItem | null>(null)
  const [mostrarAgregar, setMostrarAgregar]     = useState(false)
  const [guardando, setGuardando]               = useState(false)

  // ── Persistir "mensajeEnviado" en localStorage ──
  useEffect(() => {
    try {
      const me = localStorage.getItem('caja_mensajeEnviado')
      if (me) setMensajeEnviado(JSON.parse(me))
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('caja_mensajeEnviado', JSON.stringify(mensajeEnviado)) } catch {}
  }, [mensajeEnviado])

  // ── sesionInicio: primera vez → 9am del turno actual ──
  useEffect(() => {
    const key = `caja_sesionInicio_${local}`
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        setSesionInicio(stored)
      } else {
        const ahora = new Date()
        const inicio = new Date(ahora)
        inicio.setHours(9, 0, 0, 0)
        if (ahora.getHours() < 9) inicio.setDate(inicio.getDate() - 1)
        const iso = inicio.toISOString()
        localStorage.setItem(key, iso)
        setSesionInicio(iso)
      }
    } catch {
      setSesionInicio(new Date().toISOString())
    }
  }, [local])

  // ── Pusher + fetch de pedidos del turno ──
  useEffect(() => {
    if (!sesionInicio) return
    fetch(`/api/pedidos?local=${local}&desde=${encodeURIComponent(sesionInicio)}`)
      .then(r => r.json())
      .then(setPedidos)

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    const channel = pusher.subscribe(`cocina-${local}`)
    channel.bind('nuevo-pedido', (pedido: Pedido) => {
      setPedidos(prev => {
        if (prev.some(p => p.id === pedido.id)) return prev
        return [pedido, ...prev]
      })
    })
    channel.bind('pedido-actualizado', (pedido: Pedido) => {
      setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, ...pedido } : p))
    })
    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`cocina-${local}`)
    }
  }, [local, sesionInicio])

  // ── Acciones ──

  async function marcarCobrado(id: number) {
    await fetch(`/api/pedidos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'cobrado' }),
    })
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: 'cobrado' } : p))
  }

  async function mandarACocina(id: number) {
    await fetch(`/api/pedidos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'en_espera' }),
    })
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: 'en_espera' } : p))
  }

  async function cerrarCaja() {
    exportarCSV(pedidos, local, sesionInicio)
    await fetch('/api/caja/cerrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local }),
    })
    const ahora = new Date().toISOString()
    const key = `caja_sesionInicio_${local}`
    try { localStorage.setItem(key, ahora) } catch {}
    setSesionInicio(ahora)
    setPedidos([])
    setCostosEnvio({})
    setDescuentos({})
    setConfirmandoCerrar(false)
  }

  // ── Editor de pedido ──

  function abrirEditor(pedido: Pedido) {
    setEditandoPedido(pedido)
    setItemsEdicion(JSON.parse(JSON.stringify(pedido.items)))
    setCatEdicion(0)
    setVarEdicion(null)
    setMostrarAgregar(false)
  }

  function cambiarCantidad(idx: number, delta: number) {
    setItemsEdicion(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], cantidad: Math.max(1, next[idx].cantidad + delta) }
      return next
    })
  }

  function quitarItem(idx: number) {
    setItemsEdicion(prev => prev.filter((_, i) => i !== idx))
  }

  function agregarDesdeMenu(item: MenuItem, variante?: { nombre: string; precio: number }) {
    const vNombre = variante?.nombre ?? ''
    const precio  = variante?.precio ?? item.precio ?? 0
    setItemsEdicion(prev => {
      const idx = prev.findIndex(it => it.nombre === item.nombre && (it.variante ?? '') === vNombre)
      if (idx >= 0) {
        return prev.map((it, i) => i === idx ? { ...it, cantidad: it.cantidad + 1 } : it)
      }
      return [...prev, { nombre: item.nombre, variante: vNombre, cantidad: 1, precio }]
    })
    setVarEdicion(null)
  }

  async function guardarEdicion() {
    if (!editandoPedido || itemsEdicion.length === 0) return
    setGuardando(true)
    const total = itemsEdicion.reduce((s, it) => s + it.precio * it.cantidad, 0)
    // Vuelve a en_espera para que cocina sepa que hubo un cambio
    const estadoNuevo = editandoPedido.estado === 'pendiente' ? 'pendiente' : 'en_espera'
    await fetch(`/api/pedidos/${editandoPedido.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: itemsEdicion, total, estado: estadoNuevo }),
    })
    setPedidos(prev => prev.map(p =>
      p.id === editandoPedido.id
        ? { ...p, items: itemsEdicion as unknown as ItemPedido[], total, estado: estadoNuevo }
        : p
    ))
    setGuardando(false)
    setEditandoPedido(null)
  }

  // ── Totales del día ──
  const activos   = pedidos.filter(p => !['cobrado', 'entregado', 'eliminado'].includes(p.estado))
  const historial = pedidos.filter(p => ['cobrado', 'entregado', 'eliminado'].includes(p.estado))

  const cobrados = pedidos.filter(p => p.estado === 'cobrado' || p.estado === 'entregado')
  const totalEfectivo      = cobrados.filter(p => p.metodoPago === 'efectivo').reduce((s, p) => s + p.total, 0)
  const totalTransferencia = cobrados.filter(p => p.metodoPago === 'transferencia').reduce((s, p) => s + p.total, 0)
  const totalTarjeta       = cobrados.filter(p => p.metodoPago === 'tarjeta').reduce((s, p) => s + p.total, 0)
  const granTotal = totalEfectivo + totalTransferencia + totalTarjeta
  const ticketPromedio = cobrados.length > 0 ? Math.round(granTotal / cobrados.length) : 0

  const totalEdicion = itemsEdicion.reduce((s, it) => s + it.precio * it.cantidad, 0)

  const sesionLabel = sesionInicio
    ? new Date(sesionInicio).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : ''

  // ─────────────────────────────────────────
  // TARJETA DE PEDIDO
  // ─────────────────────────────────────────

  const tarjeta = (pedido: Pedido, enHistorial = false) => {
    const metodo = METODO_LABEL[pedido.metodoPago] ?? { texto: pedido.metodoPago, icono: '?', clase: 'bg-zinc-700 text-white' }
    const yaEnvioCocina = pedido.estado !== 'pendiente'

    const esDelivery = pedido.modalidad === 'llevar'
    const costoEnvioStr = costosEnvio[pedido.id] ?? ''
    const costoEnvioNum = parseFloat(costoEnvioStr) || 0
    const costoEnvioListo = !esDelivery || costoEnvioNum > 0

    const descuentoStr = descuentos[pedido.id] ?? ''
    const descuentoNum = parseFloat(descuentoStr) || 0
    const totalFinal = Math.max(0, pedido.total + costoEnvioNum - descuentoNum)

    const mensaje = pedido.telefono ? armarMensajeCliente(pedido, costoEnvioNum, descuentoNum) : ''
    const waLink  = pedido.telefono ? linkWhatsApp(pedido.telefono, mensaje) : null
    const yaMandoMensaje = mensajeEnviado[pedido.id] ?? false

    return (
      <div
        key={pedido.id}
        className={`bg-zinc-900 rounded-lg border border-zinc-800 p-4 flex flex-col gap-3 ${enHistorial ? 'opacity-50' : ''}`}
      >
        {/* Encabezado */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-red-500 font-black text-xl leading-none shrink-0">#{pedido.id}</span>
            <span className="font-bold text-white uppercase tracking-wide text-sm truncate">{pedido.cliente}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!enHistorial && (
              <button
                onClick={() => abrirEditor(pedido)}
                className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white transition"
              >
                ✏️ Editar
              </button>
            )}
            <span className="text-xs text-zinc-500 tabular-nums">
              {new Date(pedido.creadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded tracking-widest ${ESTADO_COLOR[pedido.estado] ?? 'bg-zinc-700 text-white'}`}>
            {ESTADO_LABEL[pedido.estado] ?? pedido.estado.toUpperCase()}
          </span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded tracking-widest flex items-center gap-1 ${metodo.clase}`}>
            {metodo.icono} {metodo.texto.toUpperCase()}
          </span>
          {pedido.metodoPago === 'transferencia' && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-900 text-blue-300 tracking-widest">
              alias: dolka2026
            </span>
          )}
        </div>

        {/* Modalidad + dirección */}
        <p className="text-xs text-zinc-400 uppercase tracking-wide">
          {MODALIDAD_LABEL[pedido.modalidad] ?? pedido.modalidad}
          {pedido.modalidad === 'llevar' && pedido.direccion && (
            <span className="text-zinc-500"> — {pedido.direccion}</span>
          )}
        </p>

        <div className="border-t border-zinc-800" />

        {/* Items */}
        <ul className="space-y-1">
          {(pedido.items as unknown as ItemPedido[]).map((item, i) => (
            <li key={i} className="text-sm">
              <span className="font-bold text-white">{item.cantidad}×</span>
              <span className="ml-1 text-zinc-200 uppercase text-xs tracking-wide font-semibold">{item.nombre}</span>
              {item.variante && <span className="text-zinc-500 text-xs"> ({item.variante})</span>}
              <span className="text-zinc-500 text-xs ml-1">— {formatearPrecio(item.precio * item.cantidad)}</span>
              {item.aclaracion && (
                <p className="text-amber-400 text-xs mt-0.5 ml-3">↳ {item.aclaracion}</p>
              )}
            </li>
          ))}
        </ul>

        {/* Total del pedido */}
        <div className="flex flex-col gap-1 pt-1 border-t border-zinc-800">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Subtotal</span>
            <span className="font-bold text-zinc-300 text-base tabular-nums">{formatearPrecio(pedido.total)}</span>
          </div>
          {descuentoNum > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-green-400 font-bold uppercase tracking-widest">Descuento</span>
              <span className="font-bold text-green-400 tabular-nums">-{formatearPrecio(descuentoNum)}</span>
            </div>
          )}
          {(descuentoNum > 0 || costoEnvioNum > 0) && (
            <div className="flex justify-between items-center border-t border-zinc-700 pt-1 mt-0.5">
              <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Total final</span>
              <span className="font-black text-white text-lg tabular-nums">{formatearPrecio(totalFinal)}</span>
            </div>
          )}
          {descuentoNum === 0 && costoEnvioNum === 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Total</span>
              <span className="font-black text-white text-lg tabular-nums">{formatearPrecio(pedido.total)}</span>
            </div>
          )}
        </div>

        {/* ── Acciones (sólo en pedidos activos) ── */}
        {!enHistorial && (
          <div className="flex flex-col gap-2 pt-1">

            {/* ── DESCUENTO ── */}
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 bg-zinc-800 border border-zinc-700">
              <span className="text-sm shrink-0">🎁</span>
              <span className="text-[10px] font-black uppercase tracking-widest shrink-0 text-zinc-400">Descuento</span>
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-zinc-400 text-sm font-bold">$</span>
                <input
                  type="number"
                  min={0}
                  value={descuentoStr}
                  onChange={e => setDescuentos(prev => ({ ...prev, [pedido.id]: e.target.value }))}
                  placeholder="0"
                  className="w-20 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-sm text-right font-bold text-white placeholder:text-zinc-500 focus:outline-none focus:border-green-600 transition"
                />
              </div>
            </div>

            {/* ── COSTO DE ENVÍO ── */}
            {esDelivery && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 border ${costoEnvioListo ? 'bg-zinc-800 border-zinc-700' : 'bg-amber-950 border-amber-700'}`}>
                <span className="text-sm shrink-0">🛵</span>
                <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${costoEnvioListo ? 'text-zinc-400' : 'text-amber-400'}`}>
                  Costo de envío
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-zinc-400 text-sm font-bold">$</span>
                  <input
                    type="number"
                    min={0}
                    value={costoEnvioStr}
                    onChange={e => setCostosEnvio(prev => ({ ...prev, [pedido.id]: e.target.value }))}
                    placeholder="0"
                    className={`w-20 bg-zinc-700 border rounded-lg px-2 py-1 text-sm text-right font-bold text-white placeholder:text-zinc-500 focus:outline-none transition ${costoEnvioListo ? 'border-zinc-600 focus:border-red-600' : 'border-amber-600 focus:border-amber-400'}`}
                  />
                </div>
              </div>
            )}

            {/* ── WhatsApp ── */}
            {waLink ? (
              yaMandoMensaje ? (
                <div className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2.5 gap-2">
                  <span className="text-xs text-zinc-400">✓ Ya le mandaste al cliente</span>
                  {costoEnvioListo ? (
                    <a href={waLink} target="_blank" rel="noopener noreferrer"
                      onClick={() => setMensajeEnviado(prev => ({ ...prev, [pedido.id]: true }))}
                      className="text-xs font-bold text-green-400 hover:text-green-300 underline underline-offset-2 whitespace-nowrap">
                      Reabrir chat
                    </a>
                  ) : (
                    <span className="text-xs text-amber-500 font-bold">Falta costo de envío</span>
                  )}
                </div>
              ) : (
                costoEnvioListo ? (
                  <a href={waLink} target="_blank" rel="noopener noreferrer"
                    onClick={() => setMensajeEnviado(prev => ({ ...prev, [pedido.id]: true }))}
                    className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider px-3 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe5c] text-white transition">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Mensaje al cliente
                  </a>
                ) : (
                  <button disabled
                    className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider px-3 py-2.5 rounded-lg bg-zinc-800 text-zinc-500 cursor-not-allowed">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0 opacity-40">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Completá el envío primero
                  </button>
                )
              )
            ) : (
              <span className="text-xs text-zinc-600 italic px-3 py-2.5 border border-zinc-800 rounded-lg text-center">Sin teléfono</span>
            )}

            {/* ── Mandar a cocina ── */}
            <button
              onClick={() => !yaEnvioCocina && mandarACocina(pedido.id)}
              disabled={yaEnvioCocina}
              className={`text-xs font-black uppercase tracking-wider px-3 py-2.5 rounded-lg transition ${yaEnvioCocina ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-red-700 hover:bg-red-600 text-white'}`}
            >
              {yaEnvioCocina ? '✓ Enviado a cocina' : '🍳 Mandar a cocina'}
            </button>

            {/* ── Cobrado ── */}
            {pedido.estado === 'listo' && (
              <button
                onClick={() => marcarCobrado(pedido.id)}
                className="text-xs font-black uppercase tracking-wider px-3 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition"
              >
                ✓ Cobrado
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────

  return (
    <PinGate role="Caja" pin="chesnodumba">
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* ── Modal de confirmación de cierre ── */}
      {confirmandoCerrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full flex flex-col gap-5 shadow-2xl">
            <div>
              <h2 className="text-white font-black uppercase tracking-widest text-lg">¿Cerrar la caja?</h2>
              <p className="text-zinc-400 text-xs mt-1">
                Sesión iniciada: <span className="text-zinc-200 font-mono">{sesionLabel}</span>
              </p>
            </div>

            <div className="bg-zinc-800 rounded-lg p-4 flex flex-col gap-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Resumen del día</p>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">💵 Efectivo</span>
                <span className="text-white font-bold tabular-nums">{formatearPrecio(totalEfectivo)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">📲 Transferencia</span>
                <span className="text-white font-bold tabular-nums">{formatearPrecio(totalTransferencia)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">💳 Tarjeta</span>
                <span className="text-white font-bold tabular-nums">{formatearPrecio(totalTarjeta)}</span>
              </div>
              <div className="border-t border-zinc-700 mt-1 pt-2 flex justify-between">
                <span className="text-white font-black uppercase text-xs tracking-widest">Total</span>
                <span className="text-white font-black text-lg tabular-nums">{formatearPrecio(granTotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-500 pt-1">
                <span>{cobrados.length} pedidos cobrados</span>
                <span>Ticket prom. {formatearPrecio(ticketPromedio)}</span>
              </div>
            </div>

            <p className="text-zinc-500 text-xs">
              Se va a descargar un CSV con todos los pedidos de esta sesión y la caja quedará en cero para el próximo turno.
            </p>

            {activos.length > 0 && (
              <p className="text-amber-400 text-xs font-bold">
                ⚠️ Hay {activos.length} pedido{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''} sin cerrar.
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setConfirmandoCerrar(false)}
                className="flex-1 text-xs font-black uppercase tracking-wider px-4 py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition">
                Cancelar
              </button>
              <button onClick={cerrarCaja}
                className="flex-1 text-xs font-black uppercase tracking-wider px-4 py-3 rounded-lg bg-red-700 hover:bg-red-600 text-white transition">
                Cerrar y descargar CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal editor de pedido ── */}
      {editandoPedido && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg flex flex-col shadow-2xl max-h-[92dvh]">

            {/* Header modal */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800 shrink-0">
              <div>
                <h2 className="text-white font-black uppercase tracking-widest text-base leading-none">
                  Editando #{editandoPedido.id}
                </h2>
                <p className="text-zinc-400 text-xs mt-0.5 uppercase tracking-wide font-bold">{editandoPedido.cliente}</p>
              </div>
              <button onClick={() => setEditandoPedido(null)}
                className="text-zinc-500 hover:text-white text-xl leading-none transition">✕</button>
            </div>

            {/* Scroll container */}
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

              {/* Items actuales */}
              {itemsEdicion.length === 0 ? (
                <p className="text-zinc-600 text-xs text-center py-4 font-bold uppercase tracking-widest">
                  Sin productos — agregá al menos uno
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {itemsEdicion.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-white text-xs font-bold uppercase tracking-wide">{item.nombre}</span>
                        {item.variante && <span className="text-zinc-500 text-xs"> ({item.variante})</span>}
                        <span className="text-zinc-500 text-xs ml-1">— {formatearPrecio(item.precio)}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => cambiarCantidad(idx, -1)}
                          className="w-6 h-6 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-black flex items-center justify-center transition">
                          −
                        </button>
                        <span className="text-white font-black text-sm w-5 text-center tabular-nums">{item.cantidad}</span>
                        <button onClick={() => cambiarCantidad(idx, 1)}
                          className="w-6 h-6 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-black flex items-center justify-center transition">
                          +
                        </button>
                        <button onClick={() => quitarItem(idx)}
                          className="w-6 h-6 rounded bg-red-900 hover:bg-red-700 text-red-400 hover:text-white text-xs font-black flex items-center justify-center ml-1 transition">
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Total en edición */}
              <div className="flex justify-between items-center bg-zinc-800 rounded-lg px-4 py-2.5">
                <span className="text-xs text-zinc-400 font-black uppercase tracking-widest">Nuevo total</span>
                <span className="text-white font-black text-lg tabular-nums">{formatearPrecio(totalEdicion)}</span>
              </div>

              {/* Agregar productos */}
              <div>
                <button
                  onClick={() => { setMostrarAgregar(v => !v); setVarEdicion(null) }}
                  className={`w-full text-xs font-black uppercase tracking-wider px-3 py-2.5 rounded-lg border transition ${
                    mostrarAgregar
                      ? 'bg-zinc-700 border-zinc-600 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  {mostrarAgregar ? '▲ Cerrar menú' : '＋ Agregar producto'}
                </button>

                {mostrarAgregar && (
                  <div className="mt-3 flex flex-col gap-3">
                    {/* Tabs de categoría */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {categorias.map((cat, i) => (
                        <button
                          key={cat.nombre}
                          onClick={() => { setCatEdicion(i); setVarEdicion(null) }}
                          className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg transition ${
                            catEdicion === i
                              ? 'bg-red-700 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {cat.nombre}
                        </button>
                      ))}
                    </div>

                    {/* Picker de variante inline */}
                    {varEdicion && (
                      <div className="bg-zinc-800 rounded-xl p-3 flex flex-col gap-2">
                        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                          {varEdicion.nombre} — elegí variante:
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {varEdicion.precios?.simple !== undefined && (
                            <button
                              onClick={() => agregarDesdeMenu(varEdicion, { nombre: 'Simple', precio: varEdicion.precios!.simple })}
                              className="flex-1 py-2 px-3 bg-zinc-700 hover:bg-red-700 rounded-lg text-xs font-black text-white transition">
                              Simple — {formatearPrecio(varEdicion.precios.simple)}
                            </button>
                          )}
                          {varEdicion.precios?.doble !== undefined && (
                            <button
                              onClick={() => agregarDesdeMenu(varEdicion, { nombre: 'Doble', precio: varEdicion.precios!.doble! })}
                              className="flex-1 py-2 px-3 bg-zinc-700 hover:bg-red-700 rounded-lg text-xs font-black text-white transition">
                              Doble — {formatearPrecio(varEdicion.precios.doble)}
                            </button>
                          )}
                          {varEdicion.precios?.triple !== undefined && (
                            <button
                              onClick={() => agregarDesdeMenu(varEdicion, { nombre: 'Triple', precio: varEdicion.precios!.triple! })}
                              className="flex-1 py-2 px-3 bg-zinc-700 hover:bg-red-700 rounded-lg text-xs font-black text-white transition">
                              Triple — {formatearPrecio(varEdicion.precios.triple)}
                            </button>
                          )}
                          <button onClick={() => setVarEdicion(null)}
                            className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-zinc-400 transition">
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Grid de ítems */}
                    <div className="grid grid-cols-2 gap-2">
                      {categorias[catEdicion]?.items.map(item => {
                        const tieneVariantes = !!item.precios
                        const seleccionado = varEdicion?.nombre === item.nombre
                        return (
                          <button
                            key={item.nombre}
                            onClick={() => {
                              if (tieneVariantes) {
                                setVarEdicion(seleccionado ? null : item)
                              } else {
                                agregarDesdeMenu(item)
                              }
                            }}
                            className={`text-left px-3 py-2.5 rounded-lg border transition ${
                              seleccionado
                                ? 'bg-red-800 border-red-600 text-white'
                                : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500 text-zinc-200'
                            }`}
                          >
                            <p className="text-xs font-bold uppercase tracking-wide leading-tight">{item.nombre}</p>
                            <p className="text-[10px] text-zinc-400 mt-0.5">
                              {tieneVariantes
                                ? `desde ${formatearPrecio(item.precios!.simple)}`
                                : formatearPrecio(item.precio ?? 0)
                              }
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-3 border-t border-zinc-800 flex gap-3 shrink-0">
              <button onClick={() => setEditandoPedido(null)}
                className="flex-1 text-xs font-black uppercase tracking-wider px-4 py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition">
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                disabled={guardando || itemsEdicion.length === 0}
                className="flex-1 text-xs font-black uppercase tracking-wider px-4 py-3 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition"
              >
                {guardando ? 'Guardando…' : '✓ Guardar y notificar cocina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-black">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/icon.png" alt="Dolka Star" className="h-10 w-auto shrink-0" />
            <span className="font-black text-white uppercase tracking-widest text-lg">Caja</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setConfirmandoCerrar(true)}
              className="text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-900 border border-zinc-700 hover:border-red-700 text-zinc-400 hover:text-white transition"
              title="Cerrar caja del día">
              🔒 Cerrar caja
            </button>
            <select value={local} onChange={e => setLocal(e.target.value as 'andalgala' | 'belen')}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
              <option value="andalgala">Andalgalá</option>
              <option value="belen">Belén</option>
            </select>
          </div>
        </div>
        <div className="h-4 w-full" style={{
          backgroundColor: '#dc2626',
          backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%), linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 8px 8px',
        }} />
      </header>

      <main className="p-4 max-w-7xl mx-auto">
        {sesionInicio && (
          <p className="text-zinc-600 text-[10px] font-mono mb-4 mt-1">Sesión desde: {sesionLabel}</p>
        )}

        {/* Resumen de caja */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Efectivo',      valor: formatearPrecio(totalEfectivo),      icono: '💵', color: 'border-emerald-700' },
            { label: 'Transferencia', valor: formatearPrecio(totalTransferencia), icono: '📲', color: 'border-blue-700' },
            { label: 'Tarjeta',       valor: formatearPrecio(totalTarjeta),       icono: '💳', color: 'border-violet-700' },
            { label: 'Total del día', valor: formatearPrecio(granTotal),          icono: '🏦', color: 'border-red-600' },
            { label: 'Pedidos',       valor: String(cobrados.length),             icono: '📋', color: 'border-zinc-600' },
            { label: 'Ticket prom.',  valor: cobrados.length > 0 ? formatearPrecio(ticketPromedio) : '—', icono: '📊', color: 'border-amber-600' },
          ].map(({ label, valor, icono, color }) => (
            <div key={label} className={`bg-zinc-900 border-l-4 ${color} rounded-r-lg px-4 py-3`}>
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-1">{icono} {label}</p>
              <p className="text-white font-black text-lg tabular-nums">{valor}</p>
            </div>
          ))}
        </div>

        {/* Pedidos activos */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Activos</span>
          <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-full">{activos.length}</span>
        </div>

        {activos.length === 0 && (
          <p className="text-zinc-600 text-center mt-16 text-sm font-bold uppercase tracking-widest">
            Sin pedidos activos
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activos.map(p => tarjeta(p, false))}
        </div>

        {/* Historial del día */}
        <div className="mt-10">
          <button onClick={() => setVerHistorial(v => !v)} className="flex items-center gap-2 mb-4 group">
            <span className="text-zinc-600 group-hover:text-zinc-400 transition text-xs">{verHistorial ? '▲' : '▼'}</span>
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition">
              Cobrados del día
            </span>
            <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-2 py-0.5 rounded-full">{historial.length}</span>
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
    </PinGate>
  )
}