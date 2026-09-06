import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { useAuth } from '@/contexts/auth-context';
import { useCommerce } from '@/contexts/commerce-context';

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount, favorites, tableNumber, setTableNumber } = useCommerce();

  const confirmLogout = () => Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi CaféSync?', [
    { text: 'Ở lại', style: 'cancel' },
    { text: 'Đăng xuất', style: 'destructive', onPress: () => void logout() },
  ]);

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader title="Tài khoản" subtitle="Đăng nhập để đồng bộ lịch sử đặt món" />
          <View style={styles.guestPanel}>
            <View style={styles.avatar}><Ionicons name="person-outline" size={38} color={Colors.primary} /></View>
            <Text style={styles.guestTitle}>Bạn đang dùng chế độ khách</Text>
            <Text style={styles.guestMessage}>Giỏ hàng và yêu thích vẫn được lưu trên thiết bị này.</Text>
            <AppButton label="Đăng nhập hoặc đăng ký" icon="log-in-outline" onPress={() => router.push('/auth')} style={styles.fullButton} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const initials = user.name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Tài khoản" subtitle="Thông tin thành viên CaféSync" />
        <View style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
          <View style={styles.identityCopy}><Text style={styles.name}>{user.name}</Text><Text style={styles.email}>{user.email}</Text></View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statValue}>{cartCount}</Text><Text style={styles.statLabel}>Trong giỏ</Text></View>
          <View style={styles.divider} />
          <View style={styles.stat}><Text style={styles.statValue}>{favorites.length}</Text><Text style={styles.statLabel}>Yêu thích</Text></View>
          <View style={styles.divider} />
          <View style={styles.stat}><Text style={styles.statValue}>{tableNumber || '—'}</Text><Text style={styles.statLabel}>Bàn</Text></View>
        </View>

        <Text style={styles.sectionLabel}>TÀI KHOẢN VÀ ĐƠN HÀNG</Text>
        <View style={styles.menu}>
          <MenuRow icon="receipt-outline" label="Lịch sử đơn hàng" onPress={() => router.push('/orders')} />
          <MenuRow icon="heart-outline" label="Món đã yêu thích" onPress={() => router.push('/favorites')} />
          {tableNumber ? <MenuRow icon="location-outline" label={`Bỏ chọn bàn ${tableNumber}`} onPress={() => setTableNumber(null)} /> : null}
        </View>
        <AppButton variant="danger" label="Đăng xuất" icon="log-out-outline" onPress={confirmLogout} style={styles.fullButton} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
      <View style={styles.menuIcon}><Ionicons name={icon} size={20} color={Colors.primary} /></View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={19} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, padding: Layout.screenPadding, paddingBottom: 30, gap: 18 },
  guestPanel: { flex: 1, minHeight: 430, alignItems: 'center', justifyContent: 'center', gap: 12 },
  guestTitle: { color: Colors.text, fontSize: 19, fontWeight: '900' },
  guestMessage: { maxWidth: 300, color: Colors.textMuted, lineHeight: 21, textAlign: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.surfaceMuted, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  initials: { color: Colors.primary, fontSize: 23, fontWeight: '900' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 5 },
  identityCopy: { flex: 1, minWidth: 0 },
  name: { color: Colors.text, fontSize: 20, fontWeight: '900' },
  email: { color: Colors.textMuted, fontSize: 13, marginTop: 4 },
  stats: { minHeight: 84, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryDark, borderRadius: Layout.radius, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: Colors.surface, fontSize: 19, fontWeight: '900' },
  statLabel: { color: '#D6E6DE', fontSize: 11, fontWeight: '700' },
  divider: { width: 1, height: 38, backgroundColor: 'rgba(255,255,255,0.2)' },
  sectionLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '900' },
  menu: { backgroundColor: Colors.surface, borderRadius: Layout.radius, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  menuRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  menuIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, color: Colors.text, fontSize: 14, fontWeight: '700' },
  fullButton: { alignSelf: 'stretch' },
  pressed: { backgroundColor: Colors.surfaceMuted },
});

