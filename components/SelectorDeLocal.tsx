// Pantalla de elección de local: lo primero que ve alguien que entra por
// primera vez, y lo que vuelve a aparecer al tocar "cambiar local".
"use client";

import Image from "next/image";
import { LOCALES_EN_ORDEN, type LocalId } from "@/data/locales";

export default function SelectorDeLocal({
  onElegir,
  onCancelar,
}: {
  onElegir: (id: LocalId) => void;
  /** Solo se ofrece si ya había un local elegido: la primera vez hay que elegir. */
  onCancelar?: () => void;
}) {
  return (
    <div className="min-h-screen bg-red-logo text-white flex flex-col items-center justify-center px-4 py-12">
      <Image
        src="/assets/logoverticaldolka.png"
        alt="Dolka Star"
        width={1500}
        height={400}
        priority
        className="w-full max-w-[280px] sm:max-w-sm h-auto mb-10"
      />

      <h1 className="font-display text-2xl sm:text-3xl text-center mb-8 tracking-wide">
        Elegí tu local
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
        {LOCALES_EN_ORDEN.map((local) => (
          <button
            key={local.id}
            type="button"
            onClick={() => onElegir(local.id)}
            className="bg-white text-red-logo rounded-lg px-6 py-10 text-center shadow-lg transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
          >
            <span className="block font-display text-3xl sm:text-4xl leading-none">
              {local.ciudad}
            </span>
            <span className="block font-body text-sm text-ink/60 mt-3">
              {local.direccion}
            </span>
          </button>
        ))}
      </div>

      {onCancelar && (
        <button
          type="button"
          onClick={onCancelar}
          className="font-body text-sm text-white/80 underline underline-offset-4 mt-10 hover:text-white transition-colors"
        >
          Volver
        </button>
      )}
    </div>
  );
}
