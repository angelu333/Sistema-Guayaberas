import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Guayabera Manager — Sistema de Gestión",
  description: "Plataforma SaaS multi-tenant para la gestión integral de tiendas de guayaberas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased bg-[#F8F6F1] text-[#26302B]">
        {children}
      </body>
    </html>
  );
}
