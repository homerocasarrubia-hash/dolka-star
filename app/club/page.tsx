import CheckeredDivider from "@/components/CheckeredDivider";
import ClubForm from "@/components/ClubForm";

export default function ClubPage() {
  return (
    <>
      <CheckeredDivider />
      <section className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="font-display text-5xl text-red-primary mb-4 text-center">
          Dolka Club
        </h1>
        <p className="font-body text-center text-ink/70 text-lg mb-10 leading-relaxed">
          Anotate y recibí descuentos y promos exclusivas directo a tu
          WhatsApp. Una vez por semana, sin spam.
        </p>
        <ClubForm />
      </section>
      <CheckeredDivider />
    </>
  );
}
