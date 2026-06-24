"use client";

import { useState } from "react";

// Acepta dígitos, espacios y un '+' opcional al inicio. Mínimo 8 dígitos.
function validarWhatsApp(valor: string): boolean {
  const limpio = valor.replace(/[\s+]/g, "");
  return /^\d{8,}$/.test(limpio);
}

export default function ClubForm() {
  const [form, setForm] = useState({ nombre: "", whatsapp: "" });
  const [waError, setWaError] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  function handleWhatsAppChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    // Solo permite dígitos, espacios y '+' al inicio
    if (!/^[+\d\s]*$/.test(val)) return;
    setForm((f) => ({ ...f, whatsapp: val }));
    if (waError) setWaError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validarWhatsApp(form.whatsapp)) {
      setWaError("Ingresá un número de WhatsApp válido (mínimo 8 dígitos).");
      return;
    }
    try {
      const res = await fetch("/api/club", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: form.nombre, contacto: form.whatsapp }),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <div className="bg-white rounded-lg p-8 text-center shadow-sm">
        <p className="font-display text-2xl text-red-primary mb-2">YA ERAS UNO DE LOS NUESTROS</p>
        <p className="font-body text-ink/70">Te vamos a mandar promos y descuentos a tu WhatsApp.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg p-8 shadow-sm space-y-6"
    >
      <div>
        <label htmlFor="nombre" className="font-display text-sm block mb-1 uppercase tracking-wide">
          Nombre
        </label>
        <input
          id="nombre"
          type="text"
          required
          value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          className="w-full border border-ink/20 rounded px-4 py-2.5 font-body text-sm focus:outline-none focus:border-red-primary"
          placeholder="¿Cómo te llamás?"
        />
      </div>

      <div>
        <label htmlFor="whatsapp" className="font-display text-sm block mb-1 uppercase tracking-wide">
          WhatsApp
        </label>
        <input
          id="whatsapp"
          type="tel"
          required
          value={form.whatsapp}
          onChange={handleWhatsAppChange}
          className={`w-full border rounded px-4 py-2.5 font-body text-sm focus:outline-none transition-colors ${
            waError ? "border-red-primary focus:border-red-primary" : "border-ink/20 focus:border-red-primary"
          }`}
          placeholder="+54 3835 xxxxxx"
        />
        {waError && (
          <p className="text-red-primary font-body text-sm mt-1.5">{waError}</p>
        )}
      </div>

      {status === "error" && (
        <p className="text-red-primary font-body text-sm">
          Algo salió mal. Probá de nuevo o escribinos por WhatsApp.
        </p>
      )}

      <button
        type="submit"
        className="w-full bg-red-primary text-white font-display text-xl py-3 rounded hover:bg-red-logo transition-colors"
      >
        UNIRME AL CLUB
      </button>
    </form>
  );
}
