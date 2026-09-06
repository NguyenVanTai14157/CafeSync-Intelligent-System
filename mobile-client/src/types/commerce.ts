import type { Product, ProductOptions } from '@/types/product';

export type CartItem = {
  cartKey: string;
  productId: string;
  name: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  options: ProductOptions;
  note?: string;
};

export type OrderItem = {
  _id?: string;
  id_product?: string | Product;
  name: string;
  quantity: number;
  price: number;
  options?: ProductOptions;
  note?: string;
};

export type Order = {
  _id: string;
  orderID: string;
  items: OrderItem[];
  totalPrice: number;
  location: string;
  tableNumber?: number | null;
  customerEmail: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
};

export type CreateOrderInput = {
  orderID: string;
  items: OrderItem[];
  totalPrice: number;
  location: string;
  tableNumber: number | null;
  paymentMethod: string;
  customerEmail: string;
  customerName: string;
};

export type CreateOrderResponse = Order & {
  checkoutUrl?: string;
  message?: string;
};

