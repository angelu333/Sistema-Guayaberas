"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";

export default function CatalogoRedirectPage() {
  const router = useRouter();
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();

  useEffect(() => {
    const slug =
      tenant?.slug ||
      session?.companyName?.toLowerCase().replace(/\s+/g, "-") ||
      "guayabera-test";

    router.replace(`/catalogo/${slug}`);
  }, [tenant, session, router]);

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center p-6 text-center text-[#6B7A71]">
      <div className="w-8 h-8 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs font-semibold">Redirigiendo a tu catálogo público...</p>
    </div>
  );
}
