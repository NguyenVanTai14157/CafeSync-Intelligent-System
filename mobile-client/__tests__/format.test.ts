import { getSizePrice, getToppingPrice, removeAccents } from '../src/utils/format';

describe('price rules', () => {
  test('calculates size surcharges used by web and mobile', () => {
    expect(getSizePrice('S')).toBe(0);
    expect(getSizePrice('M')).toBe(5000);
    expect(getSizePrice('L')).toBe(10000);
  });

  test('uses catalog prices, excludes inactive and removed toppings', () => {
    const toppings = [
      { _id: 'pudding', name: 'Pudding trứng', price: 8000, status: 'active' as const },
      { _id: 'cheese', name: 'Kem cheese', price: 12000, status: 'active' as const },
      { _id: 'old', name: 'Thạch', price: 5000, status: 'inactive' as const },
    ];
    expect(getToppingPrice('Pudding trứng', toppings)).toBe(8000);
    expect(getToppingPrice('Kem cheese', toppings)).toBe(12000);
    expect(getToppingPrice('Thạch', toppings)).toBe(0);
    expect(getToppingPrice('Sữa', toppings)).toBe(0);
    expect(getToppingPrice('Pudding trứng')).toBe(0);
  });
});

describe('removeAccents', () => {
  test('normalizes Vietnamese text for search', () => {
    expect(removeAccents('Cà phê Đặc Biệt')).toBe('Ca phe Dac Biet');
  });
});
