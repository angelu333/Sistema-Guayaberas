"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  Filter,
  MessageCircle,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTenantStore } from "@/stores/tenant.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  publicCatalogService,
  type PublicFilterOptions,
} from "@/services/public-catalog.service";

export default function CatalogoLinkPage() {
  const { tenant } = useTenantStore();
  const { session } = useAuthStore();
  const effectiveTenantId = tenant?.id || session?.tenantId;

  const [filterOptions, setFilterOptions] = useState<PublicFilterOptions>({
    modelos: [],
    colores: [],
    tallas: [],
  });

  const [selectedModelo, setSelectedModelo] = useState("");
  const [selectedTalla, setSelectedTalla] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  const [copiedGeneral, setCopiedGeneral] = useState(false);
  const [copiedFiltered, setCopiedFiltered] = useState(false);

  const tenantSlug = tenant?.slug || session?.companyName?.toLowerCase().replace(/\s+/g, "-") || "tienda";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const generalUrl = `${baseUrl}/catalogo/${tenantSlug}`;

  // Construir URL filtrada
  const buildFilteredUrl = () => {
    const params = new URLSearchParams();
    if (selectedModelo) params.set("modelo", selectedModelo);
    if (selectedTalla) params.set("talla", selectedTalla);
    if (selectedColor) params.set("color", selectedColor);

    const query = params.toString();
    return query ? `${generalUrl}?${query}` : generalUrl;
  };

  const filteredUrl = buildFilteredUrl();

  const loadOptions = useCallback(async () => {
    if (!effectiveTenantId) return;
    const opts = await publicCatalogService.getPublicFilterOptions(effectiveTenantId);
    setFilterOptions(opts);
  }, [effectiveTenantId]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const handleCopyGeneral = () => {
    navigator.clipboard.writeText(generalUrl);
    setCopiedGeneral(true);
    setTimeout(() => setCopiedGeneral(false), 2000);
  };

  const handleCopyFiltered = () => {
    navigator.clipboard.writeText(filteredUrl);
    setCopiedFiltered(true);
    setTimeout(() => setCopiedFiltered(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#26302B] tracking-tight">
          Catálogo Público y Generador de Enlaces para WhatsApp
        </h1>
        <p className="text-sm text-[#6B7A71] mt-0.5">
          Comparte tu vitrina digital o envía enlaces filtrados por Modelo, Talla y Color a tus clientes
        </p>
      </div>

      {/* Card 1: Enlace General de la Tienda */}
      <Card padding="md" className="space-y-3 border-l-4 border-l-[#556B5D]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#556B5D]" />
            <h2 className="text-base font-bold text-[#26302B]">Enlace Público Principal de tu Tienda</h2>
          </div>
          <a
            href={generalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[#556B5D] hover:underline flex items-center gap-1"
          >
            Abrir Vista Previa <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="flex items-center gap-2 p-3 bg-[#F8F6F1] border border-[#DDD9D0] rounded-xl">
          <span className="flex-1 font-mono text-xs text-[#26302B] truncate">{generalUrl}</span>
          <Button size="sm" onClick={handleCopyGeneral}>
            {copiedGeneral ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedGeneral ? "¡Copiado!" : "Copiar Enlace"}
          </Button>
        </div>
      </Card>

      {/* Card 2: Generador de Enlace Filtrado (Modelo + Talla + Color) */}
      <Card padding="md" className="space-y-4">
        <div className="border-b border-[#DDD9D0] pb-3">
          <h2 className="text-base font-bold text-[#26302B] flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#C49A5A]" />
            Generador de Enlace Filtrado para WhatsApp
          </h2>
          <p className="text-xs text-[#6B7A71] mt-0.5">
            Selecciona el modelo, talla o color que te pida un cliente por mensaje para mandarle una liga directa
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Modelo */}
          <div>
            <label className="block text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              1. Modelo
            </label>
            <select
              value={selectedModelo}
              onChange={(e) => setSelectedModelo(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-[#F8F6F1] text-[#26302B] focus:outline-none focus:border-[#556B5D]"
            >
              <option value="">Todos los modelos</option>
              {filterOptions.modelos.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Talla */}
          <div>
            <label className="block text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              2. Talla
            </label>
            <select
              value={selectedTalla}
              onChange={(e) => setSelectedTalla(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-[#F8F6F1] text-[#26302B] focus:outline-none focus:border-[#556B5D]"
            >
              <option value="">Todas las tallas</option>
              {filterOptions.tallas.map((t) => (
                <option key={t.id} value={t.name}>
                  Talla {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-1">
              3. Color
            </label>
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#DDD9D0] rounded-xl bg-[#F8F6F1] text-[#26302B] focus:outline-none focus:border-[#556B5D]"
            >
              <option value="">Todos los colores</option>
              {filterOptions.colores.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resultado del Enlace Filtrado */}
        <div className="pt-3 border-t border-[#DDD9D0]">
          <label className="block text-xs font-semibold text-[#6B7A71] uppercase tracking-wider mb-1.5">
            Enlace Listo para Pegar en WhatsApp:
          </label>
          <div className="flex items-center gap-2 p-3 bg-[#EBF5F0] border border-[#3F7D58]/30 rounded-xl">
            <span className="flex-1 font-mono text-xs text-[#26302B] break-all">
              {filteredUrl}
            </span>
            <Button size="sm" onClick={handleCopyFiltered} className="shrink-0 bg-[#3F7D58] hover:bg-[#326446]">
              {copiedFiltered ? <Check className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
              {copiedFiltered ? "¡Copiado!" : "Copiar para WhatsApp"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
