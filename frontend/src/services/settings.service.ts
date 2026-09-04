import { createClient } from "@/lib/supabase/client";
import type { Tenant, TenantSettings } from "@/types/domain.types";

const supabase = createClient();

export interface UpdateTenantDTO {
  name: string;
  slug?: string;
  rfc?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  whatsapp?: string | null;
  ticketHeader?: string | null;
  ticketFooter?: string | null;
  bannerText?: string | null;
}

export const settingsService = {
  /**
   * Obtiene la información completa de la empresa y su configuración
   */
  async getTenantInfo(tenantId: string): Promise<{ tenant: Tenant; settings: TenantSettings | null }> {
    const { data: tenantData, error: tenantErr } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (tenantErr) {
      throw new Error(`Error al obtener información de la empresa: ${tenantErr.message}`);
    }

    const { data: settingsData } = await supabase
      .from("tenant_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    const tenant: Tenant = {
      id: tenantData.id,
      name: tenantData.name,
      slug: tenantData.slug,
      rfc: tenantData.rfc,
      phone: tenantData.phone,
      email: tenantData.email,
      address: tenantData.address,
      logoUrl: tenantData.logo_url,
      whatsapp: tenantData.whatsapp,
      isActive: tenantData.is_active,
      createdAt: tenantData.created_at,
    };

    const settings: TenantSettings | null = settingsData
      ? {
          id: settingsData.id,
          tenantId: settingsData.tenant_id,
          currency: settingsData.currency,
          timezone: settingsData.timezone,
          lowStockThreshold: settingsData.low_stock_threshold,
          allowNegativeStock: settingsData.allow_negative_stock,
          ticketHeader: settingsData.ticket_header,
          ticketFooter: settingsData.ticket_footer,
        }
      : null;

    return { tenant, settings };
  },

  /**
   * Actualiza los datos comerciales, logotipo y contacto de la empresa
   */
  async updateTenantProfile(tenantId: string, dto: UpdateTenantDTO): Promise<void> {
    const { error: tenantErr } = await supabase
      .from("tenants")
      .update({
        name: dto.name.trim(),
        slug: dto.slug ? dto.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") : undefined,
        rfc: dto.rfc?.trim() || null,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        address: dto.address?.trim() || null,
        logo_url: dto.logoUrl || null,
        whatsapp: dto.whatsapp?.trim() || null,
      })
      .eq("id", tenantId);

    if (tenantErr) {
      throw new Error(`Error al actualizar datos de la empresa: ${tenantErr.message}`);
    }

    // Actualizar o crear configuración de tickets / eslogan
    const bannerVal = dto.bannerText !== undefined ? dto.bannerText : dto.ticketHeader;
    if (dto.ticketFooter !== undefined || bannerVal !== undefined) {
      const { data: existing } = await supabase
        .from("tenant_settings")
        .select("id")
        .eq("tenant_id", tenantId)
        .single();

      const updateData: any = {};
      if (dto.ticketFooter !== undefined) updateData.ticket_footer = dto.ticketFooter?.trim() || null;
      if (bannerVal !== undefined) updateData.ticket_header = bannerVal?.trim() || null;

      if (existing) {
        await supabase
          .from("tenant_settings")
          .update(updateData)
          .eq("tenant_id", tenantId);
      } else {
        await supabase.from("tenant_settings").insert({
          tenant_id: tenantId,
          ...updateData,
        });
      }
    }
  },

  /**
   * Actualiza el nombre del perfil del usuario
   */
  async updateUserProfile(userId: string, fullName: string): Promise<void> {
    const { error } = await supabase
      .from("user_profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", userId);

    if (error) {
      throw new Error(`Error al actualizar perfil de usuario: ${error.message}`);
    }
  },

  /**
   * Cambia la contraseña del usuario conectado
   */
  async changePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(`Error al cambiar contraseña: ${error.message}`);
    }
  },
};
