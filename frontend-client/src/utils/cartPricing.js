export const sizeExtraPrice = size => size === 'S' ? 0 : size === 'L' ? 10000 : 5000;

export function addQuickItem(cart, product) {
  const size = product.sizes?.includes('M') ? 'M' : product.sizes?.[0] || 'M';
  const options = {
    size,
    sugar: product.sugarOptions?.at(-1) || '100%',
    ice: product.iceOptions?.at(-1) || '100%',
    toppings: []
  };
  const price = Number(product.price) + sizeExtraPrice(size);
  const existing = cart.find(item => item._id === product._id
    && Number(item.price) === price
    && !item.note
    && item.options?.size === options.size
    && item.options?.sugar === options.sugar
    && item.options?.ice === options.ice
    && !(item.options?.toppings?.length));
  if (existing) return cart.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
  return [...cart, { ...product, price, quantity: 1, options, note: '' }];
}
