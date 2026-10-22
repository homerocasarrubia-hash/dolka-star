"use client";

import Link from "next/link";
import { useLocal } from "./LocalProvider";

export default function PilaresLocal() {
  const { local } = useLocal();

  const pilares =
    local.id === "andalgala"
      ? [
          { label: "Smash Burgers", href: "/menu#hamburguesas" },
          { label: "Horno de Barro", href: "/menu#pizzas" },
          { label: "Puro Rock", href: "/nosotros" },
        ]
      : [
          { label: "Smash Burgers", href: "/menu#hamburguesas" },
          { label: "Lomitos", href: "/menu#lomos" },
          { label: "Puro Rock", href: "/nosotros" },
        ];

  return (
    <div className="mt-10 grid grid-cols-3 gap-4">
      {pilares.map(({ label, href }) => (
        <Link
          key={label}
          href={href}
          className="rounded-xl border-2 border-ink/10 py-5 px-3 flex items-center justify-center hover:border-red-primary hover:text-red-primary hover:shadow-md transition-all duration-200"
        >
          <span className="font-display text-base text-ink/70 group-hover:text-red-primary transition-colors">{label}</span>
        </Link>
      ))}
    </div>
  );
}
