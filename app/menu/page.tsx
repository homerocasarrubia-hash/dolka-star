import CheckeredDivider from "@/components/CheckeredDivider";
import { menu, MenuItem } from "@/data/menu";

function formatPrecio(n: number) {
  return "$" + n.toLocaleString("es-AR");
}

function ItemCard({ item }: { item: MenuItem }) {
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
      <h3 className="font-display text-lg text-ink leading-tight">{item.nombre}</h3>
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
    </div>
  );
}

export default function MenuPage() {
  return (
    <>
      <CheckeredDivider />
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="font-display text-5xl text-red-primary mb-2 text-center">Menú</h1>
        <p className="font-body text-center text-ink/50 text-sm mb-12">
          Belgrano 363, Andalgalá · 21:00 a 00:00
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
                        <ItemCard key={item.nombre} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categoria.items.map((item) => (
                  <ItemCard key={item.nombre} item={item} />
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
    </>
  );
}
