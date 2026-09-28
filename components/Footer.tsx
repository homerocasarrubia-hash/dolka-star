"use client";

import CheckeredDivider from "./CheckeredDivider";
import { useLocal } from "./LocalProvider";
import { telefonoLegible, whatsappHref } from "@/data/locales";

export default function Footer() {
  const { local } = useLocal();

  return (
    <footer className="bg-ink text-white">
      <CheckeredDivider />
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Info */}
        <div>
          <h3 className="font-display text-lg mb-3 text-red-primary">Dolka Star</h3>
          <p className="text-sm text-white/70 leading-relaxed">
            Hamburguesas, lomitos y pizzas al horno de barro.
            <br />
            Rock &apos;n&apos; roll de bar, sin vueltas.
          </p>
        </div>

        {/* Contacto */}
        <div>
          <h3 className="font-display text-lg mb-3 text-red-primary">Contacto</h3>
          <ul className="text-sm text-white/70 space-y-1.5">
            <li>{local.direccion}</li>
            <li>Lun–Dom: 21:00 a 00:00</li>
            {/* Belén todavía no tiene línea: la fila no se inventa. */}
            {local.telefono && (
              <li>
                <a
                  href={whatsappHref(local.telefono)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp: {telefonoLegible(local.telefono)}
                </a>
              </li>
            )}
          </ul>
        </div>

        {/* Redes */}
        <div>
          <h3 className="font-display text-lg mb-3 text-red-primary">Redes</h3>
          <div className="flex gap-4">
            <a
              href="https://instagram.com/dolkastar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Instagram
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=100008510114814"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Facebook
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">
        <p>© {new Date().getFullYear()} Dolka Star — {local.ciudad}, Catamarca</p>
        <a
          href="https://www.costudio.business"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-white/50 transition-colors hover:text-white/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
        >
          <span>Página diseñada por C/O Studio</span>
          <img
            src="/assets/costudio-logo.png"
            alt="C/O Studio"
            className="h-[22px] w-auto opacity-60 mix-blend-screen"
          />
        </a>
      </div>
    </footer>
  );
}
