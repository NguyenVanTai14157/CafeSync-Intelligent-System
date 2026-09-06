import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/product-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StatePanel } from '@/components/ui/state-panel';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { useCommerce } from '@/contexts/commerce-context';
import type { Product } from '@/types/product';
import { getSizePrice } from '@/utils/format';

export default function FavoritesScreen() {
  const { favorites, toggleFavorite, addToCart } = useCommerce();

  const quickAdd = (product: Product) => {
    const size = product.sizes?.includes('M') ? 'M' : product.sizes?.[0] || 'M';
    addToCart({ productId: product._id, name: product.name, image: product.image, unitPrice: product.price + getSizePrice(size), quantity: 1,
      options: { size, sugar: product.sugarOptions?.at(-1) || '100%', ice: product.iceOptions?.at(-1) || '100%', toppings: [] } });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.header}><ScreenHeader title="Món yêu thích" subtitle={`${favorites.length} món đã lưu`} /></View>}
        ListEmptyComponent={<StatePanel icon="heart-outline" title="Chưa có món yêu thích" message="Chạm biểu tượng trái tim trên món bạn muốn lưu." actionLabel="Xem thực đơn" onAction={() => router.replace('/')} />}
        renderItem={({ item }) => (
          <View style={styles.item}><ProductCard product={item} favorite onPress={() => router.push({ pathname: '/product/[id]', params: { id: item._id } })} onToggleFavorite={() => toggleFavorite(item)} onQuickAdd={() => quickAdd(item)} /></View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, padding: Layout.screenPadding, paddingBottom: 28 },
  header: { marginBottom: 16 },
  row: { gap: 10, marginBottom: 10 },
  item: { flex: 1, maxWidth: '49%' },
});
