"use client";

import { X, ShieldAlert, FileText, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { AuditLogRecord } from "@/services/audit.service";

interface AuditDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  logItem: AuditLogRecord | null;
}

export function AuditDetailModal({
  isOpen,
  onClose,
  logItem,
}: AuditDetailModalProps) {
  if (!isOpen || !logItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-[#DDD9D0] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD9D0] bg-[#F8F6F1]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#EBF0EC] text-[#556B5D] rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#26302B]">Detalle de Evento de Auditoría</h2>
                <Badge variant="primary">{logItem.entity}</Badge>
              </div>
              <p className="text-xs text-[#6B7A71]">
                Acción: <span className="font-semibold text-[#26302B]">{logItem.action}</span> • {new Date(logItem.createdAt).toLocaleString("es-MX")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6B7A71] hover:text-[#26302B] hover:bg-[#E7E3DA] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Informacion del Usuario */}
          <div className="p-3 bg-[#F8F6F1] rounded-xl border border-[#E7E3DA] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#556B5D]" />
              <span className="font-semibold text-[#26302B]">{logItem.userName || "Sistema / Usuario Anónimo"}</span>
            </div>
            <span className="text-[#6B7A71] font-mono text-[11px] uppercase">{logItem.userRole || "ADMIN"}</span>
          </div>

          {/* Detalles */}
          <div>
            <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              Descripción del Evento
            </p>
            <p className="text-sm font-medium text-[#26302B] p-3 bg-white border border-[#DDD9D0] rounded-xl">
              {logItem.details}
            </p>
          </div>

          {/* Comparativa JSON (Antes vs Despues) */}
          {(logItem.oldData || logItem.newData) && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#6B7A71] uppercase tracking-wider">
                Trazabilidad de Cambios (JSON Diff)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                {/* Antes */}
                <div className="p-3 bg-[#FAEAEA]/50 border border-[#B85450]/20 rounded-xl overflow-x-auto">
                  <p className="text-[10px] font-bold text-[#B85450] uppercase tracking-wider mb-1.5 font-sans">
                    Estado Anterior (Old)
                  </p>
                  <pre className="text-[#26302B] whitespace-pre-wrap">
                    {logItem.oldData
                      ? JSON.stringify(logItem.oldData, null, 2)
                      : "Sin datos previos (Nuevo registro)"}
                  </pre>
                </div>

                {/* Despues */}
                <div className="p-3 bg-[#EBF5F0]/50 border border-[#3F7D58]/20 rounded-xl overflow-x-auto">
                  <p className="text-[10px] font-bold text-[#3F7D58] uppercase tracking-wider mb-1.5 font-sans">
                    Nuevo Estado (New)
                  </p>
                  <pre className="text-[#26302B] whitespace-pre-wrap">
                    {logItem.newData
                      ? JSON.stringify(logItem.newData, null, 2)
                      : "Registro eliminado"}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-[#DDD9D0] bg-[#F8F6F1]">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
