// Qué local está mirando el visitante.
//
// La elección vive en localStorage, así que es del navegador: quien entra por
// primera vez elige, y de ahí en más el sitio le muestra su local hasta que
// toque "cambiar local". No hay cuentas ni sesiones: para un sitio de dos
// sucursales, esto alcanza.
//
// El provider envuelve TODO el body (header, contenido y footer) porque los
// tres muestran datos del local.
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import SelectorDeLocal from "./SelectorDeLocal";
import { CLAVE_LOCAL, esLocalId, LOCALES, type Local, type LocalId } from "@/data/locales";

type Contexto = {
  local: Local;
  elegir: (id: LocalId) => void;
  abrirSelector: () => void;
};

const Ctx = createContext<Contexto | null>(null);

/**
 * El local elegido. Solo se puede usar adentro del provider, que garantiza que
 * ya hay uno: mientras no lo haya, lo único que se muestra es el selector.
 */
export function useLocal(): Contexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocal necesita estar dentro de <LocalProvider>");
  return ctx;
}

function leerGuardado(): LocalId | null {
  try {
    const guardado = window.localStorage.getItem(CLAVE_LOCAL);
    return esLocalId(guardado) ? guardado : null;
  } catch {
    return null; // incógnito o storage bloqueado: se vuelve a preguntar
  }
}

export default function LocalProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<LocalId | null>(null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  // En el render del servidor no existe localStorage. Hasta leerlo no se puede
  // decidir qué mostrar, y pintar el selector antes sería un parpadeo para el
  // que ya eligió.
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setId(leerGuardado());
    setListo(true);
  }, []);

  const elegir = useCallback((nuevo: LocalId) => {
    setId(nuevo);
    setSelectorAbierto(false);
    try {
      window.localStorage.setItem(CLAVE_LOCAL, nuevo);
    } catch {
      // Sin storage la elección dura lo que dure la visita. No es motivo para
      // bloquear nada.
    }
  }, []);

  const abrirSelector = useCallback(() => setSelectorAbierto(true), []);

  if (!listo) return null;

  if (id === null || selectorAbierto) {
    return (
      <SelectorDeLocal
        onElegir={elegir}
        // Volver solo tiene sentido si ya había un local elegido.
        onCancelar={id !== null ? () => setSelectorAbierto(false) : undefined}
      />
    );
  }

  return (
    <Ctx.Provider value={{ local: LOCALES[id], elegir, abrirSelector }}>
      {children}
    </Ctx.Provider>
  );
}
