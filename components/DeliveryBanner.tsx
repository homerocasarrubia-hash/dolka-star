// Franja de delivery. El botón lleva al menú, donde se arma el pedido.
//
// No se muestra en el local que todavía no tiene teléfono: el pedido termina
// saliendo por WhatsApp desde el carrito, así que sin número no hay a dónde
// llegue. Cuando Belén tenga el suyo, se cae sola esta condición.
"use client";

import Link from "next/link";
import { useLocal } from "./LocalProvider";

export default function DeliveryBanner() {
  const { local } = useLocal();
  if (!local.telefono) return null;

  return (
    <div className="bg-red-primary text-white text-center py-5 px-4">
      <p className="font-display text-2xl md:text-3xl leading-tight">
        Llegamos a todo {local.ciudad}
      </p>
      <p className="font-body text-sm md:text-base text-white/80 mt-1 mb-4">
        Hacé tu pedido online
      </p>
      {/* Al menú y no a WhatsApp: el pedido se arma en el carrito y de ahí sale
          el mensaje con todo escrito. */}
      <Link
        href="/menu"
        className="inline-block bg-white text-red-primary font-display text-base px-6 py-2 rounded hover:bg-cream transition-colors"
      >
        HACER PEDIDO
      </Link>
    </div>
  );
}
