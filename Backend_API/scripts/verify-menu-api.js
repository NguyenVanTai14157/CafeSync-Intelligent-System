// Read-only check against the local API. No orders, payments or writes.
const assert = require('node:assert/strict');
const menu = require('./menu-data');

async function get(route) {
  const response = await fetch(`http://localhost:5000/api/${route}`, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, route);
  return response.json();
}
async function main() {
  const [products, toppings] = await Promise.all([get('products'), get('toppings')]);
  for (const expected of menu.toppings) {
    const matches = toppings.filter(t => t.name === expected.name);
    assert.equal(matches.length, 1, expected.name);
    assert.equal(matches[0].price, expected.price);
    assert.equal(matches[0].status, 'active');
  }
  for (const expected of menu.products) {
    const matches = products.filter(p => menu.normalize(p.name) === menu.normalize(expected.name));
    assert.equal(matches.length, 1, expected.name);
    const product = matches[0];
    assert.equal(product.price, expected.price, expected.name);
    assert.deepEqual(product.toppings.map(t => t.name), expected.toppings, expected.name);
    for (const topping of product.toppings) {
      const original = toppings.find(t => t._id === topping._id);
      assert.ok(original, 'Populated topping must exist');
      assert.equal(topping.price, original.price);
    }
  }
  const tea = products.find(p => p.name === 'Trà đào');
  const detail = await get(`products/${tea._id}`);
  assert.deepEqual(detail.toppings, tea.toppings);
  const pudding = detail.toppings.find(t => t.name === 'Pudding trứng');
  assert.equal(detail.price + 5000 + pudding.price, 53000, 'Tea size M + pudding');
  const smoothie = products.find(p => p.name === 'Sinh tố bơ');
  assert.deepEqual((await get(`products/${smoothie._id}`)).toppings, []);
  console.log('PASS: local API prices and populated references for 31 products / 7 toppings; details, empty toppings, tea M + pudding = 53000.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
