// La presentación de la portada, que nombra la ciudad y lo que se cocina ahí.
//
// Es lo único de esa sección que cambia entre locales, así que se aísla en su
// propio componente de cliente: el resto de la portada sigue renderizándose en
// el servidor.
"use client";

import { useLocal } from "./LocalProvider";

export default function IntroLocal() {
  const { local } = useLocal();

  return (
    <p className="font-body text-ink/80 text-lg leading-relaxed">{local.intro}</p>
  );
}
