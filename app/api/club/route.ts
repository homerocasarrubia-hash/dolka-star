import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { nombre, contacto } = await request.json();

  if (!nombre?.trim() || !contacto?.trim()) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;

  if (!phone || !apikey) {
    return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });
  }

  const mensaje = `Nuevo registro en Dolka Club: ${nombre.trim()} - ${contacto.trim()}`;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(mensaje)}&apikey=${apikey}`;

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: "Error al enviar notificación" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
