import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export type AuditEntity = "PRODUCTO" | "PRECIO" | "INVENTARIO" | "VENTA" | "CLIENTE" | "USUARIO";
export type AuditAction = "CREAR" | "ACTUALIZAR" | "ELIMINAR" | "AJUSTE" | "CANCELAR";

export interface AuditLogRecord {
  id: string;
  tenantId: string;
  entity: AuditEntity;
  action: AuditAction;
  recordId: string | null;
  details: string;
  oldData: any | null;
  newData: any | null;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  createdAt: string;
}

export interface LogAuditParams {
  tenantId: string;
  entity: AuditEntity;
  action: AuditAction;
  recordId?: string | null;
  details: string;
  oldData?: any;
  newData?: any;
  userId?: string | null;
}

export const auditService = {
  /**
   * Registra un evento de auditoria en la bitacora
   */
  async logEvent(params: LogAuditParams): Promise<{ success: boolean; error?: string }> {
    const {
      tenantId,
      entity,
      action,
      recordId = null,
      details,
      oldData = null,
      newData = null,
      userId = null,
    } = params;

    const { error } = await supabase.from("auditoria").insert({
      tenant_id: tenantId,
      entity,
      action,
      record_id: recordId,
      details: details.trim(),
      old_data: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
      new_data: newData ? JSON.parse(JSON.stringify(newData)) : null,
      user_id: userId,
    });

    if (error) {
      console.error("Error al registrar auditoria:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Obtiene el historial de auditoria con filtros opcionales
   */
  async getAuditLogs(
    tenantId: string,
    filters?: {
      entity?: AuditEntity | "ALL";
      action?: AuditAction | "ALL";
      search?: string;
      limit?: number;
    }
  ): Promise<AuditLogRecord[]> {
    let query = supabase
      .from("auditoria")
      .select(`
        id,
        tenant_id,
        entity,
        action,
        record_id,
        details,
        old_data,
        new_data,
        user_id,
        created_at,
        user_profiles(full_name, role)
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(filters?.limit || 100);

    if (filters?.entity && filters.entity !== "ALL") {
      query = query.eq("entity", filters.entity);
    }

    if (filters?.action && filters.action !== "ALL") {
      query = query.eq("action", filters.action);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al consultar bitacora de auditoria:", error);
      return [];
    }

    let logs: AuditLogRecord[] = (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      entity: row.entity as AuditEntity,
      action: row.action as AuditAction,
      recordId: row.record_id || null,
      details: row.details,
      oldData: row.old_data || null,
      newData: row.new_data || null,
      userId: row.user_id || null,
      userName: row.user_profiles?.full_name || null,
      userRole: row.user_profiles?.role || null,
      createdAt: row.created_at,
    }));

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.details.toLowerCase().includes(q) ||
          (l.userName && l.userName.toLowerCase().includes(q)) ||
          l.entity.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q)
      );
    }

    return logs;
  },

  /**
   * Obtiene resumen de conteos de auditoria
   */
  async getAuditMetrics(tenantId: string): Promise<{
    totalEvents: number;
    priceChangesCount: number;
    inventoryAdjustmentsCount: number;
    cancellationsCount: number;
  }> {
    const { data, error } = await supabase
      .from("auditoria")
      .select("entity, action")
      .eq("tenant_id", tenantId);

    if (error || !data) {
      return { totalEvents: 0, priceChangesCount: 0, inventoryAdjustmentsCount: 0, cancellationsCount: 0 };
    }

    let priceChangesCount = 0;
    let inventoryAdjustmentsCount = 0;
    let cancellationsCount = 0;

    data.forEach((row: any) => {
      if (row.entity === "PRECIO") priceChangesCount++;
      if (row.entity === "INVENTARIO" || row.action === "AJUSTE") inventoryAdjustmentsCount++;
      if (row.action === "CANCELAR") cancellationsCount++;
    });

    return {
      totalEvents: data.length,
      priceChangesCount,
      inventoryAdjustmentsCount,
      cancellationsCount,
    };
  },
};
