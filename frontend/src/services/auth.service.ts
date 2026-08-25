import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types/domain.types";

export interface RegisterCompanyDTO {
  companyName: string;
  slug: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  rfc?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthSessionData {
  userId: string;
  tenantId: string;
  fullName: string;
  email: string;
  role: UserRole;
  companyName: string;
  tenantSlug: string;
  logoUrl?: string | null;
}

/**
 * Servicio de autenticacion y registro de empresas (Tenants)
 */
export const authService = {
  /**
   * Registra una nueva empresa y crea su usuario administrador
   */
  async registerCompany(data: RegisterCompanyDTO): Promise<{ userId: string; tenantId: string }> {
    const supabase = createClient();

    // 1. Crear el tenant en la tabla "tenants"
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: data.companyName,
        slug: data.slug.toLowerCase().trim(),
        phone: data.phone || null,
        rfc: data.rfc || null,
        email: data.email,
        is_active: true,
      })
      .select("id")
      .single();

    if (tenantError) {
      if (tenantError.code === "23505") {
        throw new Error("El identificador URL (slug) de la empresa ya esta en uso.");
      }
      throw new Error(`Error al registrar la empresa: ${tenantError.message}`);
    }

    // 2. Crear configuracion por defecto del tenant
    const { error: settingsError } = await supabase.from("tenant_settings").insert({
      tenant_id: tenant.id,
      currency: "MXN",
      timezone: "America/Merida",
      low_stock_threshold: 5,
      allow_negative_stock: false,
    });

    if (settingsError) {
      throw new Error(`Error al crear la configuracion del tenant: ${settingsError.message}`);
    }

    // 3. Crear plan trial por defecto
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const { error: planError } = await supabase.from("tenant_plans").insert({
      tenant_id: tenant.id,
      plan_type: "trial",
      status: "active",
      trial_ends_at: trialEndsAt.toISOString(),
    });

    if (planError) {
      throw new Error(`Error al asignar el plan inicial: ${planError.message}`);
    }

    // 4. Registrar usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          tenant_id: tenant.id,
          role: "admin",
        },
      },
    });

    if (authError) {
      throw new Error(`Error al crear la cuenta de usuario: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("No se pudo obtener el usuario registrado.");
    }

    // 5. Crear perfil de usuario extendido vinculando tenant y rol
    const { error: profileError } = await supabase.from("user_profiles").insert({
      id: authData.user.id,
      tenant_id: tenant.id,
      full_name: data.fullName,
      role: "admin",
      is_active: true,
    });

    if (profileError) {
      throw new Error(`Error al crear el perfil de usuario: ${profileError.message}`);
    }

    return {
      userId: authData.user.id,
      tenantId: tenant.id,
    };
  },

  /**
   * Inicia sesion con correo y contrasena
   */
  async login(data: LoginDTO): Promise<AuthSessionData> {
    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      throw new Error("Credenciales invalidas. Verifique su correo y contrasena.");
    }

    if (!authData.user) {
      throw new Error("Error al obtener la sesion del usuario.");
    }

    // Obtener perfil y datos del tenant
    const session = await this.getCurrentSession();
    if (!session) {
      throw new Error("El usuario no tiene una empresa asociada valida.");
    }

    return session;
  },

  /**
   * Cierra la sesion activa
   */
  async logout(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
  },

  /**
   * Obtiene los datos de la sesion actual del usuario autenticado
   */
  async getCurrentSession(): Promise<AuthSessionData | null> {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("tenant_id, full_name, role, is_active, tenants(name, slug, logo_url, rfc, phone, email, address, whatsapp)")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !profile.is_active) {
      return null;
    }

    const tenantObj = profile.tenants as unknown as {
      name: string;
      slug: string;
      logo_url?: string | null;
    } | null;

    return {
      userId: user.id,
      tenantId: profile.tenant_id,
      fullName: profile.full_name,
      email: user.email || "",
      role: profile.role as UserRole,
      companyName: tenantObj?.name || "Empresa",
      tenantSlug: tenantObj?.slug || "",
      logoUrl: tenantObj?.logo_url || null,
    };
  },
};
