import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/product-card';
import { StatePanel } from '@/components/ui/state-panel';
import { Colors } from '@/constants/colors';
import { Layout } from '@/constants/layout';
import { useAuth } from '@/contexts/auth-context';
import { useCommerce } from '@/contexts/commerce-context';
import { useProducts } from '@/hooks/use-products';
import { queryKeys } from '@/queries/query-keys';
import { productService } from '@/services/product-service';
import type { Product, Recommendations } from '@/types/product';
import { getSizePrice, removeAccents } from '@/utils/format';

const emptyRecommendations: Recommendations = { favorites: [], newFlavors: [] };

export default function HomeScreen() {
  const { table } = useLocalSearchParams<{ table?: string }>();
  const { user } = useAuth();
  const { cartCount, addToCart, isFavorite, toggleFavorite, tableNumber, setTableNumber } = useCommerce();
  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [search, setSearch] = useState('');
  const { products, categories, loading, refreshing, error, refresh } = useProducts(selectedCategory);
  const recommendationsQuery = useQuery({
    queryKey: queryKeys.recommendations(user?.email || 'Guest'),
    queryFn: () => productService.getRecommendations(user?.email as string),
    enabled: Boolean(user?.email),
    staleTime: 5 * 60 * 1000,
  });
  const recommendations = recommendationsQuery.data ?? emptyRecommendations;

  useEffect(() => {
    const parsed = Number(table);
    if (table && Number.isInteger(parsed) && parsed > 0) setTableNumber(parsed);
  }, [setTableNumber, table]);

  const filteredProducts = useMemo(() => {
    const term = removeAccents(search.trim().toLowerCase());
    if (!term) return products;
    return products.filter((product) => removeAccents(product.name.toLowerCase()).includes(term));
  }, [products, search]);

  const openProduct = (product: Product) => router.push({ pathname: '/product/[id]', params: { id: product._id } });

  const quickAdd = (product: Product) => {
    const size = product.sizes?.includes('M') ? 'M' : product.sizes?.[0] || 'M';
    addToCart({
      productId: product._id,
      name: product.name,
      image: product.image,
      unitPrice: product.price + getSizePrice(size),
      quantity: 1,
      options: {
        size,
        sugar: product.sugarOptions?.at(-1) || '100%',
        ice: product.iceOptions?.at(-1) || '100%',
        toppings: [],
      },
    });
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.gridItem}>
      <ProductCard product={item} favorite={isFavorite(item._id)} onPress={() => openProduct(item)} onToggleFavorite={() => toggleFavorite(item)} onQuickAdd={() => quickAdd(item)} />
    </View>
  );

  const listHeader = (
    <>
      <View style={styles.header}>
        <View style={styles.brandWrap}>
          <View style={styles.brandMark}><Ionicons name="cafe" size={22} color={Colors.surface} /></View>
          <View>
            <Text style={styles.brand}>CaféSync</Text>
            <Text style={styles.greeting}>{user ? `Chào ${user.name.split(' ').at(-1)}` : 'Cà phê đúng gu, đúng lúc'}</Text>
          </View>
        </View>
        <Pressable accessibilityLabel="Mở giỏ hàng" onPress={() => router.push('/cart')} style={styles.cartButton}>
          <Ionicons name="bag-handle-outline" size={23} color={Colors.text} />
          {cartCount > 0 ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text></View> : null}
        </Pressable>
      </View>

      {tableNumber ? (
        <View style={styles.tableBanner}><Ionicons name="location" size={18} color={Colors.primary} /><Text style={styles.tableText}>Đang phục vụ tại bàn {tableNumber}</Text><Pressable accessibilityLabel="Bỏ chọn bàn" onPress={() => setTableNumber(null)}><Ionicons name="close" size={20} color={Colors.textMuted} /></Pressable></View>
      ) : null}

      <View style={styles.promo}>
        <View style={styles.promoCopy}>
          <Text style={styles.promoEyebrow}>{user ? 'GỢI Ý THEO KHẨU VỊ' : 'THỰC ĐƠN HÔM NAY'}</Text>
          <Text style={styles.promoTitle}>{user ? 'Món quen của bạn, sẵn sàng để đặt lại.' : 'Một ly ngon cho nhịp ngày của bạn.'}</Text>
        </View>
        <View style={styles.promoIcon}><Ionicons name="sparkles" size={27} color={Colors.accent} /></View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={Colors.textMuted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Tìm món trong thực đơn" placeholderTextColor={Colors.textMuted} style={styles.searchInput} />
        {search ? <Pressable accessibilityLabel="Xóa tìm kiếm" onPress={() => setSearch('')}><Ionicons name="close-circle" size={20} color={Colors.textMuted} /></Pressable> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        <Pressable onPress={() => setSelectedCategory(undefined)} style={[styles.category, !selectedCategory && styles.categoryActive]}><Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>Tất cả</Text></Pressable>
        {categories.map((category) => (
          <Pressable key={category._id} onPress={() => setSelectedCategory(category._id)} style={[styles.category, selectedCategory === category._id && styles.categoryActive]}>
            <Text style={[styles.categoryText, selectedCategory === category._id && styles.categoryTextActive]}>{category.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {user && recommendations.favorites.length > 0 && !selectedCategory && !search ? (
        <View style={styles.recommendationSection}>
          <Text style={styles.sectionTitle}>Món bạn thường chọn</Text>
          <FlatList
            data={recommendations.favorites}
            keyExtractor={(item) => `recommendation-${item._id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => <ProductCard compact product={item} favorite={isFavorite(item._id)} onPress={() => openProduct(item)} onToggleFavorite={() => toggleFavorite(item)} onQuickAdd={() => quickAdd(item)} />}
          />
        </View>
      ) : null}

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Thực đơn chính</Text>
        <Text style={styles.resultCount}>{filteredProducts.length} món</Text>
      </View>
    </>
  );

  if (loading && products.length === 0) return <SafeAreaView style={styles.screen}><StatePanel loading title="Đang tải thực đơn" /></SafeAreaView>;
  if (error && products.length === 0) return <SafeAreaView style={styles.screen}><StatePanel title="Chưa tải được thực đơn" message={error} actionLabel="Thử lại" onAction={() => void refresh()} /></SafeAreaView>;

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item._id}
        numColumns={2}
        renderItem={renderProduct}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<StatePanel title="Không tìm thấy món" message="Hãy thử từ khóa hoặc danh mục khác." />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={Colors.primary} colors={[Colors.primary]} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Layout.screenPadding, paddingBottom: 28 },
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  brandWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 42, height: 42, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  brand: { color: Colors.text, fontSize: 23, fontWeight: '900' },
  greeting: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  cartButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.background },
  cartBadgeText: { color: Colors.surface, fontSize: 9, fontWeight: '900' },
  tableBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingHorizontal: 12, backgroundColor: Colors.surfaceMuted, borderWidth: 1, borderColor: Colors.border, borderRadius: Layout.radius, marginBottom: 12 },
  tableText: { flex: 1, color: Colors.primary, fontSize: 13, fontWeight: '800' },
  promo: { minHeight: 128, flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: Colors.primaryDark, borderRadius: Layout.radius, marginBottom: 14 },
  promoCopy: { flex: 1, gap: 7 },
  promoEyebrow: { color: '#D6E6DE', fontSize: 10, fontWeight: '900' },
  promoTitle: { maxWidth: 260, color: Colors.surface, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  promoIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  searchBox: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Layout.radius },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
  categories: { gap: 8, paddingVertical: 13 },
  category: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 19, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  categoryActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
  categoryTextActive: { color: Colors.surface },
  recommendationSection: { marginTop: 5, marginBottom: 17 },
  horizontalList: { gap: 10, paddingTop: 10 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, marginBottom: 11 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '900' },
  resultCount: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  gridRow: { gap: 10, marginBottom: 10 },
  gridItem: { flex: 1, maxWidth: '49%' },
});
