import { api } from '@/services/api';
import type { Category, Product, Recommendations } from '@/types/product';

export const productService = {
  async getAll(categoryId?: string) {
    const { data } = await api.get<Product[]>('/api/products', {
      params: categoryId ? { category: categoryId } : undefined,
    });
    return data;
  },

  async getById(id: string, email?: string) {
    const { data } = await api.get<Product>(`/api/products/${id}`, {
      params: { email: email || 'Guest' },
    });
    return data;
  },

  async getCategories() {
    const { data } = await api.get<Category[]>('/api/categories');
    return data;
  },

  async getRecommendations(email: string) {
    const { data } = await api.get<Recommendations>('/api/products/recommendations', {
      params: { email },
    });
    return data;
  },
};

