import { createClient } from "@/lib/supabase/client";
import type { Location } from "@/types/domain.types";

const supabase = createClient();

export interface CreateLocationDTO {
  name: string;
  description?: string;
  phone?: string;
  address?: string;
}

export interface UpdateLocationDTO {
  name?: string;
  description?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}

export interface LocationDetail extends Location {
  phone: string | null;
  address: string | null;
  totalVariants?: number;
  totalStock?: number;
}

export const locationsService = {
  /**
   * Obtiene todas las sucursales del tenant con sus totales de stock.
   */
  async getLocations(tenantId: string): Promise<LocationDetail[]> {
    const { data, error } = await supabase
      .from("ubicaciones")
      .select("id, tenant_id, name, description, phone, address, is_active, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Error al obtener sucursales: ${error.message}`);
    }

    const locations = (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description || null,
      phone: row.phone || null,
      address: row.address || null,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));

    // Obtener stock total por ubicación
    if (locations.length > 0) {
      const locationIds = locations.map((l: any) => l.id);
      const { data: stockData } = await supabase
        .from("existencias")
        .select("location_id, quantity")
        .in("location_id", locationIds);

      if (stockData) {
        const stockMap = new Map<string, number>();
        stockData.forEach((s: any) => {
          stockMap.set(s.location_id, (stockMap.get(s.location_id) || 0) + s.quantity);
        });

        return locations.map((loc: any) => ({
          ...loc,
          totalStock: stockMap.get(loc.id) || 0,
        }));
      }
    }

    return locations;
  },

  /**
   * Crea una nueva sucursal/ubicación para el tenant.
   */
  async createLocation(tenantId: string, dto: CreateLocationDTO): Promise<LocationDetail> {
    const { data, error } = await supabase
      .from("ubicaciones")
      .insert({
        tenant_id: tenantId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear la sucursal: ${error.message}`);
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      description: data.description || null,
      phone: data.phone || null,
      address: data.address || null,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  },

  /**
   * Actualiza los datos de una sucursal existente.
   */
  async updateLocation(locationId: string, dto: UpdateLocationDTO): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.description !== undefined) updateData.description = dto.description?.trim() || null;
    if (dto.phone !== undefined) updateData.phone = dto.phone?.trim() || null;
    if (dto.address !== undefined) updateData.address = dto.address?.trim() || null;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const { error } = await supabase
      .from("ubicaciones")
      .update(updateData)
      .eq("id", locationId);

    if (error) {
      throw new Error(`Error al actualizar sucursal: ${error.message}`);
    }
  },

  /**
   * Desactiva una sucursal (no se elimina para preservar historial de ventas).
   */
  async deactivateLocation(locationId: string): Promise<void> {
    const { error } = await supabase
      .from("ubicaciones")
      .update({ is_active: false })
      .eq("id", locationId);

    if (error) {
      throw new Error(`Error al desactivar sucursal: ${error.message}`);
    }
  },
};
