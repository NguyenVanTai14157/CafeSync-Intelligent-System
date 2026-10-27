import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addQuickItem, sizeExtraPrice } from '../src/utils/cartPricing.js';

const tea = { _id: 'tea', name: 'Trà đào', price: 40000, sizes: ['S', 'M', 'L'] };

test('quick add and detail size pricing agree; repeated additions do not add surcharges twice', () => {
  const first = addQuickItem([], tea);
  assert.equal(first[0].options.size, 'M');
  assert.equal(first[0].price, tea.price + sizeExtraPrice('M'));
  const twice = addQuickItem(first, tea);
  assert.equal(twice.length, 1);
  assert.equal(twice[0].quantity, 2);
  assert.equal(twice[0].price, 45000);
  assert.equal(first[0].quantity, 1);
});

test('quick add respects supported sizes and product defaults', () => {
  for (const [size,price] of [['S',40000], ['M',45000], ['L',50000]]) {
    const [item] = addQuickItem([], { ...tea, sizes:[size], sugarOptions:['0%'], iceOptions:['No ice'] });
    assert.equal(item.price,price);
    assert.equal(item.options.size,size);
    assert.equal(item.options.sugar,'0%');
    assert.equal(item.options.ice,'No ice');
  }
});

test('quick add keeps custom toppings, notes, sizes and old incorrect prices separate', () => {
  const [plain] = addQuickItem([],tea);
  for (const customized of [
    { ...plain, options:{...plain.options,size:'L'} },
    { ...plain, options:{...plain.options,toppings:['Kem cheese']} },
    { ...plain, note:'Ít ngọt' },
    { ...plain, price:40000 }
  ]) {
    const cart = addQuickItem([customized],tea);
    assert.equal(cart.length,2);
    assert.equal(cart[0].quantity,1);
    assert.equal(cart[1].price,45000);
  }
});
