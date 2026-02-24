import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  addToCartApi,
  clearCartApi,
  getCartApi,
  removeCartItemApi,
  ServerCart,
  updateCartQuantityApi,
} from '@/services/cartService';

const CART_STORAGE_KEY = '@lakhanmajra_cart_items';

export type CartItem = {
  id: string;
  cartItemId?: string;
  name: string;
  price: number;
  unit?: string;
  image?: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  initialized: boolean;
  loading: boolean;
  hydrateLocal: () => Promise<void>;
  syncFromServer: () => Promise<void>;
  resetLocal: () => Promise<void>;
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => Promise<void>;
  increase: (id: string) => Promise<void>;
  decrease: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  total: () => number;
};

const normalizeItem = (item: any): CartItem => {
  const product = item?.product && typeof item.product === 'object' ? item.product : null;
  const productIdObj = item?.productId && typeof item.productId === 'object' ? item.productId : null;

  const imageFromProduct =
    product?.image ||
    (Array.isArray(product?.images) && product.images.length > 0 ? product.images[0] : '');

  const imageFromProductId =
    productIdObj?.image ||
    (Array.isArray(productIdObj?.images) && productIdObj.images.length > 0 ? productIdObj.images[0] : '');

  return {
    id: String(
      product?._id ||
        productIdObj?._id ||
        item?.productId ||
        item?.product ||
        item?.id ||
        ''
    ),
    cartItemId: item?._id ? String(item._id) : item?.cartItemId,
    name: item?.name || product?.name || productIdObj?.name || 'Product',
    price: Number(item?.price ?? product?.price ?? productIdObj?.price ?? 0),
    unit: item?.unit || product?.unit || productIdObj?.unit || 'piece',
    image: item?.image || imageFromProduct || imageFromProductId || '',
    quantity: Number(item?.quantity || 1),
  };
};

const mapServerCartToItems = (cart: ServerCart | null | undefined): CartItem[] => {
  if (!cart?.items || !Array.isArray(cart.items)) return [];
  return cart.items.map((row: any) => normalizeItem(row));
};

async function saveLocal(items: CartItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore local persist errors
  }
}

const useCart = create<CartState>((set, get) => ({
  items: [],
  initialized: false,
  loading: false,

  hydrateLocal: async () => {
    try {
      const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const items = Array.isArray(parsed) ? parsed.map(normalizeItem) : [];
      set({ items, initialized: true });
    } catch {
      set({ items: [], initialized: true });
    }
  },

  syncFromServer: async () => {
    try {
      set({ loading: true });
      const cart = await getCartApi();
      const items = mapServerCartToItems(cart);
      set({ items });
      await saveLocal(items);
    } catch {
      // keep local cart as fallback
    } finally {
      set({ loading: false });
    }
  },

  resetLocal: async () => {
    set({ items: [] });
    await saveLocal([]);
  },

  addItem: async (item, qty = 1) => {
    const productId = String(item.id);
    try {
      const cart = await addToCartApi(productId, qty);
      const synced = mapServerCartToItems(cart);
      set({ items: synced });
      await saveLocal(synced);
    } catch {
      // keep previous state if API fails
    }
  },

  increase: async (id: string) => {
    const productId = String(id);
    const prev = get().items;
    const row = prev.find((it) => it.id === productId);
    if (!row?.cartItemId) return;

    try {
      const updated = await updateCartQuantityApi(row.cartItemId, row.quantity + 1);
      const synced = mapServerCartToItems(updated);
      set({ items: synced });
      await saveLocal(synced);
    } catch {
      // keep previous state if API fails
    }
  },

  decrease: async (id: string) => {
    const productId = String(id);
    const prev = get().items;
    const current = prev.find((row) => row.id === productId);
    if (!current) return;

    if (current.quantity <= 1) {
      await get().remove(productId);
      return;
    }
    if (!current.cartItemId) return;

    try {
      const updated = await updateCartQuantityApi(current.cartItemId, current.quantity - 1);
      const synced = mapServerCartToItems(updated);
      set({ items: synced });
      await saveLocal(synced);
    } catch {
      // keep previous state if API fails
    }
  },

  remove: async (id: string) => {
    const productId = String(id);
    const prev = get().items;
    const row = prev.find((it) => it.id === productId);
    if (!row?.cartItemId) return;

    try {
      const updated = await removeCartItemApi(row.cartItemId);
      const synced = mapServerCartToItems(updated);
      set({ items: synced });
      await saveLocal(synced);
    } catch {
      // keep previous state if API fails
    }
  },

  clear: async () => {
    try {
      const updated = await clearCartApi();
      const synced = mapServerCartToItems(updated);
      set({ items: synced });
      await saveLocal(synced);
    } catch {
      // keep previous state if API fails
    }
  },

  total: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));

export default useCart;
