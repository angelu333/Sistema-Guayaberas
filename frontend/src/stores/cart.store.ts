import { create } from "zustand";
import type { CartItem, ProductVariant } from "@/types/domain.types";

interface CartStore {
  items: CartItem[];
  clientId: string | null;
  clientName: string | null;
  globalDiscountPercent: number;
  notes: string;

  // Acciones
  addItem: (variant: ProductVariant, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  updateItemDiscount: (variantId: string, discountPercent: number) => void;
  setClient: (clientId: string | null, clientName: string | null) => void;
  setGlobalDiscount: (percent: number) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;

  // Calculos derivados
  subtotal: () => number;
  discountAmount: () => number;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  clientId: null,
  clientName: null,
  globalDiscountPercent: 0,
  notes: "",

  addItem: (variant, quantity = 1) => {
    set((state) => {
      const existing = state.items.find((i) => i.variantId === variant.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.variantId === variant.id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            variantId: variant.id,
            variant,
            quantity,
            unitPrice: variant.salePrice,
            discountPercent: 0,
          },
        ],
      };
    });
  },

  removeItem: (variantId) => {
    set((state) => ({
      items: state.items.filter((i) => i.variantId !== variantId),
    }));
  },

  updateQuantity: (variantId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(variantId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.variantId === variantId ? { ...i, quantity } : i
      ),
    }));
  },

  updateItemDiscount: (variantId, discountPercent) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.variantId === variantId
          ? { ...i, discountPercent: Math.min(100, Math.max(0, discountPercent)) }
          : i
      ),
    }));
  },

  setClient: (clientId, clientName) => set({ clientId, clientName }),

  setGlobalDiscount: (percent) =>
    set({ globalDiscountPercent: Math.min(100, Math.max(0, percent)) }),

  setNotes: (notes) => set({ notes }),

  clearCart: () =>
    set({
      items: [],
      clientId: null,
      clientName: null,
      globalDiscountPercent: 0,
      notes: "",
    }),

  subtotal: () => {
    const { items } = get();
    return items.reduce((acc, item) => {
      const lineTotal = item.unitPrice * item.quantity;
      const lineDiscount = lineTotal * (item.discountPercent / 100);
      return acc + (lineTotal - lineDiscount);
    }, 0);
  },

  discountAmount: () => {
    const { globalDiscountPercent } = get();
    const subtotal = get().subtotal();
    return subtotal * (globalDiscountPercent / 100);
  },

  total: () => {
    return get().subtotal() - get().discountAmount();
  },

  itemCount: () => {
    return get().items.reduce((acc, item) => acc + item.quantity, 0);
  },
}));
