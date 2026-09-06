import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getJson, setJson, StorageKeys } from '@/storage/storage';
import type { CartItem } from '@/types/commerce';
import type { Product } from '@/types/product';

type NewCartItem = Omit<CartItem, 'cartKey'>;

type CommerceContextValue = {
  cart: CartItem[];
  favorites: Product[];
  lastOrderId: string | null;
  tableNumber: number | null;
  isHydrated: boolean;
  cartCount: number;
  cartTotal: number;
  addToCart: (item: NewCartItem) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  removeFromCart: (cartKey: string) => void;
  clearCart: () => void;
  toggleFavorite: (product: Product) => void;
  isFavorite: (productId: string) => boolean;
  setLastOrderId: (orderId: string | null) => void;
  setTableNumber: (table: number | null) => void;
};

const CommerceContext = createContext<CommerceContextValue | null>(null);

function createCartKey(item: NewCartItem) {
  return [item.productId, item.options.size, item.options.sugar, item.options.ice,
    [...item.options.toppings].sort().join(','), item.note?.trim() || ''].join('|');
}

export function CommerceProvider({ children }: PropsWithChildren) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [lastOrderIdState, setLastOrderIdState] = useState<string | null>(null);
  const [tableNumberState, setTableNumberState] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    Promise.all([
      getJson<CartItem[]>(StorageKeys.cart, []),
      getJson<Product[]>(StorageKeys.favorites, []),
      AsyncStorage.getItem(StorageKeys.lastOrderId),
      AsyncStorage.getItem(StorageKeys.tableNumber),
    ]).then(([storedCart, storedFavorites, orderId, table]) => {
      setCart(storedCart);
      setFavorites(storedFavorites);
      setLastOrderIdState(orderId);
      setTableNumberState(table ? Number(table) : null);
    }).finally(() => setIsHydrated(true));
  }, []);

  const persistCart = useCallback((updater: (current: CartItem[]) => CartItem[]) => {
    setCart((current) => {
      const next = updater(current);
      void setJson(StorageKeys.cart, next);
      return next;
    });
  }, []);

  const addToCart = useCallback((item: NewCartItem) => {
    const cartKey = createCartKey(item);
    persistCart((current) => {
      const existing = current.find((entry) => entry.cartKey === cartKey);
      if (!existing) return [...current, { ...item, cartKey }];
      return current.map((entry) => entry.cartKey === cartKey
        ? { ...entry, quantity: entry.quantity + item.quantity }
        : entry);
    });
  }, [persistCart]);

  const updateQuantity = useCallback((cartKey: string, quantity: number) => {
    if (quantity < 1) {
      persistCart((current) => current.filter((item) => item.cartKey !== cartKey));
      return;
    }
    persistCart((current) => current.map((item) => item.cartKey === cartKey ? { ...item, quantity } : item));
  }, [persistCart]);

  const removeFromCart = useCallback((cartKey: string) => {
    persistCart((current) => current.filter((item) => item.cartKey !== cartKey));
  }, [persistCart]);

  const clearCart = useCallback(() => persistCart(() => []), [persistCart]);

  const toggleFavorite = useCallback((product: Product) => {
    setFavorites((current) => {
      const exists = current.some((item) => item._id === product._id);
      const next = exists ? current.filter((item) => item._id !== product._id) : [...current, product];
      void setJson(StorageKeys.favorites, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((productId: string) => favorites.some((item) => item._id === productId), [favorites]);

  const setLastOrderId = useCallback((orderId: string | null) => {
    setLastOrderIdState(orderId);
    if (orderId) void AsyncStorage.setItem(StorageKeys.lastOrderId, orderId);
    else void AsyncStorage.removeItem(StorageKeys.lastOrderId);
  }, []);

  const setTableNumber = useCallback((table: number | null) => {
    setTableNumberState(table);
    if (table) void AsyncStorage.setItem(StorageKeys.tableNumber, String(table));
    else void AsyncStorage.removeItem(StorageKeys.tableNumber);
  }, []);

  const value = useMemo<CommerceContextValue>(() => ({
    cart,
    favorites,
    lastOrderId: lastOrderIdState,
    tableNumber: tableNumberState,
    isHydrated,
    cartCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    cartTotal: cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    toggleFavorite,
    isFavorite,
    setLastOrderId,
    setTableNumber,
  }), [addToCart, cart, clearCart, favorites, isFavorite, isHydrated, lastOrderIdState,
    removeFromCart, setLastOrderId, setTableNumber, tableNumberState, toggleFavorite, updateQuantity]);

  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

export function useCommerce() {
  const context = useContext(CommerceContext);
  if (!context) throw new Error('useCommerce must be used inside CommerceProvider');
  return context;
}

