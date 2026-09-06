import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { useAuth } from '@/contexts/auth-context';
import { useCommerce } from '@/contexts/commerce-context';
import { useCreateOrder } from '@/hooks/use-orders';
import { getApiErrorMessage } from '@/services/api';
import { formatCurrency } from '@/utils/format';

type PaymentMethod = 'Tiền mặt' | 'Chuyển khoản';

export default function CheckoutScreen() {
  const { user } = useAuth();
  const { cart, cartTotal, tableNumber, setTableNumber, clearCart, setLastOrderId } = useCommerce();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tiền mặt');
  const [tableInput, setTableInput] = useState(tableNumber ? String(tableNumber) : '');
  const createOrder = useCreateOrder();

  const updateTable = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 3);
    setTableInput(digits);
    setTableNumber(digits ? Number(digits) : null);
  };

  const placeOrder = async () => {
    if (!cart.length) {
      Alert.alert('Giỏ hàng trống', 'Hãy chọn món trước khi thanh toán.');
      router.replace('/cart');
      return;
    }

    try {
      const orderID = `CFS${Date.now().toString().slice(-8)}`;
      const response = await createOrder.mutateAsync({
        orderID,
        items: cart.map((item) => ({
          id_product: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.unitPrice,
          options: item.options,
          note: item.note,
        })),
        totalPrice: cartTotal,
        location: tableNumber ? `Bàn ${tableNumber}` : 'Mang đi',
        tableNumber,
        paymentMethod,
        customerEmail: user?.email || 'Guest',
        customerName: user?.name || 'Khách vãng lai',
      });

      if (response._id) setLastOrderId(response._id);

      if (paymentMethod === 'Tiền mặt') {
        clearCart();
        router.replace({ pathname: '/order/[id]', params: { id: response._id } });
        return;
      }

      if (!response.checkoutUrl) throw new Error('Máy chủ chưa trả về liên kết thanh toán.');
      await WebBrowser.openBrowserAsync(response.checkoutUrl, {
        toolbarColor: Colors.primaryDark,
        showTitle: true,
      });
      router.replace({ pathname: '/order/[id]', params: { id: response._id } });
    } catch (error) {
      Alert.alert('Chưa thể tạo đơn', getApiErrorMessage(error, 'Vui lòng thử lại sau.'));
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Thanh toán" subtitle="Kiểm tra trước khi gửi quầy" back />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nhận món</Text>
          <View style={styles.fulfillmentRow}>
            <View style={[styles.fulfillmentIcon, tableNumber ? styles.fulfillmentIconActive : null]}><Ionicons name={tableNumber ? 'restaurant' : 'bag-handle'} size={22} color={tableNumber ? Colors.surface : Colors.primary} /></View>
            <View style={styles.flex}>
              <Text style={styles.label}>{tableNumber ? `Phục vụ tại bàn ${tableNumber}` : 'Mang đi'}</Text>
              <Text style={styles.help}>Nhập số bàn nếu bạn đang ngồi tại quán.</Text>
            </View>
          </View>
          <TextInput value={tableInput} onChangeText={updateTable} keyboardType="number-pad" placeholder="Số bàn (để trống nếu mang đi)" placeholderTextColor={Colors.textMuted} style={styles.tableInput} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đơn hàng</Text>
          <View style={styles.summary}>
            {cart.map((item) => (
              <View key={item.cartKey} style={styles.summaryRow}>
                <Text numberOfLines={2} style={styles.summaryName}>{item.quantity} × {item.name}</Text>
                <Text style={styles.summaryPrice}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Tổng cộng</Text><Text style={styles.total}>{formatCurrency(cartTotal)}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          <PaymentOption active={paymentMethod === 'Tiền mặt'} icon="cash-outline" title="Tiền mặt" description="Thanh toán khi nhận món" onPress={() => setPaymentMethod('Tiền mặt')} />
          <PaymentOption active={paymentMethod === 'Chuyển khoản'} icon="qr-code-outline" title="Chuyển khoản PayOS" description="Mở cổng thanh toán bảo mật" onPress={() => setPaymentMethod('Chuyển khoản')} />
        </View>
      </ScrollView>
      <View style={styles.footer}><AppButton label={paymentMethod === 'Tiền mặt' ? 'Gửi đơn đến quầy' : 'Tiếp tục với PayOS'} icon={paymentMethod === 'Tiền mặt' ? 'checkmark-circle-outline' : 'open-outline'} loading={createOrder.isPending} onPress={() => void placeOrder()} style={styles.fullButton} /></View>
    </SafeAreaView>
  );
}

function PaymentOption({ active, icon, title, description, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; description: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.payment, active && styles.paymentActive]}>
      <View style={styles.paymentIcon}><Ionicons name={icon} size={22} color={Colors.primary} /></View>
      <View style={styles.flex}><Text style={styles.label}>{title}</Text><Text style={styles.help}>{description}</Text></View>
      <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? Colors.primary : Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Layout.screenPadding, paddingBottom: 110, gap: 22 },
  section: { gap: 10 },
  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '900' },
  fulfillmentRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, backgroundColor: Colors.surface, borderRadius: Layout.radius, borderWidth: 1, borderColor: Colors.border },
  fulfillmentIcon: { width: 42, height: 42, borderRadius: 8, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  fulfillmentIconActive: { backgroundColor: Colors.primary },
  flex: { flex: 1 },
  label: { color: Colors.text, fontSize: 14, fontWeight: '800' },
  help: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },
  tableInput: { height: 48, paddingHorizontal: 13, color: Colors.text, backgroundColor: Colors.surface, borderRadius: Layout.radius, borderWidth: 1, borderColor: Colors.border },
  summary: { backgroundColor: Colors.surface, borderRadius: Layout.radius, borderWidth: 1, borderColor: Colors.border, padding: 13, gap: 11 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  summaryName: { flex: 1, color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
  summaryPrice: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  totalLabel: { color: Colors.text, fontSize: 15, fontWeight: '900' },
  total: { color: Colors.coffee, fontSize: 18, fontWeight: '900' },
  payment: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, backgroundColor: Colors.surface, borderRadius: Layout.radius, borderWidth: 1, borderColor: Colors.border },
  paymentActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceMuted },
  paymentIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 13, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  fullButton: { alignSelf: 'stretch' },
});
