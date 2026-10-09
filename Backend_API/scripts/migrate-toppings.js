// Preview by default. Only --apply writes; never runs with the API server.
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const { EJSON } = mongoose.mongo.BSON;
const menu = require('./menu-data');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const root = path.resolve(__dirname, '../../.local-data');
const json = value => EJSON.stringify(value, null, 2, { relaxed: false });

async function main() {
  if (!process.env.MONGO_URI) throw new Error('Missing MONGO_URI');
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'CafeSyncDB', autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  console.log('Connected to CafeSyncDB; target cluster:', new URL(process.env.MONGO_URI).hostname);
  const pc = db.collection('products'), tc = db.collection('toppings');
  const allProducts = await pc.find({}).toArray();
  const allToppings = await tc.find({}).toArray();
  const plan = menu.products.map(target => {
    const matches = allProducts.filter(p => menu.normalize(p.name) === menu.normalize(target.name));
    if (matches.length !== 1) throw new Error(`${target.name}: found ${matches.length}, expected exactly 1. No writes.`);
    return { before: matches[0], target };
  });
  for (const target of menu.toppings) {
    const matches = allToppings.filter(t => menu.normalize(t.name) === menu.normalize(target.name));
    if (matches.length > 1) throw new Error(`Duplicate topping: ${target.name}. No writes.`);
  }
  console.log(JSON.stringify(plan.map(({ before, target }) => ({ id: before._id, actualName: before.name, oldPrice: before.price, price: target.price, toppings: target.toppings })), null, 2));
  console.log(`Validated ${plan.length} products; total products ${allProducts.length}; existing toppings ${allToppings.length}.`);
  if (!process.argv.includes('--apply')) return console.log('DRY RUN: no database writes.');

  const dir = path.join(root, new Date().toISOString().replace(/[:.]/g, '-'));
  await fs.mkdir(dir, { recursive: true });
  for (const [file, data] of [['products.before.json', plan.map(p => p.before)], ['toppings.before.json', allToppings]]) {
    const location = path.join(dir, file);
    await fs.writeFile(location, json(data), { flag: 'wx' });
    if (json(EJSON.parse(await fs.readFile(location, 'utf8'), { relaxed: false })) !== json(data)) throw new Error('Backup verification failed');
  }
  await fs.writeFile(path.join(dir, 'RESTORE.md'), 'Backup uses MongoDB Extended JSON. Do not import with replace/drop. To restore, compare current documents with the exported post-migration files, then restore only products.price/products.toppings by _id from products.before.json using $set (or $unset if previously absent). Restore existing topping name/price/status by _id from toppings.before.json. New toppings should only be removed with explicit approval after checking all references. Do not overwrite concurrent changes.\n');
  console.log('Verified backups:', dir);
  await tc.createIndex({ name: 1 }, { unique: true });
  const ids = new Map();
  for (const target of menu.toppings) {
    const existing = allToppings.find(t => menu.normalize(t.name) === menu.normalize(target.name));
    const id = existing?._id || new mongoose.Types.ObjectId();
    if (existing) {
      const result = await tc.updateOne({ _id: id, name: existing.name, price: existing.price, status: existing.status }, { $set: target });
      if (result.matchedCount !== 1) throw new Error('Concurrent topping change; stopped.');
    } else {
      // Name guard makes reruns idempotent. A unique name index is also enforced by the Topping model.
      await tc.updateOne({ name: target.name }, { $setOnInsert: { _id: id, ...target } }, { upsert: true });
    }
    const saved = await tc.findOne({ name: target.name });
    ids.set(target.name, saved._id);
  }
  let changed = 0;
  for (const { before, target } of plan) {
    const filter = { _id: before._id, price: before.price };
    filter.toppings = Object.hasOwn(before, 'toppings') ? before.toppings : { $exists: false };
    const result = await pc.updateOne(filter, { $set: { price: target.price, toppings: target.toppings.map(n => ids.get(n)) } });
    if (result.matchedCount !== 1) throw new Error(`Concurrent change: ${target.name}; stopped, inspect backup ${dir}`);
    changed += result.modifiedCount;
  }
  const after = await pc.find({}).toArray();
  const toppingsAfter = await tc.find({}).toArray();
  for (const { before, target } of plan) {
    const actual = after.find(p => p._id.equals(before._id));
    if (actual.price !== target.price || json(actual.toppings) !== json(target.toppings.map(n => ids.get(n)))) throw new Error(`Verification failed: ${target.name}`);
    const omit = ({ price, toppings, ...rest }) => rest;
    if (json(omit(actual)) !== json(omit(before))) throw new Error(`Unrelated fields changed: ${target.name}`);
  }
  for (const target of menu.toppings) {
    const actual = toppingsAfter.find(t => t._id.equals(ids.get(target.name)));
    if (actual.price !== target.price || actual.status !== 'active') throw new Error(`Topping verification failed: ${target.name}`);
  }
  await fs.writeFile(path.join(dir, 'products.json'), json(after));
  await fs.writeFile(path.join(dir, 'toppings.json'), json(toppingsAfter));
  console.log(`Verified 31 mappings; modified ${changed} products; exports: ${dir}`);
}
main().catch(error => {
  // Never print connection errors that may contain credentials.
  console.error(error.message.includes('MONGO') || /found|Duplicate|Concurrent|Verification|Backup|Unrelated/.test(error.message) ? error.message : `Operation failed (${error.name}); credentials omitted.`);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
