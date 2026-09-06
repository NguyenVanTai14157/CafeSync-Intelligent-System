import { useNetInfo } from '@react-native-community/netinfo';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';

export function NetworkStatusBanner() {
  const network = useNetInfo();
  const isOffline = network.isConnected === false || network.isInternetReachable === false;

  if (!isOffline) return null;

  return (
    <SafeAreaView edges={['top']} pointerEvents="none" style={styles.safeArea}>
      <View accessibilityRole="alert" style={styles.banner}>
        <Text style={styles.text}>Đang offline · Hiển thị thực đơn đã lưu</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 100,
  },
  banner: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: Colors.danger,
  },
  text: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
});
