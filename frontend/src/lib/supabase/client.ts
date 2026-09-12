// Cliente Supabase para el navegador (componentes del lado del cliente)
import { createBrowserClient } from "@supabase/ssr";

function getCleanUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return url.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
}

function getCleanKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return key.trim().replace(/^["']|["']$/g, "");
}

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (clientInstance) return clientInstance;

  clientInstance = createBrowserClient(
    getCleanUrl(),
    getCleanKey()
  );

  return clientInstance;
}

