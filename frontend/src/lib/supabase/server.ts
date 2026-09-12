// Cliente Supabase para el servidor (Server Components, Server Actions)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getCleanUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return url.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
}

function getCleanKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return key.trim().replace(/^["']|["']$/g, "");
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getCleanUrl(),
    getCleanKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // En Server Components no se puede modificar cookies.
            // Se ignora si el middleware ya se encarga de refrescar la sesion.
          }
        },
      },
    }
  );
}
