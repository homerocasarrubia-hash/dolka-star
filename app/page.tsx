import CheckeredDivider from "@/components/CheckeredDivider";
import DeliveryBanner from "@/components/DeliveryBanner";
import HeroCarousel from "@/components/HeroCarousel";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-red-logo text-white py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Izquierda: logo, subtítulo, botones */}
          <div className="text-center md:text-left">
            <div className="flex justify-center md:justify-start mb-6">
              <Image
                src="/assets/logoverticaldolka.png"
                alt="Dolka Star"
                width={1500}
                height={400}
                priority
                className="w-full max-w-[260px] sm:max-w-xs md:max-w-sm h-auto"
              />
            </div>
            <p className="text-lg md:text-xl font-body mb-8 text-white/80">
              Hamburguesas · Lomitos · Pizzas al horno de barro
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link
                href="/menu"
                className="bg-white text-red-logo font-display text-lg px-8 py-3 rounded hover:bg-cream transition-colors"
              >
                VER MENÚ
              </Link>
              <Link
                href="/contacto"
                className="border-2 border-white text-white font-display text-lg px-8 py-3 rounded hover:bg-white hover:text-red-logo transition-colors"
              >
                CONTACTO
              </Link>
              <Link
                href="/club"
                className="bg-gold text-white font-display text-lg px-8 py-3 rounded hover:bg-gold/90 transition-colors"
              >
                DOLKA CLUB
              </Link>
            </div>
          </div>

          {/* Derecha: carrusel de fotos */}
          <div>
            <HeroCarousel />
          </div>
        </div>
      </section>

      <CheckeredDivider />
      <DeliveryBanner />
      <CheckeredDivider />

      {/* Intro */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="font-display text-4xl text-red-primary mb-4">
          Rock &apos;n&apos; roll de bar
        </h2>
        <p className="font-body text-ink/80 text-lg leading-relaxed">
          En el corazón de Andalgalá, hacemos hamburguesas sin vueltas: buena
          carne, pan artesanal y sabor directo al hueso. También pizzas al
          horno de barro y lomitos que hablan por sí solos.
        </p>
      </section>

      <CheckeredDivider />
    </>
  );
}
