const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const Order = require('../src/models/Order');
const PayOS = require('@payos/node');
const controller = require('../src/controllers/orderController');
const { nextStatus } = require('../src/utils/orderWorkflow');
const originals = { create: Order.create, find: Order.findOne, id: Order.findById, update: Order.findOneAndUpdate, verify: PayOS.prototype.verifyPaymentWebhookData, info: PayOS.prototype.getPaymentLinkInformation };
process.env.JWT_SECRET = 'test-only-secret';
process.env.PAYOS_CLIENT_ID = 'test'; process.env.PAYOS_API_KEY = 'test'; process.env.PAYOS_CHECKSUM_KEY = 'test';
afterEach(() => {
  Order.create = originals.create; Order.findOne = originals.find; Order.findById = originals.id; Order.findOneAndUpdate = originals.update;
  PayOS.prototype.verifyPaymentWebhookData = originals.verify; PayOS.prototype.getPaymentLinkInformation = originals.info;
});
const res = () => ({ code: 200, status(n) { this.code=n; return this; }, json(body) { this.body=body; return this; } });
function request(body = {}, staff = false) {
  const events=[];
  return { body, params: { id: 'test-order' }, headers: staff ? { authorization: 'Bearer '+jwt.sign({ role: 'nhanvien' },process.env.JWT_SECRET) } : {}, app: { get: () => ({ emit: (name,data) => events.push({name,data}) }) }, events };
}
test('only paid orders can advance through the two preparation transitions', () => {
  assert.equal(nextStatus({ status:'Chờ pha chế',paymentStatus:'pending' }),null);
  assert.equal(nextStatus({ status:'Chờ pha chế',paymentStatus:'paid' }),'Đang pha chế');
  assert.equal(nextStatus({ status:'Đang pha chế',paymentStatus:'paid' }),'Hoàn thành');
  assert.equal(nextStatus({ status:'Hoàn thành',paymentStatus:'paid' }),null);
});
test('customer cash order stays pending without a preparation event', async () => {
  Order.create=async data => data;
  const req=request({ paymentMethod:'Tiền mặt',items:[],totalPrice:40000,location:'Mang về' }); const response=res();
  await controller.createOrder(req,response);
  assert.equal(response.body.paymentStatus,'pending'); assert.equal(req.events.length,0);
});
test('POS requires staff and emits a paid waiting order', async () => {
  const body={ paymentMethod:'Tiền mặt',source:'pos',paymentConfirmed:true,items:[],totalPrice:40000,location:'Tại quầy' };
  let response=res(); await controller.createOrder(request(body),response); assert.equal(response.code,403);
  Order.create=async data => data;
  const req=request(body,true); response=res(); await controller.createOrder(req,response);
  assert.equal(response.body.status,'Chờ pha chế'); assert.equal(req.events[0].name,'new_order');
});
test('invalid signature and unsuccessful webhook never write orders', async () => {
  Order.findOne=async () => assert.fail('must not read/write an order');
  PayOS.prototype.verifyPaymentWebhookData=()=>{ throw Error('bad signature'); };
  let response=res(); await controller.receiveWebhook(request(),response); assert.equal(response.code,400);
  PayOS.prototype.verifyPaymentWebhookData=()=>({code:'01'});
  response=res(); await controller.receiveWebhook(request(),response); assert.equal(response.code,200);
});
test('valid webhook releases once; retries cannot reset preparation', async () => {
  const order={_id:'test-order',totalPrice:40000,status:'Chờ thanh toán',paymentStatus:'pending'};
  PayOS.prototype.verifyPaymentWebhookData=()=>({code:'00',orderCode:123,amount:40000});
  Order.findOne=async filter => { assert.equal(filter.$or[2].orderID,'CFS123'); return order; };
  let writes=0;
  Order.findOneAndUpdate=async (filter,update) => { writes++; Object.assign(order,update.$set); return order; };
  const req=request(); await controller.receiveWebhook(req,res());
  order.status='Đang pha chế'; await controller.receiveWebhook(req,res());
  assert.equal(writes,1); assert.equal(order.status,'Đang pha chế'); assert.equal(req.events.filter(e=>e.name==='new_order').length,1);
});
test('return URL cannot mark unpaid PayOS link as paid', async () => {
  PayOS.prototype.getPaymentLinkInformation=async()=>({status:'PENDING'});
  Order.findOne=async()=>assert.fail('must not change order');
  const response=res(); await controller.paymentSuccess(request({orderCode:123}),response); assert.equal(response.code,409);
});
test('one-tap status update checks staff, payment and concurrent writes', async () => {
  let response=res(); await controller.updateOrderStatus(request({status:'Hoàn thành'}),response); assert.equal(response.code,403);
  Order.findById=async()=>({_id:'test-order',status:'Chờ pha chế',paymentStatus:'paid'});
  response=res(); await controller.updateOrderStatus(request({status:'Hoàn thành'},true),response); assert.equal(response.code,409);
  Order.findOneAndUpdate=async()=>null;
  response=res(); await controller.updateOrderStatus(request({status:'Đang pha chế'},true),response); assert.equal(response.code,409);
});
test('successful preparation update emits the updated order', async () => {
  Order.findById=async()=>({_id:'test-order',status:'Đang pha chế',paymentStatus:'paid'});
  Order.findOneAndUpdate=async(filter,update)=>{ assert.equal(filter.status,'Đang pha chế'); return {_id:'test-order',...update.$set}; };
  const req=request({status:'Hoàn thành'},true), response=res();
  await controller.updateOrderStatus(req,response);
  assert.equal(response.body.status,'Hoàn thành'); assert.equal(req.events[0].name,'order_updated');
});
test('payment amount mismatch cannot release an order', async () => {
  PayOS.prototype.verifyPaymentWebhookData=()=>({code:'00',orderCode:123,amount:1});
  Order.findOne=async()=>({totalPrice:40000,paymentStatus:'pending'});
  Order.findOneAndUpdate=async()=>assert.fail('must not write');
  const response=res(); await controller.receiveWebhook(request(),response); assert.equal(response.code,500);
});
test('staff cash confirmation releases waiting orders and rejects noncash', async () => {
  Order.findById=async()=>({_id:'test-order',paymentMethod:'Chuyển khoản/Ví điện tử',status:'Chờ thanh toán'});
  let response=res(); await controller.confirmCashPayment(request({},true),response); assert.equal(response.code,409);
  Order.findById=async()=>({_id:'test-order',paymentMethod:'Tiền mặt',status:'Chờ thanh toán'});
  Order.findOneAndUpdate=async(filter,update)=>({_id:'test-order',...update.$set});
  const req=request({},true); response=res(); await controller.confirmCashPayment(req,response);
  assert.equal(response.body.paymentStatus,'paid'); assert.equal(req.events[0].name,'new_order');
});
