// Formulario de PIN de las pantallas internas.
//
// No se llega acá navegando: el middleware reescribe /cocina, /caja o /mozo a
// esta ruta cuando no hay una cookie de acceso válida. La URL que ve el usuario
// sigue siendo la de su pantalla.

import { notFound } from "next/navigation";
import FormularioDeAcceso from "@/components/FormularioDeAcceso";
import { hayConfiguracion } from "@/lib/acceso";
import { esRol, etiquetaDe } from "@/lib/roles";

// Lee variables de entorno en cada request: no se puede prerenderizar.
export const dynamic = "force-dynamic";

export default async function AccesoPage({ params }: { params: Promise<{ rol: string }> }) {
  const { rol } = await params;
  if (!esRol(rol)) notFound();

  return (
    <FormularioDeAcceso
      rol={rol}
      etiqueta={etiquetaDe(rol)}
      // El componente de cliente no puede mirar el entorno del servidor, así
      // que la respuesta viaja como prop. Es un booleano: no revela nada.
      configurado={hayConfiguracion()}
    />
  );
}
