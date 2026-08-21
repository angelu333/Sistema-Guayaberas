import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceso — Guayabera Manager",
  description: "Sistema de gestion integral para negocios de guayaberas",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col justify-between p-4 sm:p-6 md:p-8">
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#556B5D] flex items-center justify-center text-white font-bold font-[Outfit] text-lg">
            G
          </div>
          <div>
            <span className="font-[Outfit] font-bold text-lg text-[#26302B] tracking-tight">
              Guayabera Manager
            </span>
            <span className="block text-xs text-[#8FA393] font-medium -mt-1">
              Sistema de Gestión
            </span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-md mx-auto my-auto py-8">
        {children}
      </main>

      <footer className="w-full max-w-6xl mx-auto text-center py-4 text-xs text-[#6B7A71]">
        Guayabera Manager v1.0 &mdash; Plataforma de Gestión Multi-tenant
      </footer>
    </div>
  );
}
