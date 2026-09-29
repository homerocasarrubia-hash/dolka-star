// app/api/acceso/route.ts
//
// POST   /api/acceso   — canjear un PIN por la cookie de acceso
// DELETE /api/acceso   — cerrar la sesión de esa pantalla
//
// Es el único lugar del sistema donde se compara un PIN, y corre en el
// servidor: el PIN nunca está en el código que baja el navegador.

import { NextResponse, type NextRequest } from "next/server";
import { armarToken, COOKIE_ACCESO, DURACION_MS, hayConfiguracion, pinDe } from "@/lib/acceso";
import { esRol, type Rol } from "@/lib/roles";

// Nunca cachear una respuesta que pone cookies.
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────
// Freno a la fuerza bruta
// ─────────────────────────────────────────
//
// Un PIN de diez caracteres se puede probar a máquina si el servidor contesta
// todas las veces que le pidan. Esto no es un candado —en serverless la memoria
// no se comparte entre instancias— pero encarece lo suficiente el intento
// automatizado, que es de lo que se trata.

const VENTANA_MS = 10 * 60 * 1000;
const INTENTOS_MAXIMOS = 10;

const intentos = new Map<string, { fallos: number; desde: number }>();

function quienPide(req: NextRequest): string {
  const reenviado = req.headers.get("x-forwarded-for");
  return reenviado?.split(",")[0].trim() || req.headers.get("x-real-ip") || "desconocido";
}

/**
 * La cuenta va por IP Y por rol. En el local las tres pantallas salen por el
 * mismo WiFi, o sea la misma IP: contando sólo por IP, un mozo que erra el PIN
 * diez veces dejaba a la cocina sin poder entrar en pleno servicio.
 */
function clave(ip: string, rol: Rol): string {
  return `${ip}|${rol}`;
}

/** Segundos que faltan para poder volver a probar, o 0 si no está frenado. */
function esperaPendiente(clave: string, ahora: number): number {
  const registro = intentos.get(clave);
  if (!registro) return 0;
  if (ahora - registro.desde > VENTANA_MS) {
    intentos.delete(clave);
    return 0;
  }
  if (registro.fallos < INTENTOS_MAXIMOS) return 0;
  return Math.ceil((VENTANA_MS - (ahora - registro.desde)) / 1000);
}

function anotarFallo(clave: string, ahora: number): void {
  const registro = intentos.get(clave);
  if (!registro || ahora - registro.desde > VENTANA_MS) {
    intentos.set(clave, { fallos: 1, desde: ahora });
    return;
  }
  registro.fallos += 1;

  // El Map vive lo que viva la instancia: sin esta limpieza, una ráfaga de
  // pedidos con IP distinta lo haría crecer sin techo.
  if (intentos.size > 500) {
    for (const [otra, valor] of intentos) {
      if (ahora - valor.desde > VENTANA_MS) intentos.delete(otra);
    }
  }
}

/** Comparar con `===` filtra, por el tiempo que tarda, cuánto del PIN se acertó. */
function igualesEnTiempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

function conCookie(rol: Rol, token: string) {
  const res = NextResponse.json({ ok: true, rol });
  res.cookies.set({
    name: COOKIE_ACCESO,
    value: token,
    // El JavaScript de la página no la puede leer: ni el del sitio ni el que
    // alguien inyecte. Era justamente lo que fallaba con sessionStorage.
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(DURACION_MS / 1000),
  });
  return res;
}

export async function POST(req: NextRequest) {
  if (!hayConfiguracion()) {
    console.error("[acceso] falta ACCESO_SECRET: no se puede firmar la cookie, nadie puede entrar");
    return NextResponse.json(
      { error: "El acceso no está configurado en el servidor." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo no es JSON válido." }, { status: 400 });
  }

  const { rol, pin } = (body ?? {}) as { rol?: unknown; pin?: unknown };
  if (!esRol(rol) || typeof pin !== "string" || !pin) {
    return NextResponse.json({ error: "Faltan datos para entrar." }, { status: 400 });
  }

  const ahora = Date.now();
  const cuenta = clave(quienPide(req), rol);

  const espera = esperaPendiente(cuenta, ahora);
  if (espera > 0) {
    return NextResponse.json(
      { error: `Demasiados intentos. Probá de nuevo en ${Math.ceil(espera / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(espera) } },
    );
  }

  if (!igualesEnTiempoConstante(pin, pinDe(rol))) {
    anotarFallo(cuenta, ahora);
    // Un solo mensaje para todos los casos: no conviene decir si el rol existe
    // ni cuánto del PIN estuvo bien.
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  const token = await armarToken(rol, ahora);
  if (!token) {
    return NextResponse.json({ error: "El acceso no está configurado." }, { status: 503 });
  }

  intentos.delete(cuenta);
  return conCookie(rol, token);
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_ACCESO,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
