export type Category = {
  _id: string;
  name: string;
};

export type ProductOptions = {
  size: string;
  sugar: string;
  ice: string;
  toppings: string[];
};

export type Topping = {
  _id: string;
  name: string;
  price: number;
  status: 'active' | 'inactive';
};

export type Product = {
  _id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  category?: Category | string;
  sizes?: string[];
  toppings?: Topping[];
  sugarOptions?: string[];
  iceOptions?: string[];
  habit?: Partial<ProductOptions> | null;
};

export type Recommendations = {
  favorites: Product[];
  newFlavors: Product[];
};

