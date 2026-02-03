import { create } from 'zustand';

export type CartItem = {
  id: number;
  name: string;
  price: number;
  unit?: string;
  image?: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  increase: (id: number) => void;
  decrease: (id: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  total: () => number;
};

const useCart = create<CartState>((set, get) => ({ 
  items: [],
  addItem: (item, qty = 1) =>
    set((state) => {
      const exists = state.items.find((i) => i.id === item.id);
      if (exists) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + qty } : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: qty }] };
    }),
  increase: (id: number) =>
    set((state: any) => ({
      items: state.items.map((i: any) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i)),
    })),

  decrease: (id: number) =>
    set((state: any) => ({
      items: state.items
        .map((i: any) => (i.id === id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))
        .filter((i: any) => i.quantity > 0),
    })),

  remove: (id: number) => set((state: any) => ({ items: state.items.filter((i: any) => i.id !== id) })),

  clear: () => set({ items: [] }),
  total: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
}));

export default useCart;
