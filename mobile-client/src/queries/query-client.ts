import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
      staleTime: 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const catalogPersister = createAsyncStoragePersister({
  key: 'cafesync:query-cache',
  storage: AsyncStorage,
  throttleTime: 1000,
});
