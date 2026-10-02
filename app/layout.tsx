import type { Metadata } from "next";
import "./globals.css";
import ConditionalHeader from "@/components/ConditionalHeader";
import ConditionalFooter from "@/components/ConditionalFooter";
import LocalProvider from "@/components/LocalProvider";

export const metadata: Metadata = {
  title: "Dolka Star — Hamburguesas, Lomitos y más | Andalgalá y Belén",
  description:
    "La mejor hamburguesería de Andalgalá, Catamarca. Hamburguesas, lomitos, sanguches de milanesa y pizzas al horno de barro. Belgrano 363.",
  openGraph: {
    title: "Dolka Star",
    description: "Hamburguesas y pizzas al horno de barro en Andalgalá.",
    locale: "es_AR",
    type: "website",
  },
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="flex flex-col min-h-screen">
        <LocalProvider>
          <ConditionalHeader />
          <main className="flex-1">{children}</main>
          <ConditionalFooter />
        </LocalProvider>
      </body>
    </html>
  );
}