"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Eye,
  Filter,
  DollarSign,
  Boxes,
  XCircle,
  FileText,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  auditService,
  type AuditLogRecord,
  type AuditEntity,
  type AuditAction,
} from "@/services/audit.service";
import { AuditDetailModal } from "@/components/auditoria/AuditDetailModal";

export default function AuditoriaPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<AuditEntity | "ALL">("ALL");
  const [selectedAction, setSelectedAction] = useState<AuditAction | "ALL">("ALL");

  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    priceChangesCount: 0,
    inventoryAdjustmentsCount: 0,
    cancellationsCount: 0,
  });

  const loadData = useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoading(true);
    const [logData, metricData] = await Promise.all([
      auditService.getAuditLogs(effectiveTenantId, {
        entity: selectedEntity,
        action: selectedAction,
        search: searchQuery,
        limit: 100,
      }),
      auditService.getAuditMetrics(effectiveTenantId),
    ]);
    setLogs(logData);
    setMetrics(metricData);
    setLoading(false);
  }, [effectiveTenantId, selectedEntity, selectedAction, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const entityBadge = (entity: AuditEntity) => {
    switch (entity) {
      case "PRODUCTO":
        return <Badge variant="primary">Producto</Badge>;
      case "PRECIO":
        return <Badge variant="warning">Precio</Badge>;
      case "INVENTARIO":
        return <Badge variant="secondary">Inventario</Badge>;
      case "VENTA":
        return <Badge variant="success">Venta</Badge>;
      case "CLIENTE":
        return <Badge variant="neutral">Cliente</Badge>;
      default:
        return <Badge variant="neutral">{entity}</Badge>;
    }
  };

  const actionBadge = (action: AuditAction) => {
    switch (action) {
      case "CREAR":
        return <Badge variant="success">Crear</Badge>;
      case "ACTUALIZAR":
        return <Badge variant="primary">Modificar</Badge>;
      case "ELIMINAR":
        return <Badge variant="error">Eliminar</Badge>;
      case "AJUSTE":
        return <Badge variant="warning">Ajuste</Badge>;
      case "CANCELAR":
        return <Badge variant="error">Cancelar</Badge>;
      default:
        return <Badge variant="neutral">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26302B] tracking-tight">
            Bitácora de Auditoría e Historial
          </h1>
          <p className="text-sm text-[#6B7A71] mt-0.5">
            Registro de trazabilidad y operaciones sensibles del negocio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} title="Actualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar Bitácora
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-[#556B5D]">
          <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
            Total Eventos
          </p>
          <p className="text-2xl font-bold text-[#26302B] mt-1">
            {loading ? "..." : metrics.totalEvents}
          </p>
          <p className="text-xs text-[#8FA393] mt-0.5">Bitácora registrada</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#C49A5A]">
          <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
            Cambios de Precio
          </p>
          <p className="text-2xl font-bold text-[#C49A5A] mt-1">
            {loading ? "..." : metrics.priceChangesCount}
          </p>
          <p className="text-xs text-[#6B7A71] mt-0.5">Modificaciones de costo/venta</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#8FA393]">
          <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
            Ajustes de Inventario
          </p>
          <p className="text-2xl font-bold text-[#26302B] mt-1">
            {loading ? "..." : metrics.inventoryAdjustmentsCount}
          </p>
          <p className="text-xs text-[#6B7A71] mt-0.5">Movimientos físicos</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#B85450]">
          <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
            Cancelaciones
          </p>
          <p className="text-2xl font-bold text-[#B85450] mt-1">
            {loading ? "..." : metrics.cancellationsCount}
          </p>
          <p className="text-xs text-[#6B7A71] mt-0.5">Ventas o registros anulados</p>
        </Card>
      </div>

      {/* Tabla de Auditoría */}
      <Card className="overflow-hidden">
        {/* Buscador y Filtros */}
        <div className="p-4 border-b border-[#DDD9D0] bg-[#F8F6F1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DAAA2]" />
            <input
              type="text"
              placeholder="Buscar por evento, usuario o palabra clave..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#DDD9D0] rounded-lg focus:outline-none focus:border-[#556B5D]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Entidad */}
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-white border border-[#DDD9D0] rounded-lg text-[#26302B] focus:outline-none focus:border-[#556B5D]"
            >
              <option value="ALL">Todas las Entidades</option>
              <option value="PRODUCTO">Productos</option>
              <option value="PRECIO">Precios</option>
              <option value="INVENTARIO">Inventario</option>
              <option value="VENTA">Ventas</option>
              <option value="CLIENTE">Clientes</option>
              <option value="USUARIO">Usuarios</option>
            </select>

            {/* Filtro Acción */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-white border border-[#DDD9D0] rounded-lg text-[#26302B] focus:outline-none focus:border-[#556B5D]"
            >
              <option value="ALL">Todas las Acciones</option>
              <option value="CREAR">Creaciones</option>
              <option value="ACTUALIZAR">Modificaciones</option>
              <option value="AJUSTE">Ajustes</option>
              <option value="CANCELAR">Cancelaciones</option>
              <option value="ELIMINAR">Eliminaciones</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DDD9D0] bg-[#F8F6F1] text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Entidad</th>
                <th className="py-3 px-4 text-center">Acción</th>
                <th className="py-3 px-4">Detalle del Evento</th>
                <th className="py-3 px-4">Usuario Responsable</th>
                <th className="py-3 px-4 text-right">Inspeccionar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD9D0] text-sm text-[#26302B]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6B7A71]">
                    Cargando bitácora de auditoría...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7A71]">
                    <ShieldAlert className="w-10 h-10 text-[#DDD9D0] mx-auto mb-2" />
                    <p className="font-medium">No se encontraron eventos registrados.</p>
                    <p className="text-xs text-[#9DAAA2] mt-1">
                      Las acciones importantes del sistema aparecerán aquí automáticamente.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-[#6B7A71]">
                      {new Date(log.createdAt).toLocaleString("es-MX", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="py-3 px-4">{entityBadge(log.entity)}</td>
                    <td className="py-3 px-4 text-center">{actionBadge(log.action)}</td>
                    <td className="py-3 px-4 text-xs font-medium text-[#26302B] max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#6B7A71]">
                      {log.userName || "Sistema"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-[#556B5D] hover:bg-[#EBF0EC] rounded-lg transition-colors"
                        title="Ver comparativa JSON antes/después"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Detalle */}
      <AuditDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        logItem={selectedLog}
      />
    </div>
  );
}
