import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatePanel } from '@/components/ui/state-panel';
import { Colors } from '@/constants/colors';

export default function NotFoundScreen() {
  return <SafeAreaView style={styles.screen}><StatePanel icon="compass-outline" title="Không tìm thấy màn hình" message="Đường dẫn này không tồn tại trong CaféSync." actionLabel="Về thực đơn" onAction={() => router.replace('/')} /></SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: Colors.background } });
