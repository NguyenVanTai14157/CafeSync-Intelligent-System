import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  user: 'cafesync:user',
  cart: 'cafesync:cart',
  favorites: 'cafesync:favorites',
  lastOrderId: 'cafesync:last-order-id',
  tableNumber: 'cafesync:table-number',
  webToken: 'cafesync:web-token',
} as const;

export async function getJson<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function setJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

