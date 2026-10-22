// Tagline del hero: qué se cocina en el local elegido.
//
// La homepage es un Server Component, así que no puede leer localStorage
// directamente. Este componente de cliente sí puede: usa useLocal() para
// mostrar "Hamburguesas · Lomitos · Pizzas al horno de barro" en Andalgalá
// y solo "Hamburguesas · Lomitos" en Belén, donde no hay pizzas.
"use client";

import { useLocal } from "./LocalProvider";

export default function HeroTagline() {
  const { local } = useLocal();

  const tagline =
    local.id === "andalgala"
      ? "Hamburguesas · Lomitos · Pizzas al horno de barro"
      : "Hamburguesas · Lomitos";

  return (
    <p className="text-lg md:text-xl font-body mb-8 text-white/80">{tagline}</p>
  );
}
