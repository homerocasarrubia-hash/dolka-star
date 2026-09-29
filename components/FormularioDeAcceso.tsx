'use client'

// La pantalla de PIN. Manda el PIN a /api/acceso y nada más: acá no se compara
// ni se guarda nada, porque todo lo que corra en el navegador lo puede leer y
// cambiar el visitante. Quien decide si entra es el servidor.

import { useState } from 'react'
import type { Rol } from '@/lib/roles'

interface Props {
  rol: Rol
  etiqueta: string
  configurado: boolean
}

export default function FormularioDeAcceso({ rol, etiqueta, configurado }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sacudir, setSacudir] = useState(false)
  const [entrando, setEntrando] = useState(false)

  function fallar(mensaje: string) {
    setError(mensaje)
    setPin('')
    setSacudir(true)
    setTimeout(() => setSacudir(false), 600)
  }

  async function intentar() {
    if (entrando || !pin) return
    setEntrando(true)
    setError(null)
    try {
      const res = await fetch('/api/acceso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol, pin }),
      })

      if (res.ok) {
        // La cookie ya está puesta. Recargar vuelve a pasar por el middleware,
        // que esta vez deja ver la pantalla.
        window.location.reload()
        return
      }

      const cuerpo = await res.json().catch(() => null)
      fallar(cuerpo?.error ?? 'No se pudo entrar. Probá de nuevo.')
    } catch {
      fallar('Sin conexión con el servidor.')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
        .shake { animation: shake 0.5s ease; }
      `}</style>

      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs flex flex-col items-center gap-6">

          <img src="/icon.png" alt="Dolka Star" className="h-16 w-auto" />

          <div className="text-center">
            <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Acceso</p>
            <p className="text-white font-black uppercase tracking-widest text-2xl mt-1">{etiqueta}</p>
          </div>

          {!configurado ? (
            <p className="text-red-400 text-sm text-center font-bold leading-relaxed">
              Falta configurar <span className="font-mono">ACCESO_SECRET</span> en el servidor.
              Hasta que esté cargada, nadie puede entrar.
            </p>
          ) : (
            <>
              <div className={`w-full ${sacudir ? 'shake' : ''}`}>
                <input
                  type="password"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && intentar()}
                  placeholder="••••••••"
                  autoFocus
                  autoComplete="current-password"
                  className={`w-full bg-zinc-900 border ${
                    error ? 'border-red-500' : 'border-zinc-700 focus:border-zinc-500'
                  } rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest outline-none transition`}
                />
                {error && (
                  <p className="text-red-500 text-xs text-center mt-2 font-bold uppercase tracking-widest">
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={intentar}
                disabled={entrando}
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white font-black uppercase tracking-widest py-3 rounded-lg transition text-sm"
              >
                {entrando ? 'Entrando…' : 'Entrar'}
              </button>
            </>
          )}

        </div>
      </div>
    </>
  )
}
