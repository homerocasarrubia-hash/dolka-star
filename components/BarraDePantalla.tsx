'use client'

// La franja de estado que llevan arriba las tres pantallas internas.
//
// Existe por dos cosas que pasaron en el local:
//
//   • "A veces hay que recargar la página para ver los pedidos". Si la pantalla
//     no dice cuándo fue la última vez que preguntó, no hay forma de saber si
//     está al día o colgada. Acá se ve, y hay un botón para forzarlo.
//
//   • "No suena cuando entra un pedido". El navegador no deja sonar nada hasta
//     que alguien toca la página, y después de entrar con el PIN nadie la toca.
//     Un botón que suena al apretarlo saca la duda de encima.

import { useEffect, useState } from 'react'

interface Props {
  /** Si el canal en vivo está realmente entregando. */
  conectado: boolean
  /** Cuándo contestó el servidor por última vez. */
  ultimaCarga: Date | null
  onRefrescar: () => void
  /** El navegador tiene el audio bloqueado. */
  sinSonido: boolean
  onActivarSonido: () => void
}

/** "hace 8 s", "hace 2 min". Sin adornos: lo que importa es si es mucho. */
function hace(desde: Date, ahora: number): string {
  const seg = Math.max(0, Math.round((ahora - desde.getTime()) / 1000))
  if (seg < 60) return `hace ${seg} s`
  const min = Math.round(seg / 60)
  return `hace ${min} min`
}

export default function BarraDePantalla({
  conectado,
  ultimaCarga,
  onRefrescar,
  sinSonido,
  onActivarSonido,
}: Props) {
  // Un tic propio para que el "hace X" avance aunque no llegue nada nuevo.
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 5000)
    return () => clearInterval(reloj)
  }, [])

  // Más de un minuto sin noticias del servidor ya es raro: se refresca cada 15
  // segundos.
  const atrasada = ultimaCarga !== null && ahora - ultimaCarga.getTime() > 60_000

  return (
    <div className="mt-2 mb-4 flex flex-col gap-2">
      {sinSonido && (
        <button
          onClick={onActivarSonido}
          className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-black uppercase tracking-wider text-black transition hover:bg-amber-400"
        >
          🔔 Activar sonido — tocá acá al empezar el turno
        </button>
      )}

      {!conectado && (
        <div role="status" className="rounded bg-amber-950 border border-amber-500 px-4 py-3">
          <span className="text-sm font-bold text-amber-200">
            Sin conexión en vivo. La lista se actualiza sola cada 15 segundos.
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs">
        <span className={`h-2 w-2 shrink-0 rounded-full ${conectado ? 'bg-green-500' : 'bg-amber-500'}`} />
        <span className={atrasada ? 'font-bold text-amber-400' : 'text-zinc-500'}>
          {ultimaCarga ? `Actualizado ${hace(ultimaCarga, ahora)}` : 'Cargando…'}
        </span>
        <button
          onClick={onRefrescar}
          className="ml-auto rounded bg-zinc-800 px-3 py-1.5 font-bold uppercase tracking-wider text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
        >
          ↻ Actualizar
        </button>
      </div>
    </div>
  )
}
