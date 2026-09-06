import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/queries/query-keys';
import { orderService } from '@/services/order-service';
import type { CreateOrderInput, Order } from '@/types/commerce';

const terminalStatuses = new Set(['Hoàn thành', 'Đã xong', 'Đã hủy', 'Cancelled']);

export function useOrders(email?: string, lastOrderId?: string | null) {
  const enabled = Boolean(email || lastOrderId);

  return useQuery({
    queryKey: queryKeys.orders.history(email, lastOrderId),
    queryFn: async () => {
      if (email) return orderService.getByEmail(email);
      if (lastOrderId) return [await orderService.getById(lastOrderId)];
      return [];
    },
    enabled,
    staleTime: 15 * 1000,
  });
}

export function useOrder(id?: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id || 'missing'),
    queryFn: () => orderService.getById(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const order = query.state.data as Order | undefined;
      return order && terminalStatuses.has(order.status) ? false : 30 * 1000;
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderInput) => orderService.create(input),
    onSuccess: (order) => {
      if (order._id) queryClient.setQueryData(queryKeys.orders.detail(order._id), order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}
