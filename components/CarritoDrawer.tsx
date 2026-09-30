// El carrito y el checkout, en un panel que entra desde el costado.
//
// Tres pasos: lista del pedido → datos + pago → confirmación.
"use client";

import { useEffect, useState } from "react";
import { useLocal } from "./LocalProvider";
import {
  formatearPrecio,
  totalDe,
  type Linea,
} from "@/lib/pedido";
import { AVISO_CERRADO, estaAbierto } from "@/lib/horario";

type Modalidad = "local" | "llevar" | "retirar";
type MetodoPago = "efectivo" | "transferencia" | "tarjeta";

export default function CarritoDrawer({
  abierto,
  lineas,
  onCerrar,
  onCambiarCantidad,
  onCambiarAclaracion,
  onVaciar,
}: {
  abierto: boolean;
  lineas: Linea[];
  onCerrar: () => void;
  onCambiarCantidad: (clave: string, delta: number) => void;
  onCambiarAclaracion: (clave: string, texto: string) => void;
  onVaciar: () => void;
}) {
  const { local } = useLocal();
  const [enCheckout, setEnCheckout] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad>("local");
  const [direccion, setDireccion] = useState("");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [error, setError] = useState<string | null>(null);

  // Arranca en true para que el servidor y el navegador pinten lo mismo; el
  // efecto de abajo lo corrige apenas monta.
  const [tomandoPedidos, setTomandoPedidos] = useState(true);

  // Se vuelve a mirar cada tanto: alguien puede tener el carrito abierto a las
  // 19:58 y terminar de cargarlo pasadas las 20, y sería raro que le siga
  // diciendo que está cerrado.
  useEffect(() => {
    const revisar = () => setTomandoPedidos(estaAbierto());
    revisar();
    const reloj = setInterval(revisar, 30_000);
    return () => clearInterval(reloj);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrarYReset();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  useEffect(() => {
    if (lineas.length === 0) setEnCheckout(false);
  }, [lineas.length]);

  if (!abierto) return null;

  const total = totalDe(lineas);
  const nombreOk = cliente.trim().length >= 2;
  const telefonoOk = telefono.trim().replace(/\D/g, "").length >= 8;
  const direccionOk = modalidad !== "llevar" || direccion.trim().length >= 5;
  const puedeEnviar =
    tomandoPedidos && lineas.length > 0 && nombreOk && telefonoOk && direccionOk;

  function cerrarYReset() {
    setError(null);
    setPedidoEnviado(false);
    setEnCheckout(false);
    setCliente("");
    setTelefono("");
    setDireccion("");
    setModalidad("local");
    setMetodoPago("efectivo");
    onCerrar();
  }

  async function enviar() {
    if (!puedeEnviar || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          local: local.id,
          cliente: cliente.trim(),
          telefono: telefono.trim(),
          modalidad,
          direccion: direccion.trim() || null,
          items: lineas.map((l) => ({
            nombre: l.nombre,
            variante: l.variante ?? null,
            cantidad: l.cantidad,
            precio: l.precioUnitario,
            aclaracion: l.aclaracion ?? null,
          })),
          total: totalDe(lineas),
          metodoPago,
        }),
      });
      if (res.ok) {
        onVaciar();
        setPedidoEnviado(true);
        return;
      }
      // Antes un pedido que fallaba no decía nada: el botón volvía a la normalidad
      // y el cliente se quedaba esperando una hamburguesa que nadie recibió.
      const cuerpo = await res.json().catch(() => null);
      setError(cuerpo?.error ?? "No pudimos tomar el pedido. Probá de nuevo en un momento.");
    } catch {
      setError("No pudimos conectarnos. Fijate que tengas internet y probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const MODALIDADES: { valor: Modalidad; texto: string; icono: string }[] = [
    { valor: "local", texto: "En el local", icono: "🪑" },
    { valor: "retirar", texto: "Retiro en el local", icono: "🏃" },
    { valor: "llevar", texto: "A domicilio", icono: "🛵" },
  ];

  const METODOS_PAGO: { valor: MetodoPago; texto: string; icono: string }[] = [
    { valor: "efectivo", texto: "Efectivo", icono: "💵" },
    { valor: "transferencia", texto: "Transferencia", icono: "📲" },
    { valor: "tarjeta", texto: "Tarjeta", icono: "💳" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        aria-label="Cerrar el pedido"
        onClick={cerrarYReset}
        className="absolute inset-0 bg-ink/60"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Tu pedido"
        className="relative flex h-full w-full max-w-md flex-col bg-cream shadow-2xl"
      >
        <header className="flex items-center justify-between bg-red-primary px-4 py-4 text-white">
          <h2 className="font-display text-2xl">
            {pedidoEnviado ? "¡Pedido enviado!" : enCheckout ? "Tus datos" : "Tu pedido"}
          </h2>
          <button
            type="button"
            onClick={cerrarYReset}
            aria-label="Cerrar"
            className="font-display text-xl px-2 leading-none hover:opacity-75"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">

          {/* ── PANTALLA DE CONFIRMACIÓN ── */}
          {pedidoEnviado && (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center py-10">
              <span className="text-7xl">✅</span>
              <h3 className="font-display text-2xl text-ink">¡Tu pedido fue recibido!</h3>
              <p className="font-body text-ink/60 max-w-xs leading-relaxed">
                Ya estamos preparándolo. En breve te avisamos cuando esté listo.
              </p>
              <button
                type="button"
                onClick={cerrarYReset}
                className="mt-4 w-full rounded bg-red-primary px-6 py-3 font-display text-lg text-white hover:bg-red-logo transition-colors"
              >
                CERRAR
              </button>
            </div>
          )}

          {/* ── LISTA DE ITEMS ── */}
          {!pedidoEnviado && lineas.length === 0 && (
            <p className="font-body text-ink/60 py-10 text-center leading-relaxed">
              Todavía no agregaste nada.
              <br />
              Tocá el + de cualquier plato.
            </p>
          )}

          {!pedidoEnviado && lineas.length > 0 && !enCheckout && (
            <ul className="space-y-3">
              {lineas.map((l) => (
                <li key={l.clave} className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base leading-tight text-ink">
                        {l.nombre}
                        {l.variante && (
                          <span className="font-body text-xs text-ink/50"> · {l.variante}</span>
                        )}
                      </p>
                      <p className="font-body text-sm text-ink/60">
                        {formatearPrecio(l.precioUnitario)} c/u
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCambiarCantidad(l.clave, -1)}
                        aria-label={`Sacar uno de ${l.nombre}`}
                        className="h-8 w-8 rounded border-2 border-ink/20 font-display text-lg leading-none text-ink hover:bg-ink/5"
                      >
                        −
                      </button>
                      <span className="font-display w-6 text-center text-lg">{l.cantidad}</span>
                      <button
                        type="button"
                        onClick={() => onCambiarCantidad(l.clave, 1)}
                        aria-label={`Agregar uno de ${l.nombre}`}
                        className="h-8 w-8 rounded border-2 border-ink/20 font-display text-lg leading-none text-ink hover:bg-ink/5"
                      >
                        +
                      </button>
                    </div>

                    <p className="font-display w-20 text-right text-base text-red-primary">
                      {formatearPrecio(l.precioUnitario * l.cantidad)}
                    </p>
                  </div>

                  {!l.esBebida && (
                    <input
                      value={l.aclaracion ?? ""}
                      onChange={(e) => onCambiarAclaracion(l.clave, e.target.value)}
                      placeholder="Aclaraciones (ej: sin tomate, sin cebolla...)"
                      aria-label={`Aclaraciones para ${l.nombre}`}
                      maxLength={140}
                      className="mt-2 w-full rounded border border-ink/15 bg-cream/60 px-2 py-1.5 font-body text-sm text-ink outline-none placeholder:text-ink/40 focus:border-red-primary"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* ── FORMULARIO DE CHECKOUT ── */}
          {!pedidoEnviado && lineas.length > 0 && enCheckout && (
            <div className="space-y-5">
              {/* Nombre */}
              <label className="block">
                <span className="font-display mb-1 block text-sm uppercase tracking-wider text-ink">
                  Tu nombre <span className="text-red-primary">*</span>
                </span>
                <input
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Cómo te anotamos"
                  autoComplete="name"
                  className="w-full rounded border-2 border-ink/20 bg-white px-3 py-2 font-body text-base text-ink outline-none focus:border-red-primary"
                />
              </label>

              {/* Teléfono */}
              <label className="block">
                <span className="font-display mb-1 block text-sm uppercase tracking-wider text-ink">
                  Tu teléfono <span className="text-red-primary">*</span>
                </span>
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 3835 123456"
                  autoComplete="tel"
                  inputMode="tel"
                  className="w-full rounded border-2 border-ink/20 bg-white px-3 py-2 font-body text-base text-ink outline-none focus:border-red-primary"
                />
              </label>

              {/* Modalidad */}
              <fieldset>
                <legend className="font-display mb-2 text-sm uppercase tracking-wider text-ink">
                  ¿Cómo lo querés?
                </legend>
                <div className="grid grid-cols-1 gap-2">
                  {MODALIDADES.map((op) => (
                    <button
                      key={op.valor}
                      type="button"
                      onClick={() => setModalidad(op.valor)}
                      aria-pressed={modalidad === op.valor}
                      className={`rounded border-2 px-3 py-2.5 font-body text-sm transition-colors text-left flex items-center gap-2 ${
                        modalidad === op.valor
                          ? "border-red-primary bg-red-primary text-white"
                          : "border-ink/20 bg-white text-ink hover:border-ink/40"
                      }`}
                    >
                      <span>{op.icono}</span>
                      <span>{op.texto}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Dirección — solo para delivery */}
              {modalidad === "llevar" && (
                <label className="block">
                  <span className="font-display mb-1 block text-sm uppercase tracking-wider text-ink">
                    Dirección de entrega <span className="text-red-primary">*</span>
                  </span>
                  <input
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Calle, número y referencia"
                    autoComplete="street-address"
                    className="w-full rounded border-2 border-ink/20 bg-white px-3 py-2 font-body text-base text-ink outline-none focus:border-red-primary"
                  />
                </label>
              )}

              {/* Método de pago */}
              <fieldset>
                <legend className="font-display mb-2 text-sm uppercase tracking-wider text-ink">
                  ¿Cómo vas a pagar?
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {METODOS_PAGO.map((mp) => (
                    <button
                      key={mp.valor}
                      type="button"
                      onClick={() => setMetodoPago(mp.valor)}
                      aria-pressed={metodoPago === mp.valor}
                      className={`rounded border-2 px-2 py-2.5 font-body text-sm transition-colors flex flex-col items-center gap-1 ${
                        metodoPago === mp.valor
                          ? "border-red-primary bg-red-primary text-white"
                          : "border-ink/20 bg-white text-ink hover:border-ink/40"
                      }`}
                    >
                      <span className="text-xl">{mp.icono}</span>
                      <span className="text-xs">{mp.texto}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        {!pedidoEnviado && lineas.length > 0 && (
          <footer className="border-t border-ink/10 bg-cream px-4 py-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="font-display text-lg text-ink">TOTAL</span>
              <span className="font-display text-2xl text-red-primary">
                {formatearPrecio(total)}
              </span>
            </div>

            {!tomandoPedidos && (
              <p className="mb-3 rounded border border-red-primary bg-red-primary/10 px-4 py-3 text-center text-sm font-semibold text-red-primary">
                🌙 {AVISO_CERRADO}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mb-3 rounded border border-red-primary bg-red-primary/10 px-4 py-3 text-center text-sm font-semibold text-red-primary"
              >
                {error}
              </p>
            )}

            {!enCheckout ? (
              <button
                type="button"
                onClick={() => setEnCheckout(true)}
                disabled={!tomandoPedidos}
                className="w-full rounded bg-red-primary px-6 py-3 font-display text-lg text-white transition-colors hover:bg-red-logo disabled:cursor-not-allowed disabled:opacity-40"
              >
                {tomandoPedidos ? "HACER PEDIDO" : `CERRADO — ABRIMOS 20:00`}
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={enviar}
                  disabled={!puedeEnviar || enviando}
                  className="w-full rounded bg-red-primary px-6 py-3 font-display text-lg text-white transition-colors hover:bg-red-logo disabled:opacity-40"
                >
                  {enviando
                    ? "ENVIANDO..."
                    : tomandoPedidos
                      ? "CONFIRMAR PEDIDO"
                      : "CERRADO — ABRIMOS 20:00"}
                </button>
                <button
                  type="button"
                  onClick={() => setEnCheckout(false)}
                  className="w-full font-body text-sm text-ink/60 underline underline-offset-2 hover:text-ink"
                >
                  Volver al pedido
                </button>
              </div>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}