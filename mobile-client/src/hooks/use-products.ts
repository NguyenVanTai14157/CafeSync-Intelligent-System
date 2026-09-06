import { useQuery } from '@tanstack/react-query';

import { getApiErrorMessage } from '@/services/api';
import { queryKeys } from '@/queries/query-keys';
import { productService } from '@/services/product-service';

export function useProducts(categoryId?: string) {
  const productsQuery = useQuery({
    queryKey: queryKeys.catalog.products(categoryId),
    queryFn: () => productService.getAll(categoryId),
    placeholderData: (previousData) => previousData,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.catalog.categories,
    queryFn: productService.getCategories,
    staleTime: 10 * 60 * 1000,
  });

  const requestError = productsQuery.error || categoriesQuery.error;
  const refresh = async () => {
    await Promise.all([productsQuery.refetch(), categoriesQuery.refetch()]);
  };

  return {
    products: productsQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    loading: productsQuery.isPending || categoriesQuery.isPending,
    refreshing: productsQuery.isFetching || categoriesQuery.isFetching,
    error: requestError ? getApiErrorMessage(requestError, 'Không thể tải thực đơn.') : null,
    refresh,
  };
}
