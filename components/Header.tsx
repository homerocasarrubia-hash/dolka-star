"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useLocal } from "./LocalProvider";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/menu", label: "Menú" },
  { href: "/club", label: "Dolka Club" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { local, abrirSelector } = useLocal();

  /** Qué local se está mirando, con la puerta para cambiarlo. */
  const cambiarLocal = (
    <button
      type="button"
      onClick={() => {
        setOpen(false);
        abrirSelector();
      }}
      className="flex items-center gap-2 text-left"
      title="Cambiar de local"
    >
      <span className="font-display text-sm tracking-wide text-white">
        {local.ciudad.toUpperCase()}
      </span>
      <span className="font-body text-[11px] uppercase tracking-wider text-white/50 underline underline-offset-2 hover:text-white transition-colors">
        Cambiar local
      </span>
    </button>
  );

  return (
    <header className="bg-ink text-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/assets/logodolka.jpg"
            alt="Dolka Star"
            width={44}
            height={44}
            className="rounded-sm object-cover"
            priority
          />
          <span className="font-display text-xl tracking-wide">DOLKA STAR</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium uppercase tracking-wider hover:text-red-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <span className="w-px h-5 bg-white/15" aria-hidden />
          {cambiarLocal}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setOpen((o) => !o)}
          aria-label="Abrir menú"
        >
          <span className="block w-6 h-0.5 bg-white mb-1.5" />
          <span className="block w-6 h-0.5 bg-white mb-1.5" />
          <span className="block w-6 h-0.5 bg-white" />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="md:hidden bg-ink border-t border-white/10 px-4 pb-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm font-medium uppercase tracking-wider hover:text-red-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 mt-1 border-t border-white/10">{cambiarLocal}</div>
        </nav>
      )}
    </header>
  );
}
