import { getSizePrice, getToppingPrice, removeAccents } from '../src/utils/format';

describe('price rules', () => {
  test('calculates size surcharges used by web and mobile', () => {
    expect(getSizePrice('S')).toBe(0);
    expect(getSizePrice('M')).toBe(5000);
    expect(getSizePrice('L')).toBe(10000);
  });

  test('calculates topping surcharges without depending on accents', () => {
    expect(getToppingPrice('Kem phô mai')).toBe(10000);
    expect(getToppingPrice('Trân châu')).toBe(5000);
    expect(getToppingPrice('Hạt chia')).toBe(3000);
  });
});

describe('removeAccents', () => {
  test('normalizes Vietnamese text for search', () => {
    expect(removeAccents('Cà phê Đặc Biệt')).toBe('Ca phe Dac Biet');
  });
});
