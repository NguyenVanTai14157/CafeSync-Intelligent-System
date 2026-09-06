import { api } from '@/services/api';
import type { CreateOrderInput, CreateOrderResponse, Order } from '@/types/commerce';

export const orderService = {
  async create(input: CreateOrderInput) {
    const { data } = await api.post<CreateOrderResponse>('/api/orders', input);
    return data;
  },

  async getById(id: string) {
    const { data } = await api.get<Order>(`/api/orders/${id}`);
    return data;
  },

  async getByEmail(email: string) {
    const { data } = await api.get<Order[]>(`/api/orders/user/${encodeURIComponent(email)}`);
    return data;
  },

  async confirmPayment(orderCode: string) {
    const { data } = await api.post<{ order: Order }>('/api/orders/payment-success', { orderCode });
    return data.order;
  },
};

