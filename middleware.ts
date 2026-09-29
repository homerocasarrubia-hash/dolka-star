// Portero de las pantallas internas.
//
// Corre antes de servir /cocina, /caja y /mozo. Si la cookie de acceso no está
// o no es auténtica, en vez de la pantalla se muestra el formulario de PIN, sin
// cambiar la URL: el que vuelve a /caja con la sesión viva entra derecho.
//
// Antes esta decisión la tomaba el navegador (un sessionStorage que cualquiera
// podía escribir desde la consola) y el HTML de la pantalla ya había bajado.

import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACCESO, leerToken } from "@/lib/acceso";
import { esRol } from "@/lib/roles";

export async function middleware(req: NextRequest) {
  const rol = req.nextUrl.pathname.split("/")[1];
  if (!esRol(rol)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_ACCESO)?.value;
  const autorizado = await leerToken(token);

  // La cookie de otro rol no sirve: el mozo no entra a la caja con su sesión.
  if (autorizado === rol) return NextResponse.next();

  const destino = req.nextUrl.clone();
  destino.pathname = `/acceso/${rol}`;
  destino.search = "";
  return NextResponse.rewrite(destino);
}

export const config = {
  matcher: ["/cocina/:path*", "/caja/:path*", "/mozo/:path*"],
};
