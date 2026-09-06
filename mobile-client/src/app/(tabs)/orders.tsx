import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrderCard } from '@/components/order-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatePanel } from '@/components/ui/state-panel';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { useAuth } from '@/contexts/auth-context';
import { useCommerce } from '@/contexts/commerce-context';
import { useOrders } from '@/hooks/use-orders';
import { getApiErrorMessage } from '@/services/api';
import type { Order } from '@/types/commerce';

export default function OrdersScreen() {
  const { user } = useAuth();
  const email = user?.email;
  const { lastOrderId, setLastOrderId } = useCommerce();
  const ordersQuery = useOrders(email, lastOrderId);
  const orders = ordersQuery.data ?? [];
  const loading = Boolean(email || lastOrderId) && ordersQuery.isPending;
  const error = ordersQuery.error
    ? getApiErrorMessage(ordersQuery.error, 'Không thể tải đơn hàng.')
    : null;

  const openOrder = (order: Order) => {
    setLastOrderId(order._id);
    router.push({ pathname: '/order/[id]', params: { id: order._id } });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <OrderCard order={item} onPress={() => openOrder(item)} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.header}><ScreenHeader title="Đơn hàng" subtitle={user ? `Lịch sử của ${user.name}` : 'Đơn gần nhất trên thiết bị'} /></View>}
        ListEmptyComponent={loading
          ? <StatePanel loading title="Đang tải đơn hàng" />
          : error
            ? <StatePanel title="Chưa tải được đơn hàng" message={error} actionLabel="Thử lại" onAction={() => void ordersQuery.refetch()} />
            : <StatePanel icon="receipt-outline" title="Chưa có đơn hàng" message={user ? 'Đơn đã đặt sẽ xuất hiện tại đây.' : 'Đăng nhập để xem lịch sử trên mọi thiết bị.'} actionLabel={user ? 'Đặt món' : 'Đăng nhập'} onAction={() => router.push(user ? '/' : '/auth')} />}
        refreshControl={<RefreshControl refreshing={ordersQuery.isRefetching} onRefresh={() => void ordersQuery.refetch()} colors={[Colors.primary]} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, padding: Layout.screenPadding, paddingBottom: 28 },
  header: { marginBottom: 16 },
  separator: { height: 10 },
});
