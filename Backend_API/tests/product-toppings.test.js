const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Product = require('../src/models/Product');
const Topping = require('../src/models/Topping');
const Order = require('../src/models/Order');
const controller = require('../src/controllers/productController');
const originals = { count: Topping.countDocuments, update: Product.findByIdAndUpdate, find: Product.findById, order: Order.findOne };
afterEach(() => {
  Topping.countDocuments = originals.count;
  Product.findByIdAndUpdate = originals.update;
  Product.findById = originals.find;
  Order.findOne = originals.order;
});
function response() {
  return { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test('Product stores BSON references and registers the Topping model', () => {
  const p = new Product({ toppings: ['507f1f77bcf86cd799439011'] });
  assert.equal(p.toppings[0].toHexString(), '507f1f77bcf86cd799439011');
  assert.equal(Product.schema.path('toppings').caster?.options.ref || Product.schema.path('toppings').embeddedSchemaType.options.ref, 'Topping');
  assert.ok(new Topping({ name: 'Pudding trứng', price: -1 }).validateSync());
});

test('rejects old string topping names before any product update', async () => {
  Product.findByIdAndUpdate = () => assert.fail('must not write');
  const res = response();
  await controller.updateProduct({ params: { id: '507f1f77bcf86cd799439011' }, body: { toppings: ['Kem cheese'] } }, res);
  assert.equal(res.code, 400);
});

test('rejects nonexistent or inactive references and update operators', async () => {
  Topping.countDocuments = async () => 0;
  Product.findByIdAndUpdate = () => assert.fail('must not write');
  for (const body of [{ toppings: ['507f1f77bcf86cd799439011'] }, { $set: { toppings: [] } }]) {
    const res = response();
    await controller.updateProduct({ params: { id: '507f1f77bcf86cd799439011' }, body }, res);
    assert.equal(res.code, 400);
  }
});

test('valid update deduplicates reference IDs and populates topping details', async () => {
  Topping.countDocuments = async () => 1;
  const populated = [];
  Product.findByIdAndUpdate = (id, data, options) => {
    assert.deepEqual(data, { $set: { toppings: ['507f1f77bcf86cd799439011'] } });
    assert.equal(options.runValidators, true);
    const query = { populate(value) { populated.push(value); return this; }, then(resolve) { return Promise.resolve({ _id: id }).then(resolve); } };
    return query;
  };
  const res = response();
  await controller.updateProduct({ params: { id: '507f1f77bcf86cd799439012' }, body: { toppings: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439011'] } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(populated, ['category', { path: 'toppings', match: { status: 'active' } }]);
});

test('old habits only select toppings still available on this product', async () => {
  Product.findById = () => ({ populate() { return this; }, then(resolve) { return Promise.resolve({ toObject: () => ({ toppings: [{ name: 'Kem cheese' }] }) }).then(resolve); } });
  Order.findOne = () => ({ sort: async () => ({ items: [{ id_product: '507f1f77bcf86cd799439011', options: { size: 'M', toppings: ['Sữa', 'Kem cheese'] } }] }) });
  const res = response();
  await controller.getProductById({ params: { id: '507f1f77bcf86cd799439011' }, query: { email: 'test@example.invalid' } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.habit, { size: 'M', toppings: ['Kem cheese'] });
});
