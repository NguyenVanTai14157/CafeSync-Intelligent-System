import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getImageUrl } from '@/config/env';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import type { Product } from '@/types/product';
import { formatCurrency } from '@/utils/format';

type Props = {
  product: Product;
  favorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  onQuickAdd: () => void;
  compact?: boolean;
};

export function ProductCard({ product, favorite, onPress, onToggleFavorite, onQuickAdd, compact }: Props) {
  const uri = getImageUrl(product.image);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, compact && styles.compact, pressed && styles.pressed]}>
      <View style={[styles.imageWrap, compact && styles.compactImage]}>
        {uri ? <Image source={{ uri }} contentFit="cover" transition={180} style={StyleSheet.absoluteFill} /> : (
          <View style={styles.placeholder}><Ionicons name="cafe" size={30} color={Colors.coffee} /></View>
        )}
        <Pressable accessibilityLabel={favorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'} hitSlop={6} onPress={onToggleFavorite} style={styles.favoriteButton}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={19} color={favorite ? Colors.danger : Colors.text} />
        </Pressable>
      </View>
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.name}>{product.name}</Text>
        <View style={styles.footer}>
          <Text style={styles.price}>{formatCurrency(product.price)}</Text>
          <Pressable accessibilityLabel="Thêm nhanh vào giỏ" hitSlop={7} onPress={onQuickAdd} style={styles.addButton}>
            <Ionicons name="add" size={21} color={Colors.surface} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  compact: { width: 164, flex: 0 },
  imageWrap: { height: 140, backgroundColor: Colors.surfaceMuted },
  compactImage: { height: 108 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { minHeight: 92, padding: 11, justifyContent: 'space-between', gap: 8 },
  name: { color: Colors.text, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  price: { flex: 1, color: Colors.coffee, fontSize: 14, fontWeight: '800' },
  addButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.84 },
});

