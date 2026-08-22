import { createClient } from "@/lib/supabase/client";
import type { Client, ClientType } from "@/types/domain.types";

const supabase = createClient();

export interface CreateClientParams {
  tenantId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  type?: ClientType;
  company?: string | null;
  rfc?: string | null;
  address?: string | null;
  discountPercent?: number;
  notes?: string | null;
}

export interface UpdateClientParams extends Partial<CreateClientParams> {
  id: string;
}

export interface ClientPurchaseHistoryItem {
  id: string;
  ticketNumber: string;
  total: number;
  status: string;
  createdAt: string;
  itemCount: number;
}

export const clientsService = {
  /**
   * Obtiene todos los clientes del tenant con filtros opcionales
   */
  async getClients(
    tenantId: string,
    filters?: { search?: string; type?: ClientType }
  ): Promise<Client[]> {
    let query = supabase
      .from("clientes")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (filters?.type) {
      query = query.eq("type", filters.type);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener clientes:", error);
      return [];
    }

    let clients: Client[] = (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      fullName: row.full_name,
      phone: row.phone || null,
      email: row.email || null,
      type: row.type as ClientType,
      company: row.company || null,
      rfc: row.rfc || null,
      address: row.address || null,
      discountPercent: Number(row.discount_percent || 0),
      notes: row.notes || null,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      clients = clients.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.company && c.company.toLowerCase().includes(q)) ||
          (c.rfc && c.rfc.toLowerCase().includes(q))
      );
    }

    return clients;
  },

  /**
   * Registra un nuevo cliente
   */
  async createClient(
    params: CreateClientParams
  ): Promise<{ success: boolean; client?: Client; error?: string }> {
    const {
      tenantId,
      fullName,
      phone = null,
      email = null,
      type = "regular",
      company = null,
      rfc = null,
      address = null,
      discountPercent = 0,
      notes = null,
    } = params;

    const { data, error } = await supabase
      .from("clientes")
      .insert({
        tenant_id: tenantId,
        full_name: fullName.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        type,
        company: company ? company.trim() : null,
        rfc: rfc ? rfc.trim() : null,
        address: address ? address.trim() : null,
        discount_percent: Number(discountPercent),
        notes: notes ? notes.trim() : null,
        is_active: true,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Error al crear cliente:", error);
      return { success: false, error: error?.message || "No se pudo guardar el cliente." };
    }

    const client: Client = {
      id: data.id,
      tenantId: data.tenant_id,
      fullName: data.full_name,
      phone: data.phone || null,
      email: data.email || null,
      type: data.type as ClientType,
      company: data.company || null,
      rfc: data.rfc || null,
      address: data.address || null,
      discountPercent: Number(data.discount_percent || 0),
      notes: data.notes || null,
      isActive: data.is_active,
      createdAt: data.created_at,
    };

    return { success: true, client };
  },

  /**
   * Actualiza los datos de un cliente existente
   */
  async updateClient(
    params: UpdateClientParams
  ): Promise<{ success: boolean; error?: string }> {
    const { id, tenantId, fullName, phone, email, type, company, rfc, address, discountPercent, notes } = params;

    const updatePayload: any = {};
    if (fullName !== undefined) updatePayload.full_name = fullName.trim();
    if (phone !== undefined) updatePayload.phone = phone ? phone.trim() : null;
    if (email !== undefined) updatePayload.email = email ? email.trim() : null;
    if (type !== undefined) updatePayload.type = type;
    if (company !== undefined) updatePayload.company = company ? company.trim() : null;
    if (rfc !== undefined) updatePayload.rfc = rfc ? rfc.trim() : null;
    if (address !== undefined) updatePayload.address = address ? address.trim() : null;
    if (discountPercent !== undefined) updatePayload.discount_percent = Number(discountPercent);
    if (notes !== undefined) updatePayload.notes = notes ? notes.trim() : null;

    const { error } = await supabase
      .from("clientes")
      .update(updatePayload)
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("Error al actualizar cliente:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Obtiene el historial acumulado de compras de un cliente
   */
  async getClientPurchaseHistory(
    tenantId: string,
    clientId: string
  ): Promise<ClientPurchaseHistoryItem[]> {
    const { data, error } = await supabase
      .from("ventas")
      .select(`
        id,
        ticket_number,
        total,
        status,
        created_at,
        detalle_ventas(id)
      `)
      .eq("tenant_id", tenantId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener historial de compras del cliente:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      ticketNumber: row.ticket_number,
      total: Number(row.total || 0),
      status: row.status,
      createdAt: row.created_at,
      itemCount: (row.detalle_ventas || []).length,
    }));
  },
};
