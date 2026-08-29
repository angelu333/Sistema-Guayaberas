"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  productName?: string;
}

export function ImageZoomModal({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  productName = "Detalle de Prenda",
}: ImageZoomModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sincronizar índice inicial al abrir
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  // Manejar teclado (Escape, Flechas)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
      if (e.key === "0") handleResetZoom();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleNext = () => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
    handleResetZoom();
  };

  const handlePrev = () => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    handleResetZoom();
  };

  // Doble toque / Doble clic para zoom rápido en móviles
  const handleDoubleTap = (clientX: number, clientY: number) => {
    if (scale > 1) {
      handleResetZoom();
    } else {
      setScale(2.5);
      // Centrar zoom hacia el punto donde se hizo el toque
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = (clientX - (rect.left + rect.width / 2)) * -1.2;
        const offsetY = (clientY - (rect.top + rect.height / 2)) * -1.2;
        setPosition({ x: offsetX, y: offsetY });
      }
    }
  };

  // Eventos de Mouse Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Eventos Táctiles (Móviles / Tablets)
  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    const touch = e.touches[0];

    // Detectar doble toque rápido (< 300ms)
    if (now - lastTap < 300 && touch) {
      handleDoubleTap(touch.clientX, touch.clientY);
      setLastTap(0);
      return;
    }
    setLastTap(now);

    if (scale > 1 && touch) {
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1 || e.touches.length === 0) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Zoom con rueda del mouse
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  if (!isOpen || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex flex-col items-center justify-between font-[Outfit] select-none"
      style={{
        backgroundColor: "rgba(18, 24, 21, 0.96)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BARRA SUPERIOR (HEADER DEL VISOR)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="w-full flex items-center justify-between px-4 py-3 sm:px-6 z-20 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#C49A5A] animate-pulse" />
          <span className="text-white text-xs sm:text-sm font-bold tracking-tight truncate max-w-[200px] sm:max-w-md">
            {productName}
          </span>
          {images.length > 1 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-[#C49A5A] ml-2">
              {currentIndex + 1} de {images.length}
            </span>
          )}
        </div>

        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all shadow-lg cursor-pointer"
          title="Cerrar visor"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ÁREA CENTRAL INTERACTIVA DE IMAGEN CON ZOOM & PAN
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className={`relative flex-1 w-full flex items-center justify-center overflow-hidden ${
          scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        }`}
        onClick={(e) => {
          // Si hace clic simple y no está haciendo drag
          if (scale === 1 && !isDragging) {
            handleDoubleTap(e.clientX, e.clientY);
          }
        }}
      >
        <div
          className="transition-transform duration-150 ease-out will-change-transform max-w-full max-h-full flex items-center justify-center"
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
          }}
        >
          <img
            src={images[currentIndex]}
            alt={productName}
            className="max-h-[82vh] max-w-[95vw] object-contain select-none pointer-events-none rounded-lg shadow-2xl"
            draggable={false}
          />
        </div>

        {/* Flecha Izquierda */}
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-black/50 text-white hover:bg-black/80 active:scale-90 transition-all border border-white/20 shadow-xl cursor-pointer z-10"
            title="Foto anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Flecha Derecha */}
        {images.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-black/50 text-white hover:bg-black/80 active:scale-90 transition-all border border-white/20 shadow-xl cursor-pointer z-10"
            title="Foto siguiente"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BARRA INFERIOR DE CONTROLES FLOTANTES Y MINIATURAS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="w-full flex flex-col items-center gap-2 pb-5 pt-2 px-4 z-20 bg-gradient-to-t from-black/80 to-transparent">
        {/* Controles de Zoom */}
        <div
          className="flex items-center gap-1.5 p-1.5 rounded-full border shadow-2xl backdrop-blur-md"
          style={{
            backgroundColor: "rgba(38, 48, 43, 0.85)",
            borderColor: "rgba(196, 154, 90, 0.4)",
          }}
        >
          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="p-2 rounded-full text-white hover:bg-white/15 disabled:opacity-30 active:scale-95 transition-all cursor-pointer"
            title="Alejar (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="px-2.5 text-xs font-bold text-[#F5EFE3] min-w-[52px] text-center">
            {Math.round(scale * 100)}%
          </div>

          <button
            onClick={handleZoomIn}
            disabled={scale >= 4}
            className="p-2 rounded-full text-white hover:bg-white/15 disabled:opacity-30 active:scale-95 transition-all cursor-pointer"
            title="Acercar (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-white/20 mx-0.5" />

          <button
            onClick={handleResetZoom}
            className="p-2 rounded-full text-[#C49A5A] hover:bg-white/15 active:scale-95 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold px-2.5"
            title="Restablecer vista"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restablecer</span>
          </button>
        </div>

        {/* Guía / Tip sutil */}
        <p className="text-[11px] text-white/70 font-medium flex items-center gap-1 text-center">
          <Sparkles className="w-3 h-3 text-[#C49A5A]" />
          Doble toque o arrastra para examinar cada puntada y alforza del bordado
        </p>

        {/* Miniaturas inferiores si hay varias imágenes */}
        {images.length > 1 && (
          <div className="flex items-center gap-2 mt-1 overflow-x-auto max-w-full py-1 px-2">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  handleResetZoom();
                }}
                className="w-11 h-11 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0"
                style={{
                  borderColor: currentIndex === idx ? "#C49A5A" : "rgba(255,255,255,0.3)",
                  transform: currentIndex === idx ? "scale(1.08)" : "scale(1)",
                  opacity: currentIndex === idx ? 1 : 0.6,
                }}
              >
                <img src={img} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover object-top" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
