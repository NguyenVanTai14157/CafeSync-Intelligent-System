import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { PropsWithChildren, useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { catalogPersister, queryClient } from '@/queries/query-client';

if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  }));
}

export function AppQueryProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });

    return () => subscription.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        buster: 'catalog-v1',
        maxAge: 24 * 60 * 60 * 1000,
        persister: catalogPersister,
        dehydrateOptions: {
          // Order history and personalized recommendations must not be stored unencrypted.
          shouldDehydrateQuery: (query) => query.queryKey[0] === 'catalog' && query.state.status === 'success',
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
