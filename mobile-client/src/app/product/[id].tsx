import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { StatePanel } from '@/components/ui/state-panel';
import { getImageUrl } from '@/config/env';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { useAuth } from '@/contexts/auth-context';
import { useCommerce } from '@/contexts/commerce-context';
import { queryKeys } from '@/queries/query-keys';
import { getApiErrorMessage } from '@/services/api';
import { productService } from '@/services/product-service';
import type { ProductOptions } from '@/types/product';
import { formatCurrency, getSizePrice, getToppingPrice } from '@/utils/format';

const initialOptions: ProductOptions = { size: 'M', sugar: '100%', ice: '100%', toppings: [] };

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { cartCount, addToCart, isFavorite, toggleFavorite } = useCommerce();
  const [options, setOptions] = useState<ProductOptions>(initialOptions);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const initializedProductId = useRef<string>(undefined);
  const productQuery = useQuery({
    queryKey: queryKeys.product(id || 'missing', user?.email),
    queryFn: () => productService.getById(id, user?.email),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
  const product = productQuery.data;
  const error = productQuery.error
    ? getApiErrorMessage(productQuery.error, 'Không tìm thấy món này.')
    : null;

  useEffect(() => {
    if (!product || initializedProductId.current === product._id) return;
    initializedProductId.current = product._id;
    setOptions({
      size: product.habit?.size || (product.sizes?.includes('M') ? 'M' : product.sizes?.[0]) || 'M',
      sugar: product.habit?.sugar || product.sugarOptions?.at(-1) || '100%',
      ice: product.habit?.ice || product.iceOptions?.at(-1) || '100%',
      toppings: (product.habit?.toppings || []).filter(name => product.toppings?.some(t => t.status === 'active' && t.name === name)),
    });
  }, [product]);

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    return product.price + getSizePrice(options.size) + options.toppings.reduce((sum, topping) => sum + getToppingPrice(topping, product.toppings), 0);
  }, [options.size, options.toppings, product]);

  if (productQuery.isPending) return <SafeAreaView style={styles.screen}><StatePanel loading title="Đang chuẩn bị thông tin món" /></SafeAreaView>;
  if (!product) return <SafeAreaView style={styles.screen}><StatePanel title="Không mở được món" message={error || 'Sản phẩm không còn tồn tại.'} actionLabel="Quay lại" onAction={() => router.back()} /></SafeAreaView>;

  const toggleTopping = (topping: string) => setOptions((current) => ({
    ...current,
    toppings: current.toppings.includes(topping)
      ? current.toppings.filter((item) => item !== topping)
      : [...current.toppings, topping],
  }));

  const addItem = () => {
    addToCart({ productId: product._id, name: product.name, image: product.image, unitPrice, quantity, options, note: note.trim() || undefined });
    Alert.alert('Đã thêm vào giỏ', `${quantity} × ${product.name}`, [
      { text: 'Chọn thêm' },
      { text: 'Xem giỏ', onPress: () => router.push('/cart') },
    ]);
  };

  const imageUri = getImageUrl(product.image);
  const favorite = isFavorite(product._id);

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {imageUri ? <Image source={{ uri: imageUri }} contentFit="cover" transition={200} style={StyleSheet.absoluteFill} /> : <View style={styles.placeholder}><Ionicons name="cafe" size={60} color={Colors.coffee} /></View>}
          <View style={styles.heroOverlay} />
          <Pressable accessibilityLabel="Quay lại" onPress={() => router.back()} style={[styles.heroButton, styles.backButton]}><Ionicons name="chevron-back" size={24} color={Colors.text} /></Pressable>
          <View style={styles.heroActions}>
            <Pressable accessibilityLabel={favorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'} onPress={() => toggleFavorite(product)} style={styles.heroButton}><Ionicons name={favorite ? 'heart' : 'heart-outline'} size={22} color={favorite ? Colors.danger : Colors.text} /></Pressable>
            <Pressable accessibilityLabel="Mở giỏ hàng" onPress={() => router.push('/cart')} style={styles.heroButton}>
              <Ionicons name="bag-handle-outline" size={22} color={Colors.text} />
              {cartCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{cartCount}</Text></View> : null}
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}><Text style={styles.title}>{product.name}</Text><Text style={styles.price}>{formatCurrency(unitPrice)}</Text></View>
          <Text style={styles.description}>{product.description || 'Món được pha chế theo công thức của CaféSync.'}</Text>

          <OptionSection title="Kích cỡ ly" options={product.sizes?.length ? product.sizes : ['S', 'M', 'L']} value={options.size} onChange={(size) => setOptions({ ...options, size })} habit={product.habit?.size} />
          <OptionSection title="Mức đường" options={product.sugarOptions?.length ? product.sugarOptions : ['0%', '50%', '100%']} value={options.sugar} onChange={(sugar) => setOptions({ ...options, sugar })} habit={product.habit?.sugar} />
          <OptionSection title="Mức đá" options={product.iceOptions?.length ? product.iceOptions : ['0%', '50%', '100%']} value={options.ice} onChange={(ice) => setOptions({ ...options, ice })} habit={product.habit?.ice} />

          {product.toppings?.some(t => t.status === 'active') ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Topping</Text>
              <View style={styles.toppingList}>
                {product.toppings.filter(t => t.status === 'active').map((topping) => {
                  const selected = options.toppings.includes(topping.name);
                  return (
                    <Pressable key={topping._id} onPress={() => toggleTopping(topping.name)} style={[styles.toppingRow, selected && styles.toppingSelected]}>
                      <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={21} color={selected ? Colors.primary : Colors.textMuted} />
                      <Text style={styles.toppingName}>{topping.name}</Text>
                      <Text style={styles.toppingPrice}>+{formatCurrency(topping.price)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ghi chú cho quầy pha chế</Text>
            <TextInput value={note} onChangeText={setNote} multiline maxLength={160} placeholder="Ví dụ: ít ngọt, mang đi..." placeholderTextColor={Colors.textMuted} style={styles.note} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.stepper}>
          <Pressable accessibilityLabel="Giảm số lượng" onPress={() => setQuantity((value) => Math.max(1, value - 1))} style={styles.stepButton}><Ionicons name="remove" size={20} color={Colors.text} /></Pressable>
          <Text style={styles.quantity}>{quantity}</Text>
          <Pressable accessibilityLabel="Tăng số lượng" onPress={() => setQuantity((value) => value + 1)} style={styles.stepButton}><Ionicons name="add" size={20} color={Colors.text} /></Pressable>
        </View>
        <AppButton label={`Thêm · ${formatCurrency(unitPrice * quantity)}`} icon="bag-add-outline" onPress={addItem} style={styles.addButton} />
      </View>
    </SafeAreaView>
  );
}

function OptionSection({ title, options, value, onChange, habit }: { title: string; options: string[]; value: string; onChange: (value: string) => void; habit?: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.optionTitleRow}><Text style={styles.sectionTitle}>{title}</Text>{habit ? <Text style={styles.habit}>Gu thường chọn: {habit}</Text> : null}</View>
      <View style={styles.chips}>
        {options.map((option) => <Pressable key={option} onPress={() => onChange(option)} style={[styles.chip, value === option && styles.chipActive]}><Text style={[styles.chipText, value === option && styles.chipTextActive]}>{option}</Text></Pressable>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 110 },
  hero: { height: 330, backgroundColor: Colors.surfaceMuted },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.1)' },
  heroButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', top: 52, left: 16 },
  heroActions: { position: 'absolute', top: 52, right: 16, flexDirection: 'row', gap: 9 },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: Colors.surface, fontSize: 9, fontWeight: '900' },
  body: { padding: Layout.screenPadding, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { flex: 1, color: Colors.text, fontSize: 25, lineHeight: 31, fontWeight: '900' },
  price: { color: Colors.coffee, fontSize: 18, fontWeight: '900', paddingTop: 4 },
  description: { color: Colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 5 },
  section: { marginTop: 20, gap: 10 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { color: Colors.text, fontSize: 15, fontWeight: '900' },
  habit: { color: Colors.primary, fontSize: 10, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minWidth: 58, minHeight: 39, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: Colors.surface },
  toppingList: { borderWidth: 1, borderColor: Colors.border, borderRadius: Layout.radius, overflow: 'hidden' },
  toppingRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  toppingSelected: { backgroundColor: Colors.surfaceMuted },
  toppingName: { flex: 1, color: Colors.text, fontSize: 13, fontWeight: '700' },
  toppingPrice: { color: Colors.coffee, fontSize: 12, fontWeight: '800' },
  note: { minHeight: 86, padding: 12, borderRadius: Layout.radius, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, color: Colors.text, textAlignVertical: 'top' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  stepper: { height: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Layout.radius },
  stepButton: { width: 38, height: 46, alignItems: 'center', justifyContent: 'center' },
  quantity: { minWidth: 24, color: Colors.text, textAlign: 'center', fontWeight: '900' },
  addButton: { flex: 1 },
});
