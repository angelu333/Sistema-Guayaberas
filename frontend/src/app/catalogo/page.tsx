"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";

export default function CatalogoRedirectPage() {
  const router = useRouter();
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveSlug() {
      const supabase = createClient();

      // 1. Si ya tenemos tenant en el store
      if (tenant?.slug) {
        router.replace(`/catalogo/${tenant.slug}`);
        return;
      }

      // 2. Si hay sesión activa, consultar la BD por el slug real
      const tenantId = session?.tenantId;
      if (tenantId) {
        const { data } = await supabase
          .from("tenants")
          .select("slug")
          .eq("id", tenantId)
          .single();

        if (data?.slug) {
          router.replace(`/catalogo/${data.slug}`);
          return;
        }
      }

      // 3. Fallback: buscar el primer tenant activo registrado
      const { data: firstTenant } = await supabase
        .from("tenants")
        .select("slug")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (firstTenant?.slug) {
        router.replace(`/catalogo/${firstTenant.slug}`);
      } else {
        setError("No se encontró ningún catálogo activo.");
      }
    }

    resolveSlug();
  }, [tenant, session, router]);

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center p-6 text-center text-[#6B7A71]">
      {error ? (
        <p className="text-xs text-[#B85450] font-bold">{error}</p>
      ) : (
        <>
          <div className="w-8 h-8 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold">Cargando catálogo de tu empresa...</p>
        </>
      )}
    </div>
  );
}
