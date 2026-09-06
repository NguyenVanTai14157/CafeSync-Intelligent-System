import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatePanel } from '@/components/ui/state-panel';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { useRealtime } from '@/contexts/realtime-context';
import { useOrder } from '@/hooks/use-orders';
import { getApiErrorMessage } from '@/services/api';
import { formatCurrency, formatDate } from '@/utils/format';

const completedStatuses = ['Hoàn thành', 'Đã xong'];
const preparingStatuses = ['Đang pha chế', 'Pha chế'];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isConnected } = useRealtime();
  const orderQuery = useOrder(id);
  const order = orderQuery.data;
  const error = orderQuery.error
    ? getApiErrorMessage(orderQuery.error, 'Không thể cập nhật đơn hàng.')
    : null;

  if (orderQuery.isPending && !order) return <SafeAreaView style={styles.screen}><StatePanel loading title="Đang tải đơn hàng" /></SafeAreaView>;
  if (!order) return <SafeAreaView style={styles.screen}><StatePanel title="Không mở được đơn" message={error || 'Đơn hàng không tồn tại.'} actionLabel="Về đơn hàng" onAction={() => router.replace('/orders')} /></SafeAreaView>;

  const complete = completedStatuses.includes(order.status);
  const preparing = preparingStatuses.includes(order.status) || complete;
  const cancelled = ['Đã hủy', 'Cancelled'].includes(order.status);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={orderQuery.isRefetching} onRefresh={() => void orderQuery.refetch()} colors={[Colors.primary]} />}>
        <ScreenHeader title="Theo dõi đơn" subtitle={`#${order.orderID}`} back />

        <View style={[styles.statusPanel, cancelled && styles.cancelledPanel]}>
          <View style={styles.statusIcon}><Ionicons name={cancelled ? 'close-circle' : complete ? 'checkmark-circle' : 'time'} size={31} color={cancelled ? Colors.danger : complete ? Colors.success : Colors.accent} /></View>
          <View style={styles.flex}>
            <Text style={styles.status}>{order.status}</Text>
            <Text style={styles.statusHelp}>{cancelled
              ? 'Đơn hàng đã được hủy.'
              : complete
                ? 'Món của bạn đã sẵn sàng.'
                : isConnected
                  ? 'Đang nhận trạng thái trực tiếp từ quầy.'
                  : 'Đang kết nối lại; ứng dụng vẫn đồng bộ định kỳ.'}</Text>
          </View>
        </View>

        {!cancelled ? (
          <View style={styles.progress}>
            <ProgressStep active label="Đã nhận" icon="receipt-outline" />
            <View style={[styles.progressLine, preparing && styles.progressLineActive]} />
            <ProgressStep active={preparing} label="Pha chế" icon="cafe-outline" />
            <View style={[styles.progressLine, complete && styles.progressLineActive]} />
            <ProgressStep active={complete} label="Hoàn thành" icon="checkmark-outline" />
          </View>
        ) : null}

        <View style={styles.metaPanel}>
          <MetaRow icon="calendar-outline" label="Thời gian" value={formatDate(order.createdAt)} />
          <MetaRow icon="location-outline" label="Nhận món" value={order.location} />
          <MetaRow icon="wallet-outline" label="Thanh toán" value={order.paymentMethod} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Các món đã đặt</Text>
          <View style={styles.items}>
            {order.items.map((item, index) => (
              <View key={item._id || `${item.name}-${index}`} style={styles.itemRow}>
                <View style={styles.quantityBox}><Text style={styles.quantity}>{item.quantity}×</Text></View>
                <View style={styles.itemCopy}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemOptions}>Size {item.options?.size || 'M'} · {item.options?.sugar || '100%'} đường · {item.options?.ice || '100%'} đá{item.options?.toppings?.length ? ` · ${item.options.toppings.join(', ')}` : ''}</Text>{item.note ? <Text style={styles.note}>“{item.note}”</Text> : null}</View>
                <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Tổng cộng</Text><Text style={styles.total}>{formatCurrency(order.totalPrice)}</Text></View>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton label="Tiếp tục chọn món" icon="cafe-outline" onPress={() => router.dismissTo('/')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressStep({ active, label, icon }: { active: boolean; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return <View style={styles.step}><View style={[styles.stepIcon, active && styles.stepIconActive]}><Ionicons name={icon} size={20} color={active ? Colors.surface : Colors.textMuted} /></View><Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text></View>;
}

function MetaRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.metaRow}><Ionicons name={icon} size={19} color={Colors.primary} /><Text style={styles.metaLabel}>{label}</Text><Text style={styles.metaValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Layout.screenPadding, paddingBottom: 30, gap: 18 },
  statusPanel: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: Colors.warningSurface, borderRadius: Layout.radius, borderWidth: 1, borderColor: '#E8D3A2' },
  cancelledPanel: { backgroundColor: '#FCECEC', borderColor: '#EBC5C5' },
  statusIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  status: { color: Colors.text, fontSize: 17, fontWeight: '900' },
  statusHelp: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  progress: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  step: { width: 78, alignItems: 'center', gap: 6 },
  stepIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceMuted, borderWidth: 1, borderColor: Colors.border },
  stepIconActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700' },
  stepLabelActive: { color: Colors.primary },
  progressLine: { flex: 1, height: 3, marginTop: -16, backgroundColor: Colors.border },
  progressLineActive: { backgroundColor: Colors.primary },
  metaPanel: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Layout.radius, overflow: 'hidden' },
  metaRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  metaLabel: { color: Colors.textMuted, fontSize: 12 },
  metaValue: { flex: 1, color: Colors.text, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  section: { gap: 10 },
  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '900' },
  items: { backgroundColor: Colors.surface, borderRadius: Layout.radius, borderWidth: 1, borderColor: Colors.border, padding: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  quantityBox: { minWidth: 30, height: 28, borderRadius: 6, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  quantity: { color: Colors.primary, fontSize: 11, fontWeight: '900' },
  itemCopy: { flex: 1, minWidth: 0 },
  itemName: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  itemOptions: { color: Colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  note: { color: Colors.coffee, fontSize: 10, fontStyle: 'italic', marginTop: 3 },
  itemPrice: { color: Colors.text, fontSize: 12, fontWeight: '800' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14 },
  totalLabel: { color: Colors.text, fontSize: 15, fontWeight: '900' },
  total: { color: Colors.coffee, fontSize: 18, fontWeight: '900' },
  error: { color: Colors.danger, fontSize: 12, textAlign: 'center' },
});
