import CheckeredDivider from "@/components/CheckeredDivider";
import DeliveryBanner from "@/components/DeliveryBanner";

export default function ContactoPage() {
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
              <p className="font-body text-ink/70">Belgrano 363, Andalgalá, Catamarca</p>
            </div>
            <div>
              <h2 className="font-display text-2xl text-ink mb-1">Horario</h2>
              <p className="font-body text-ink/70">Lunes a domingo: 21:00 a 00:00</p>
            </div>
            <div>
              <h2 className="font-display text-2xl text-ink mb-2">WhatsApp</h2>
              <a
                href="https://wa.me/543835517049"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-red-primary text-white font-display text-lg px-6 py-3 rounded hover:bg-red-logo transition-colors"
              >
                ESCRIBINOS
              </a>
            </div>
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
              title="Mapa Dolka Star"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3436.123456789!2d-66.3211!3d-27.5987!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sBelgrano+363%2C+Andalgal%C3%A1!5e0!3m2!1ses!2sar!4v1"
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
