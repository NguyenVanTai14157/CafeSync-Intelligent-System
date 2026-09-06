import { useQueryClient } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { queryKeys } from '@/queries/query-keys';
import { getSocket } from '@/services/socket';
import type { Order } from '@/types/commerce';

type RealtimeContextValue = {
  isConnected: boolean;
};

const RealtimeContext = createContext<RealtimeContextValue>({ isConnected: false });

export function RealtimeProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleOrderUpdate = (updatedOrder: Order) => {
      if (!updatedOrder?._id) return;

      queryClient.setQueryData(queryKeys.orders.detail(updatedOrder._id), updatedOrder);
      queryClient.setQueriesData<Order[]>({ queryKey: queryKeys.orders.histories }, (orders) => (
        orders?.map((order) => order._id === updatedOrder._id ? updatedOrder : order)
      ));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('order_updated', handleOrderUpdate);
    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('order_updated', handleOrderUpdate);
      socket.disconnect();
    };
  }, [queryClient]);

  const value = useMemo(() => ({ isConnected }), [isConnected]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
