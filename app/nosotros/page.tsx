import CheckeredDivider from "@/components/CheckeredDivider";
import Image from "next/image";

function ArticlePhoto({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="my-12 flex flex-col items-center">
      <div className="w-full max-w-sm md:max-w-md rounded-2xl overflow-hidden shadow-md">
        <Image
          src={src}
          alt={alt}
          width={800}
          height={1000}
          className="w-full h-auto object-cover"
        />
      </div>
      <figcaption className="mt-3 text-sm text-ink/50 font-body italic text-center">
        {caption}
      </figcaption>
    </figure>
  );
}

export default function NosotrosPage() {
  return (
    <>
      <CheckeredDivider />
      <section className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="font-display text-5xl text-red-primary mb-10">Nosotros</h1>

        {/* Bloque 1 */}
        <div className="space-y-5 font-body text-ink/80 text-lg leading-relaxed">
          <p>
            En Dolka Star creemos que una buena comida es mucho más que un plato: es un momento para compartir, disfrutar y crear recuerdos.
          </p>
          <p>
            Nuestra historia comenzó en 2020, en Andalgalá, Catamarca, de una manera muy simple: desde casa, preparando licuados y tostados. Lo que empezó como un pequeño emprendimiento fue creciendo gracias al esfuerzo, la pasión y las ganas de ofrecer algo diferente.
          </p>
          <p>
            Como chef, siempre soñé con transmitir mi manera de entender la gastronomía: cocinar con dedicación, respetar los ingredientes y crear experiencias que queden en la memoria de las personas. Ese sueño fue el motor que nos impulsó a seguir creciendo, con la convicción de llevar nuestro mensaje gastronómico tan lejos como los sueños nos permitan llegar.
          </p>
        </div>

        <ArticlePhoto
          src="/assets/nosotros/trofeo-local.png"
          alt="Trofeo del Campeonato de Burgers de Andalgalá"
          caption="1° Puesto — Campeonato de Burgers de Andalgalá"
        />

        {/* Bloque 2 */}
        <div className="space-y-5 font-body text-ink/80 text-lg leading-relaxed">
          <p>
            Con el tiempo, Dolka Star se convirtió en un punto de encuentro para quienes disfrutan de la buena comida. Cada hamburguesa, lomito, milanesa, pizza y especialidad de nuestra cocina se prepara con dedicación y pasión, buscando brindar una experiencia que invite a volver.
          </p>
          <p>
            Hoy somos un lugar donde siempre hay un motivo para reunirse: transmisiones deportivas, noches especiales, promociones para compartir y un ambiente ideal para disfrutar con amigos, en familia o en pareja.
          </p>
        </div>

        <ArticlePhoto
          src="/assets/nosotros/equipo.jpg"
          alt="El equipo Dolka Star"
          caption="El equipo Dolka Star — 1° Puesto, campeones por segunda vez"
        />

        {/* Bloque 3 */}
        <div className="space-y-5 font-body text-ink/80 text-lg leading-relaxed">
          <p>
            Nuestro compromiso sigue siendo el mismo que el primer día: crecer sin perder nuestra esencia, ofrecer sabores auténticos, porciones generosas, una atención cercana y una experiencia que haga que cada visita sea especial.
          </p>
          <p>
            Bienvenidos a Dolka Star, una historia nacida del esfuerzo, la pasión por la cocina y la convicción de que los sueños, cuando se trabajan con el corazón, no tienen límites.
          </p>
        </div>
      </section>
      <CheckeredDivider />
    </>
  );
}
