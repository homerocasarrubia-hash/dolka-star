"use client";

import { useCallback, useState } from "react";
import CarritoDrawer from "@/components/CarritoDrawer";
import CheckeredDivider from "@/components/CheckeredDivider";
import { useLocal } from "@/components/LocalProvider";
import { cartaDe, MenuItem } from "@/data/menu";
import {
  cantidadTotal,
  claveDeLinea,
  formatearPrecio as formatPrecio,
  opcionesDeBebida,
  type Linea,
  type Variante,
} from "@/lib/pedido";

/** Botón redondo de agregar, el mismo en toda la carta. */
/**
 * Botón redondo de agregar.
 *
 * El círculo es un cuadrado exacto (w-10 h-10) y centra su contenido con flex
 * en los dos ejes. El símbolo va dibujado y no escrito: el "+" de Anton tiene
 * la tinta entre 3 y 9 px por encima de la línea base, así que centrando la
 * caja de texto el símbolo igual quedaba alto. Dibujado, el centro es
 * geométrico y no depende de la tipografía.
 */
function BotonMas({ onClick, etiqueta }: { onClick: () => void; etiqueta: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-primary text-white transition-colors hover:bg-red-logo"
    >
      <svg viewBox="0 0 12 12" aria-hidden className="h-4 w-4" fill="currentColor">
        <rect x="5" y="0" width="2" height="12" />
        <rect x="0" y="5" width="12" height="2" />
      </svg>
    </button>
  );
}

type Opcion = { etiqueta: string; nombre: string; precio: number; variante?: Variante };

/**
 * Las opciones que hay que elegir antes de agregar, si es que hay alguna.
 *
 * Dos casos distintos con la misma cara: los platos con Simple/Doble/Triple, y
 * las bebidas que venden varias marcas al mismo precio ("Coca-Cola / Fanta /
 * Sprite 350ml"). En los dos, el cliente tiene que decir cuál antes de que la
 * línea entre al carrito, porque el nombre que llega a la cocina cambia.
 */
function opcionesDe(item: MenuItem, esBebida: boolean): Opcion[] {
  if (item.precios) {
    const { simple, doble, triple } = item.precios;
    const variantes: [Variante, number | undefined][] = [
      ["Simple", simple],
      ["Doble", doble],
      ["Triple", triple],
    ];
    return variantes
      .filter((v): v is [Variante, number] => v[1] !== undefined)
      .map(([variante, precio]) => ({
        etiqueta: `${variante} ${formatPrecio(precio)}`,
        nombre: item.nombre,
        precio,
        variante,
      }));
  }

  // Solo en bebidas: en el resto de la carta una barra en el nombre no separa
  // opciones y partirla inventaría platos que no existen.
  if (esBebida && item.precio !== undefined) {
    return opcionesDeBebida(item.nombre).map((nombre) => ({
      etiqueta: nombre,
      nombre,
      precio: item.precio as number,
    }));
  }

  return [];
}

function ItemCard({
  item,
  esBebida,
  onAgregar,
}: {
  item: MenuItem;
  esBebida: boolean;
  onAgregar: (nombre: string, precio: number, variante?: Variante, esBebida?: boolean) => void;
}) {
  // El selector se abre en la misma card para no tapar la carta con un modal
  // por cada toque.
  const [eligiendo, setEligiendo] = useState(false);
  const opciones = opcionesDe(item, esBebida);

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-ink/5 flex flex-col">
      {item.etiqueta && (
        <span
          className="font-body text-[10px] font-bold uppercase tracking-wider mb-1 self-start"
          style={{ color: "#75AADB" }}
        >
          {item.etiqueta}
        </span>
      )}
      <div className="flex items-start gap-3">
        <h3 className="font-display text-lg text-ink leading-tight flex-1">{item.nombre}</h3>
        {opciones.length > 0 ? (
          <BotonMas
            onClick={() => setEligiendo((v) => !v)}
            etiqueta={`Elegir opción de ${item.nombre}`}
          />
        ) : (
          item.precio !== undefined && (
            <BotonMas
              onClick={() => onAgregar(item.nombre, item.precio as number, undefined, esBebida)}
              etiqueta={`Agregar ${item.nombre} al pedido`}
            />
          )
        )}
      </div>
      {item.descripcion && (
        <p className="font-body text-sm text-ink/60 mt-1 leading-relaxed flex-1">{item.descripcion}</p>
      )}
      {item.precios && (
        <div className="flex gap-4 mt-3">
          <span className="font-display text-sm">
            <span className="text-ink/40">S </span>
            <span className="text-red-primary">{formatPrecio(item.precios.simple)}</span>
          </span>
          {item.precios.doble && (
            <span className="font-display text-sm">
              <span className="text-ink/40">D </span>
              <span className="text-red-primary">{formatPrecio(item.precios.doble)}</span>
            </span>
          )}
          {item.precios.triple && (
            <span className="font-display text-sm">
              <span className="text-ink/40">T </span>
              <span className="text-red-primary">{formatPrecio(item.precios.triple)}</span>
            </span>
          )}
        </div>
      )}
      {item.precio !== undefined && (
        <p className="font-display text-lg text-red-primary mt-2">
          {formatPrecio(item.precio)}
        </p>
      )}

      {eligiendo && opciones.length > 0 && (
        <div className="mt-3 border-t border-ink/10 pt-3">
          <p className="font-body text-xs uppercase tracking-wider text-ink/50 mb-2">
            ¿Cuál agregamos?
          </p>
          <div className="flex flex-wrap gap-2">
            {opciones.map((o) => (
              <button
                key={o.etiqueta}
                type="button"
                onClick={() => {
                  onAgregar(o.nombre, o.precio, o.variante, esBebida);
                  setEligiendo(false);
                }}
                className="rounded border-2 border-red-primary px-3 py-2 font-display text-sm text-red-primary transition-colors hover:bg-red-primary hover:text-white"
              >
                {o.etiqueta}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  // Cada local hace su propia carta: Andalgalá la completa, Belén la parte que
  // cocina. El recorte está en data/locales.ts.
  const { local } = useLocal();
  const menu = cartaDe(local.carta);

  // El carrito vive acá y no en un contexto global: solo existe mientras se
  // mira la carta, y se manda por WhatsApp sin pasar por el servidor.
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const agregar = useCallback(
    (nombre: string, precioUnitario: number, variante?: Variante, esBebida = false) => {
      const clave = claveDeLinea(nombre, variante);
      setLineas((actuales) => {
        const yaEsta = actuales.find((l) => l.clave === clave);
        if (yaEsta) {
          return actuales.map((l) => (l.clave === clave ? { ...l, cantidad: l.cantidad + 1 } : l));
        }
        return [...actuales, { clave, nombre, variante, precioUnitario, cantidad: 1, esBebida }];
      });
    },
    [],
  );

  const cambiarCantidad = useCallback((clave: string, delta: number) => {
    setLineas((actuales) =>
      actuales
        .map((l) => (l.clave === clave ? { ...l, cantidad: l.cantidad + delta } : l))
        // Llegar a cero saca el ítem: no hace falta un botón de borrar aparte.
        .filter((l) => l.cantidad > 0),
    );
  }, []);

  const cambiarAclaracion = useCallback((clave: string, texto: string) => {
    setLineas((actuales) =>
      actuales.map((l) => (l.clave === clave ? { ...l, aclaracion: texto } : l)),
    );
  }, []);

  const cantidad = cantidadTotal(lineas);

  return (
    <>
      <CheckeredDivider />
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="font-display text-5xl text-red-primary mb-2 text-center">Menú</h1>
        <p className="font-body text-center text-ink/50 text-sm mb-12">
          {local.direccion} · {local.horario}
        </p>

        {menu.map((categoria, idx) => (
          <div key={categoria.id} id={categoria.id} className="mb-14">
            <div className="mb-5">
              <h2 className="font-display text-3xl text-ink border-b-2 border-red-primary pb-2">
                {categoria.label}
              </h2>
              {categoria.nota && (
                <p className="font-body text-sm text-ink/60 mt-2 italic">{categoria.nota}</p>
              )}
            </div>

            {/* Bebidas: agrupadas por subcategoría */}
            {categoria.id === "bebidas" ? (
              <div className="space-y-6">
                {Object.entries(
                  categoria.items.reduce<Record<string, MenuItem[]>>((acc, item) => {
                    const g = item.grupo ?? "Otros";
                    acc[g] = [...(acc[g] ?? []), item];
                    return acc;
                  }, {})
                ).map(([grupo, items]) => (
                  <div key={grupo}>
                    <h3 className="font-display text-xl text-ink/50 mb-3 uppercase tracking-wider">
                      {grupo}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {items.map((item) => (
                        <ItemCard key={item.nombre} item={item} esBebida onAgregar={agregar} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categoria.items.map((item) => (
                  <ItemCard
                    key={item.nombre}
                    item={item}
                    esBebida={false}
                    onAgregar={agregar}
                  />
                ))}
              </div>
            )}

            {idx < menu.length - 1 && (
              <div className="mt-14">
                <CheckeredDivider />
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Botón fijo: la carta es larga y el pedido tiene que estar siempre a
          un toque, sin volver arriba. */}
      <button
        type="button"
        onClick={() => setCarritoAbierto(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-red-primary px-5 py-3 font-display text-base text-white shadow-lg transition-colors hover:bg-red-logo"
      >
        VER PEDIDO 🛒
        {cantidad > 0 && (
          <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-sm text-red-primary">
            {cantidad}
          </span>
        )}
      </button>

      <CarritoDrawer
        abierto={carritoAbierto}
        lineas={lineas}
        onCerrar={() => setCarritoAbierto(false)}
        onCambiarCantidad={cambiarCantidad}
        onCambiarAclaracion={cambiarAclaracion}
        onVaciar={() => setLineas([])}
      />
    </>
  );
}
