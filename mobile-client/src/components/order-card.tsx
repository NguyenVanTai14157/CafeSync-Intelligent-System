import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import type { Order } from '@/types/commerce';
import { formatCurrency, formatDate } from '@/utils/format';

export function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const complete = ['Hoàn thành', 'Đã xong'].includes(order.status);
  const cancelled = ['Đã hủy', 'Cancelled'].includes(order.status);
  const statusColor = cancelled ? Colors.danger : complete ? Colors.success : Colors.accent;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.orderId}>#{order.orderID}</Text>
          <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.badge, { borderColor: statusColor }]}><Text style={[styles.badgeText, { color: statusColor }]}>{order.status}</Text></View>
      </View>
      <View style={styles.footer}>
        <View style={styles.meta}><Ionicons name="bag-handle-outline" size={16} color={Colors.textMuted} /><Text style={styles.metaText}>{order.items.length} món · {order.location}</Text></View>
        <Text style={styles.total}>{formatCurrency(order.totalPrice)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Layout.radius, padding: 14, gap: 15 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  flex: { flex: 1 },
  orderId: { color: Colors.text, fontSize: 15, fontWeight: '800' },
  date: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },
  badge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  meta: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { flex: 1, color: Colors.textMuted, fontSize: 12 },
  total: { color: Colors.coffee, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.78 },
});
