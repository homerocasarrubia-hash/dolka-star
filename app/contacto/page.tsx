"use client";

import CheckeredDivider from "@/components/CheckeredDivider";
import DeliveryBanner from "@/components/DeliveryBanner";
import { useLocal } from "@/components/LocalProvider";
import { whatsappHref } from "@/data/locales";

export default function ContactoPage() {
  const { local } = useLocal();

  return (
    <>
      <CheckeredDivider />
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="font-display text-5xl text-red-primary mb-6">Contacto</h1>

        <div className="mb-10 rounded-lg overflow-hidden">
          <DeliveryBanner />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Info */}
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-2xl text-ink mb-1">Dirección</h2>
              <p className="font-body text-ink/70">{local.direccion}</p>
            </div>
            <div>
              <h2 className="font-display text-2xl text-ink mb-1">Horario</h2>
              <p className="font-body text-ink/70">{local.horario}</p>
            </div>
            {/* Belén todavía no tiene teléfono: el bloque entero no aparece. */}
            {local.telefono && (
              <div>
                <h2 className="font-display text-2xl text-ink mb-2">WhatsApp</h2>
                <a
                  href={whatsappHref(local.telefono)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-red-primary text-white font-display text-lg px-6 py-3 rounded hover:bg-red-logo transition-colors"
                >
                  ESCRIBINOS
                </a>
              </div>
            )}
            <div>
              <h2 className="font-display text-2xl text-ink mb-2">Redes</h2>
              <div className="flex gap-4">
                <a
                  href="https://instagram.com/dolkastar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-red-primary hover:underline"
                >
                  Instagram
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=100008510114814"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-red-primary hover:underline"
                >
                  Facebook
                </a>
              </div>
            </div>
          </div>

          {/* Mapa */}
          <div className="rounded-lg overflow-hidden border border-ink/10 min-h-64">
            <iframe
              title={`Mapa Dolka Star ${local.ciudad}`}
              src={local.mapa}
              width="100%"
              height="300"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
      <CheckeredDivider />
    </>
  );
}
