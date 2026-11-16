// app/api/local-config/route.ts
//
// GET  /api/local-config?local=andalgala  — ¿está cerrado el local hoy?
// POST /api/local-config                  — activar / desactivar el cierre
//
// Solo caja y cocina llaman a esta ruta: requiere cookie de rol interno.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rolDeLaCookie } from "@/lib/acceso";
import { esLocalId } from "@/data/locales";
import { etiquetaDelTurno } from "@/lib/turno";

export async function GET(req: NextRequest) {
  if (!(await rolDeLaCookie(req))) {
    return NextResponse.json({ error: "Necesitás entrar con tu PIN." }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("local");
  if (!esLocalId(id)) {
    return NextResponse.json({ error: "Local no válido." }, { status: 400 });
  }

  const config = await prisma.localConfig.findUnique({ where: { local: id } });
  const cerradoHoy = config?.fechaCierre === etiquetaDelTurno();

  return NextResponse.json({ cerradoHoy });
}

export async function POST(req: NextRequest) {
  if (!(await rolDeLaCookie(req))) {
    return NextResponse.json({ error: "Necesitás entrar con tu PIN." }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (!esLocalId(b.local)) {
    return NextResponse.json({ error: "Local no válido." }, { status: 400 });
  }

  const cerrar = Boolean(b.cerrar);
  const fechaCierre = cerrar ? etiquetaDelTurno() : null;

  await prisma.localConfig.upsert({
    where: { local: b.local },
    update: { fechaCierre },
    create: { local: b.local, fechaCierre },
  });

  return NextResponse.json({ cerradoHoy: cerrar });
}
