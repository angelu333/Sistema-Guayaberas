// ================================================================
// /api/admin/users — Guayabera Manager
// API protegida para gestión de usuarios/empleados por sucursal.
// Solo accesible por usuarios con rol 'admin' de su propio tenant.
// ================================================================
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Cliente con permisos de Administrador Supabase (Service Role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Función auxiliar para verificar la sesión y rol 'admin' de quien llama
 */
async function verifyAdminSession() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "No autenticado", status: 401 };
  }

  // Obtener perfil para validar tenant y rol
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("tenant_id, role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    return { error: "Perfil de usuario no encontrado o inactivo", status: 403 };
  }

  if (profile.role !== "admin") {
    return { error: "Acceso denegado: Se requieren permisos de Administrador", status: 403 };
  }

  return {
    adminUser: user,
    tenantId: profile.tenant_id,
  };
}

// 1. GET: Listar usuarios del tenant
export async function GET() {
  try {
    const authResult = await verifyAdminSession();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { tenantId } = authResult;

    // Obtener perfiles de usuario del tenant junto con su sucursal
    const { data: profiles, error } = await supabaseAdmin
      .from("user_profiles")
      .select(`
        id,
        full_name,
        role,
        is_active,
        location_id,
        created_at,
        ubicaciones:location_id (
          id,
          name
        )
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Obtener emails de auth.users de forma segura para cada ID
    const usersWithEmail = await Promise.all(
      (profiles || []).map(async (p: any) => {
        let email = "";
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(p.id);
          email = authUser?.user?.email || "";
        } catch {
          // Ignorar si no se pudo leer email
        }
        return {
          id: p.id,
          fullName: p.full_name,
          role: p.role,
          isActive: p.is_active,
          locationId: p.location_id,
          locationName: p.ubicaciones?.name || "Sin sucursal asignada (Global)",
          email,
          createdAt: p.created_at,
        };
      })
    );

    return NextResponse.json({ users: usersWithEmail });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. POST: Crear nuevo usuario para una sucursal
export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminSession();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { tenantId } = authResult;
    const body = await req.json();
    const { email, password, fullName, role = "seller", locationId } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, contraseña y nombre completo son requeridos." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    if (!["admin", "seller", "production"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
    }

    // 1. Crear usuario en Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        tenant_id: tenantId,
      },
    });

    if (createError || !newUser?.user) {
      return NextResponse.json(
        { error: createError?.message || "Error al crear usuario en autenticación." },
        { status: 400 }
      );
    }

    const userId = newUser.user.id;

    // 2. Insertar perfil en user_profiles
    const { error: profileError } = await supabaseAdmin.from("user_profiles").insert({
      id: userId,
      tenant_id: tenantId,
      full_name: fullName,
      role,
      location_id: locationId || null,
      is_active: true,
    });

    if (profileError) {
      // Revertir creación de usuario si falla el perfil
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: `Error al crear perfil: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        fullName,
        role,
        locationId,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. PUT: Actualizar usuario (rol, sucursal, estado o contraseña)
export async function PUT(req: NextRequest) {
  try {
    const authResult = await verifyAdminSession();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { tenantId, adminUser } = authResult;
    const body = await req.json();
    const { userId, fullName, role, locationId, isActive, password } = body;

    if (!userId) {
      return NextResponse.json({ error: "Falta userId." }, { status: 400 });
    }

    // Verificar que el usuario pertenezca al mismo tenant
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("user_profiles")
      .select("tenant_id, role")
      .eq("id", userId)
      .single();

    if (targetError || !targetProfile || targetProfile.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Usuario no encontrado en tu empresa." }, { status: 404 });
    }

    // Evitar que el admin se desactive a sí mismo por error
    if (adminUser.id === userId && isActive === false) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta de administrador." },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (role !== undefined) updates.role = role;
    if (locationId !== undefined) updates.location_id = locationId || null;
    if (isActive !== undefined) updates.is_active = isActive;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from("user_profiles")
        .update(updates)
        .eq("id", userId)
        .eq("tenant_id", tenantId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    // Actualizar contraseña si se proporcionó
    if (password && password.trim().length >= 6) {
      const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password.trim(),
      });
      if (pwdError) {
        return NextResponse.json({ error: pwdError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 4. DELETE: Eliminar cuenta de usuario
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await verifyAdminSession();
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { tenantId, adminUser } = authResult;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Falta userId." }, { status: 400 });
    }

    if (adminUser.id === userId) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta de administrador." },
        { status: 400 }
      );
    }

    // Verificar tenant
    const { data: targetProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();

    if (!targetProfile || targetProfile.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Usuario no encontrado en tu empresa." }, { status: 404 });
    }

    // Eliminar de auth.users (en cascada elimina user_profiles)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
