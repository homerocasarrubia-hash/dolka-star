"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const IMAGES = [
  "/assets/promos/promo1.jpg",
  "/assets/promos/promo2.jpg",
  "/assets/promos/promo3.jpg",
  "/assets/promos/promo4.jpg",
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % IMAGES.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
      {IMAGES.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={`Foto ${i + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className={`object-cover transition-opacity duration-700 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
          priority={i === 0}
        />
      ))}
    </div>
  );
}
