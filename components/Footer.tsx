import CheckeredDivider from "./CheckeredDivider";

export default function Footer() {
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
            <li>Belgrano 363, Andalgalá, Catamarca</li>
            <li>Lun–Dom: 21:00 a 00:00</li>
            <li>
              <a
                href="https://wa.me/543835517049"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                WhatsApp: 3835 517049
              </a>
            </li>
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

      <div className="border-t border-white/10 text-center py-4 text-xs text-white/40">
        © {new Date().getFullYear()} Dolka Star — Andalgalá, Catamarca
      </div>
    </footer>
  );
}
