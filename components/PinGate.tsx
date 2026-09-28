'use client'

import { useState, useEffect } from 'react'

interface PinGateProps {
  role: string
  pin: string
  children: React.ReactNode
}

export default function PinGate({ role, pin, children }: PinGateProps) {
  const storageKey = `pin_auth_${role}`
  const [autenticado, setAutenticado] = useState(false)
  const [input, setInput]             = useState('')
  const [error, setError]             = useState(false)
  const [cargando, setCargando]       = useState(true)

  useEffect(() => {
    const ok = sessionStorage.getItem(storageKey) === 'ok'
    setAutenticado(ok)
    setCargando(false)
  }, [storageKey])

  function intentar() {
    if (input === pin) {
      sessionStorage.setItem(storageKey, 'ok')
      setAutenticado(true)
    } else {
      setError(true)
      setInput('')
      setTimeout(() => setError(false), 600)
    }
  }

  if (cargando) return null
  if (autenticado) return <>{children}</>

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
            <p className="text-white font-black uppercase tracking-widest text-2xl mt-1">{role}</p>
          </div>

          <div className={`w-full ${error ? 'shake' : ''}`}>
            <input
              type="password"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && intentar()}
              placeholder="••••••••"
              autoFocus
              className={`w-full bg-zinc-900 border ${
                error ? 'border-red-500' : 'border-zinc-700 focus:border-zinc-500'
              } rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest outline-none transition`}
            />
            {error && (
              <p className="text-red-500 text-xs text-center mt-2 font-bold uppercase tracking-widest">
                PIN incorrecto
              </p>
            )}
          </div>

          <button
            onClick={intentar}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest py-3 rounded-lg transition text-sm"
          >
            Entrar
          </button>

        </div>
      </div>
    </>
  )
}