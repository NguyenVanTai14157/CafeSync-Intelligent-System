import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { NetworkStatusBanner } from '@/components/network-status-banner';
import { Colors } from '@/constants/colors';
import { AuthProvider } from '@/contexts/auth-context';
import { CommerceProvider } from '@/contexts/commerce-context';
import { RealtimeProvider } from '@/contexts/realtime-context';
import { AppQueryProvider } from '@/providers/app-query-provider';

export default function RootLayout() {
  return (
    <AppQueryProvider>
      <RealtimeProvider>
        <AuthProvider>
          <CommerceProvider>
            <View style={styles.root}>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="product/[id]" />
                <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
                <Stack.Screen name="checkout" />
                <Stack.Screen name="order/[id]" />
                <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
              </Stack>
              <NetworkStatusBanner />
            </View>
          </CommerceProvider>
        </AuthProvider>
      </RealtimeProvider>
    </AppQueryProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
