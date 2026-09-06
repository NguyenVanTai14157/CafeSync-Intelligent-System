import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { StorageKeys } from '@/storage/storage';

const TOKEN_KEY = 'cafesync.auth-token';

export async function getSessionToken() {
  if (Platform.OS === 'web') return AsyncStorage.getItem(StorageKeys.webToken);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveSessionToken(token: string) {
  if (Platform.OS === 'web') return AsyncStorage.setItem(StorageKeys.webToken, token);
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeSessionToken() {
  if (Platform.OS === 'web') return AsyncStorage.removeItem(StorageKeys.webToken);
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

