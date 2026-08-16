// Key-value persistence that routes to localStorage on web and SecureStore on native.
// Platform check plus the secure key-value store for native builds.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Storage facade with catch-and-ignore semantics when a backend is unavailable.
export const storage = {
  // Read a value, falling back to null on web and when SecureStore is missing.
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        return await SecureStore.getItemAsync(key);
      }
    } catch {}
    return null;
  },

  // Persist a value on the active backend.
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch {}
      return;
    }
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.setItemAsync(key, value);
      }
    } catch {}
  },

  // Remove a stored value from the active backend.
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch {}
      return;
    }
    try {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {}
  },
};
