"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  itemLabel?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className = "",
  itemLabel = "registros",
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generar lista de páginas a mostrar
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={`p-3 bg-[#F8F6F1] border-t border-[#DDD9D0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6B7A71] ${className}`}
    >
      {/* Información de rango y selector de tamaño */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span>
          Mostrando <strong className="text-[#26302B] font-bold">{startItem}</strong>–
          <strong className="text-[#26302B] font-bold">{endItem}</strong> de{" "}
          <strong className="text-[#26302B] font-bold">{totalItems}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-[#DDD9D0]">
            <span className="hidden md:inline">Ver:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-white border border-[#DDD9D0] rounded-lg px-2 py-1 text-xs font-semibold text-[#26302B] focus:outline-none focus:ring-1 focus:ring-[#556B5D] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / pág
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controles de navegación */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Botón Anterior */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 font-medium transition-all ${
              currentPage <= 1
                ? "border-transparent text-[#9DAAA2] cursor-not-allowed opacity-50"
                : "border-[#DDD9D0] bg-white text-[#26302B] hover:bg-[#F0EDE6] hover:border-[#556B5D] cursor-pointer shadow-xs"
            }`}
            title="Página anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Números de página */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) =>
              p === "..." ? (
                <span key={`dots-${idx}`} className="px-1.5 py-1 text-[#9DAAA2]">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange(Number(p))}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                    currentPage === p
                      ? "bg-[#556B5D] text-white shadow-xs"
                      : "bg-white border border-[#DDD9D0] text-[#26302B] hover:bg-[#F0EDE6] hover:border-[#556B5D]"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          {/* Botón Siguiente */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 font-medium transition-all ${
              currentPage >= totalPages
                ? "border-transparent text-[#9DAAA2] cursor-not-allowed opacity-50"
                : "border-[#DDD9D0] bg-white text-[#26302B] hover:bg-[#F0EDE6] hover:border-[#556B5D] cursor-pointer shadow-xs"
            }`}
            title="Página siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
