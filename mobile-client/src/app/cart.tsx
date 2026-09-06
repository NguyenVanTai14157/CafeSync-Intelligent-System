import { router } from 'expo-router';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CartItemRow } from '@/components/cart-item-row';
import { AppButton } from '@/components/ui/app-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatePanel } from '@/components/ui/state-panel';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { useCommerce } from '@/contexts/commerce-context';
import { formatCurrency } from '@/utils/format';

export default function CartScreen() {
  const { cart, cartCount, cartTotal, updateQuantity, removeFromCart } = useCommerce();

  const confirmRemove = (cartKey: string, name: string) => Alert.alert('Xóa món?', `Bạn muốn bỏ ${name} khỏi giỏ hàng?`, [
    { text: 'Giữ lại', style: 'cancel' },
    { text: 'Xóa', style: 'destructive', onPress: () => removeFromCart(cartKey) },
  ]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}><ScreenHeader title="Giỏ hàng" subtitle={`${cartCount} sản phẩm`} back /></View>
      <FlatList
        data={cart}
        keyExtractor={(item) => item.cartKey}
        contentContainerStyle={[styles.list, !cart.length && styles.emptyList]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <CartItemRow item={item} onIncrease={() => updateQuantity(item.cartKey, item.quantity + 1)} onDecrease={() => updateQuantity(item.cartKey, item.quantity - 1)} onRemove={() => confirmRemove(item.cartKey, item.name)} />}
        ListEmptyComponent={<StatePanel icon="bag-handle-outline" title="Giỏ hàng đang trống" message="Chọn món từ thực đơn để bắt đầu đơn hàng." actionLabel="Chọn món" onAction={() => router.dismissTo('/')} />}
      />
      {cart.length ? (
        <View style={styles.footer}>
          <View><Text style={styles.totalLabel}>TỔNG TẠM TÍNH</Text><Text style={styles.total}>{formatCurrency(cartTotal)}</Text></View>
          <AppButton label="Thanh toán" icon="arrow-forward" onPress={() => router.replace('/checkout')} style={styles.checkoutButton} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Layout.screenPadding },
  list: { padding: Layout.screenPadding, paddingBottom: 115 },
  emptyList: { flexGrow: 1 },
  separator: { height: 10 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  totalLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '900' },
  total: { color: Colors.coffee, fontSize: 19, fontWeight: '900', marginTop: 3 },
  checkoutButton: { flex: 1 },
});
