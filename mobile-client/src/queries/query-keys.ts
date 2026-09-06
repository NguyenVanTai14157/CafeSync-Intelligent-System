export const queryKeys = {
  catalog: {
    all: ['catalog'] as const,
    products: (categoryId?: string) => ['catalog', 'products', categoryId || 'all'] as const,
    categories: ['catalog', 'categories'] as const,
  },
  product: (id: string, email?: string) => ['product', id, email || 'Guest'] as const,
  recommendations: (email: string) => ['recommendations', email] as const,
  orders: {
    all: ['orders'] as const,
    histories: ['orders', 'history'] as const,
    history: (email?: string, lastOrderId?: string | null) => [
      'orders',
      'history',
      email || 'Guest',
      lastOrderId || 'none',
    ] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
};
