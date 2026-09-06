import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getImageUrl } from '@/config/env';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import type { CartItem } from '@/types/commerce';
import { formatCurrency } from '@/utils/format';

type Props = {
  item: CartItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
};

export function CartItemRow({ item, onIncrease, onDecrease, onRemove }: Props) {
  const uri = getImageUrl(item.image);
  return (
    <View style={styles.row}>
      {uri ? <Image source={{ uri }} contentFit="cover" style={styles.image} /> : <View style={[styles.image, styles.placeholder]}><Ionicons name="cafe" size={24} color={Colors.coffee} /></View>}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
          <Pressable accessibilityLabel="Xóa món" hitSlop={8} onPress={onRemove}>
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
          </Pressable>
        </View>
        <Text numberOfLines={2} style={styles.options}>
          Size {item.options.size} · {item.options.sugar} đường · {item.options.ice} đá
          {item.options.toppings.length ? ` · ${item.options.toppings.join(', ')}` : ''}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={styles.price}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
          <View style={styles.stepper}>
            <Pressable accessibilityLabel="Giảm số lượng" onPress={onDecrease} style={styles.stepButton}><Ionicons name="remove" size={18} color={Colors.text} /></Pressable>
            <Text style={styles.quantity}>{item.quantity}</Text>
            <Pressable accessibilityLabel="Tăng số lượng" onPress={onIncrease} style={styles.stepButton}><Ionicons name="add" size={18} color={Colors.text} /></Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, padding: 12, backgroundColor: Colors.surface, borderRadius: Layout.radius, borderWidth: 1, borderColor: Colors.border },
  image: { width: 82, height: 92, borderRadius: 6, backgroundColor: Colors.surfaceMuted },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { flex: 1, color: Colors.text, fontSize: 15, lineHeight: 19, fontWeight: '800' },
  options: { color: Colors.textMuted, fontSize: 11, lineHeight: 16 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { color: Colors.coffee, fontWeight: '800' },
  stepper: { height: 34, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 6 },
  stepButton: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center' },
  quantity: { minWidth: 25, textAlign: 'center', color: Colors.text, fontWeight: '800' },
});

