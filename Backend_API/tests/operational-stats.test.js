const { test } = require('node:test');
const assert = require('node:assert/strict');
const { operationalStats } = require('../src/utils/operationalStats');
test('legacy, paid, tables, customer history and menu quantities', () => {
  const order=(date,extra={})=>({createdAt:date,status:'Hoàn thành',customerEmail:'Guest',items:[],...extra});
  const result=operationalStats([
    order('2026-09-01',{customerEmail:'return@test.invalid'}),
    order('2026-10-09',{customerEmail:'return@test.invalid',tableNumber:11,items:[{id_product:'a',quantity:2}]}),
    order('2026-10-09',{customerEmail:'new@test.invalid',tableNumber:1,items:[{name:' A ',quantity:3}]}),
    order('2026-10-09',{customerEmail:'new@test.invalid'}),
    order('2026-10-09',{paymentStatus:'paid',status:'Chờ pha chế'}),
    order('2026-10-09',{paymentStatus:'pending'}),
    order('2026-10-09',{status:'Đã hủy',paymentStatus:'paid'})
  ],[{_id:'a',name:'A'},{_id:'b',name:'B'}],[{tableNumber:1},{tableNumber:11},{tableNumber:21}],new Date('2026-10-10T05:00:00Z'));
  assert.equal(result.orderCount,4); assert.deepEqual(result.customers,{newcomers:1,returning:2,guestOrders:1});
  assert.deepEqual(result.tables.map(r=>r.count),[1,1,0]);
  assert.equal(result.menu.top[0].quantity,5); assert.equal(result.menu.bottom[0].quantity,0);
  assert.equal(result.from.toISOString(),'2026-10-03T17:00:00.000Z');
});
test('no data and future orders',()=>{
  const result=operationalStats([{createdAt:'2030-01-01',paymentStatus:'paid'}],[],[],new Date('2026-10-10'));
  assert.equal(result.orderCount,0); assert.deepEqual(result.menu.top,[]);
});
test('first purchase is new, later purchases return even within the same day', () => {
  const orders = [
    {_id:'b',createdAt:'2026-10-09',paymentStatus:'paid',customerEmail:' User@Test.invalid '},
    {_id:'a',createdAt:'2026-10-09',paymentStatus:'paid',customerEmail:'user@test.invalid'},
    {_id:'c',createdAt:'2026-10-10',paymentStatus:'paid',customerEmail:'user@test.invalid'},
    {createdAt:'2026-10-09',paymentStatus:'paid',customerEmail:'Guest'},
    {createdAt:'2026-10-09',paymentStatus:'paid'},
    {createdAt:'2026-09-01',paymentStatus:'pending',customerEmail:'user@test.invalid'}
  ];
  const result = operationalStats(orders,[],[],new Date('2026-10-10T12:00:00Z'));
  assert.deepEqual(result.customers,{newcomers:1,returning:2,guestOrders:2});
  assert.equal(Object.values(result.customers).reduce((a,b)=>a+b,0),result.orderCount);
});
