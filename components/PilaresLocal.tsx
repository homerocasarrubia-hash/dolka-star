"use client";

import { useLocal } from "./LocalProvider";

export default function PilaresLocal() {
  const { local } = useLocal();

  const pilares =
    local.id === "andalgala"
      ? ["Smash Burgers", "Horno de Barro", "Puro Rock"]
      : ["Smash Burgers", "Lomitos", "Puro Rock"];

  return (
    <div className="mt-10 grid grid-cols-3 gap-4">
      {pilares.map((label) => (
        <div
          key={label}
          className="rounded-xl border-2 border-ink/10 py-5 px-3 flex items-center justify-center hover:border-red-primary hover:shadow-md transition-all duration-200"
        >
          <span className="font-display text-base text-ink/70">{label}</span>
        </div>
      ))}
    </div>
  );
}
