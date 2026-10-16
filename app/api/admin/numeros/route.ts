// app/api/admin/numeros/route.ts
//
// GET /api/admin/numeros?local=andalgala  — la agenda de clientes del local.
//
// Sale de los teléfonos que la gente dejó al pedir. Es información personal de
// clientes, así que pide la misma cookie que el resto de las pantallas
// internas: con la URL sola no se saca nada.

import { NextRequest, NextResponse } from "next/server";
import { conReintento, prisma } from "@/lib/prisma";
import { rolDeLaCookie } from "@/lib/acceso";
import { esLocalId, LOCAL_POR_DEFECTO } from "@/data/locales";
import { numeroDeWhatsapp } from "@/lib/telefono";

export const dynamic = "force-dynamic";

export interface Contacto {
  cliente: string;
  telefono: string;
}

export async function GET(req: NextRequest) {
  if (!(await rolDeLaCookie(req))) {
    return NextResponse.json({ error: "Necesitás entrar con tu PIN." }, { status: 401 });
  }

  const pedido = req.nextUrl.searchParams.get("local");
  const local = esLocalId(pedido) ? pedido : LOCAL_POR_DEFECTO;

  let filas;
  try {
    filas = await conReintento(() =>
      prisma.pedido.findMany({
        where: { local, telefono: { not: null } },
        // Del más nuevo al más viejo: así, al quedarse con el primero de cada
        // número, se queda con el nombre con el que pidió la última vez.
        orderBy: { creadoEn: "desc" },
        select: { cliente: true, telefono: true },
      }),
    );
  } catch (error) {
    console.error("[numeros] no se pudo leer la agenda:", error);
    return NextResponse.json({ error: "No se pudo leer los contactos." }, { status: 500 });
  }

  // La clave de deduplicación es el número normalizado, no el texto tal cual:
  // "3835 111222" y "3835111222" son la misma persona y aparecerían dos veces.
  const porNumero = new Map<string, Contacto>();

  for (const fila of filas) {
    const telefono = fila.telefono?.trim();
    if (!telefono) continue;

    // Sin espacios ni guiones: la gente los escribe como quiere ("3835
    // 51-8940") y la lista está hecha para copiar y pegar en algún lado. Se
    // conserva el + de los números internacionales.
    const limpio = telefono.replace(/(?!^\+)[^\d]/g, "");
    // Alguien escribió un guión o un punto en el campo del teléfono: una vez
    // limpio no queda ningún dígito, así que es un registro sin teléfono.
    if (!/\d/.test(limpio)) continue;

    const clave = numeroDeWhatsapp(limpio);
    if (porNumero.has(clave)) continue;

    porNumero.set(clave, { cliente: fila.cliente.trim() || "Sin nombre", telefono: limpio });
  }

  const contactos = [...porNumero.values()].sort((a, b) =>
    a.cliente.localeCompare(b.cliente, "es", { sensitivity: "base" }),
  );

  return NextResponse.json(contactos);
}
