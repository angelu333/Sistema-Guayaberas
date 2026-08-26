"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SucursalesConfigRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sucursales");
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
