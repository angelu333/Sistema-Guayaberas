// Utilidad para actualizar la sesion en el middleware de Next.js
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rutas 100% públicas que NO deben esperar llamadas de red de autenticación
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

  // 2. Si faltan variables de entorno en el servidor, permitir la navegación básica sin congelar
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("[Middleware] Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o ANON_KEY");
    return NextResponse.next({ request });
  }

  // 3. Para las demás rutas (Dashboard, POS, Inventario, etc.), verificar sesión con Supabase
  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

    // getSession() lee de la cookie local — sin llamada de red, instantáneo
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    // Si no hay sesión y la ruta no es de auth, redirigir al login
    if (!user && !isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Si hay sesión y está en el login, redirigir al dashboard
    if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (err) {
    console.error("[Middleware] Error verificando sesión:", err);
    return supabaseResponse;
  }
}

