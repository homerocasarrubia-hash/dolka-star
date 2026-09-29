'use client'
import { usePathname } from 'next/navigation'
import Header from './Header'
import { esRutaInterna } from '@/lib/rutas'

export default function ConditionalHeader() {
  const pathname = usePathname()
  // Antes sólo se excluía /cocina: /caja y /mozo mostraban el menú del cliente
  // ("Inicio, Menú, Dolka Club...") arriba de la pantalla de trabajo.
  if (esRutaInterna(pathname)) return null
  return <Header />
}