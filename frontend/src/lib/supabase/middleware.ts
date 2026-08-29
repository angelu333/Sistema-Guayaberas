// Utilidad para actualizar la sesion en el middleware de Next.js
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rutas públicas que NO requieren autenticación
  const isPublicRoute =
    pathname.startsWith("/catalogo") ||
    pathname.startsWith("/cotizacion") ||
    pathname.startsWith("/api/push") ||
    pathname.startsWith("/offline.html") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js";

  if (isPublicRoute) {
    return NextResponse.next({ request });
  }

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

  // 2. Comprobar presencia de token de sesión en las cookies de Supabase (0ms, sin peticiones de red)
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => (c.name.includes("-auth-token") || c.name.startsWith("sb-")) && c.value && c.value !== "[]" && c.value !== '""'
  );

  // 3. Si no tiene cookie y quiere entrar a una ruta protegida -> /login
  if (!hasAuthCookie && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 4. Si ya tiene cookie y está en /login o /register -> /dashboard
  if (hasAuthCookie && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

