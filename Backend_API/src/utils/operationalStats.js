const eligible = o => o.paymentStatus === 'paid' || (!o.paymentStatus && ['Hoàn thành', 'Đã thanh toán', 'Đã xong'].includes(o.status));
const normalize = s => String(s || '').normalize('NFC').trim().toLowerCase();
function operationalRange(query = {}, now = new Date()) {
  const today = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  if (query.from !== undefined || query.to !== undefined) {
    const parse = value => {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Ngày phải có định dạng YYYY-MM-DD');
      const date = new Date(`${value}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value) throw new Error('Ngày không hợp lệ');
      return new Date(`${value}T00:00:00+07:00`);
    };
    const from = parse(query.from), end = parse(query.to);
    if (from > end || query.to > today) throw new Error('Chọn khoảng ngày hợp lệ, không vượt quá hôm nay');
    return { from, to: new Date(Math.min(end.getTime() + 86400000 - 1, now.getTime())) };
  }
  const days = query.days === undefined ? 7 : Number(query.days);
  if (![7,30].includes(days)) throw new Error('Chỉ hỗ trợ khoảng nhanh 7 hoặc 30 ngày');
  const start = new Date(now.getTime() + 7 * 3600000);
  start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: new Date(start.getTime() - 7 * 3600000), to: now };
}
function operationalStats(orders, products, tables, now = new Date(), range = operationalRange({}, now)) {
  const { from, to } = range;
  const valid = orders.filter(o => eligible(o) && !['Đã hủy', 'Cancelled'].includes(o.status) && new Date(o.createdAt) <= now);
  const recent = valid.filter(o => new Date(o.createdAt) >= from && new Date(o.createdAt) <= to);
  const groups = new Map();
  const group = n => { const first = Math.floor((Number(n) - 1) / 10) * 10 + 1; return `Bàn ${first}–${first + 9}`; };
  for (const t of tables) if (Number(t.tableNumber) > 0) groups.set(group(t.tableNumber), 0);
  for (const o of recent) if (Number(o.tableNumber) > 0) { const key = group(o.tableNumber); groups.set(key, (groups.get(key) || 0) + 1); }
  // Sort the entire eligible history; only the first purchase per email is new.
  // ID breaks timestamp ties so simultaneous orders still count one first purchase.
  const history = [...valid].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt) || String(a._id || '').localeCompare(String(b._id || '')));
  const seen = new Set(); let newcomers = 0, returning = 0, guestOrders = 0;
  for (const o of history) {
    const email = normalize(o.customerEmail);
    const inPeriod = new Date(o.createdAt) >= from && new Date(o.createdAt) <= to;
    if (!email || email === 'guest') { if (inPeriod) guestOrders++; continue; }
    if (inPeriod) { if (seen.has(email)) returning++; else newcomers++; }
    seen.add(email);
  }
  const quantities = new Map(products.map(p => [String(p._id), 0]));
  const names = new Map();
  for (const p of products) { const key = normalize(p.name); names.set(key, names.has(key) ? null : String(p._id)); }
  let unmatchedItems = 0;
  for (const o of recent) for (const item of o.items || []) {
    const id = quantities.has(String(item.id_product)) ? String(item.id_product) : names.get(normalize(item.name));
    if (!id) { unmatchedItems++; continue; }
    const qty = Number(item.quantity);
    if (Number.isFinite(qty) && qty > 0) quantities.set(id, quantities.get(id) + qty);
  }
  const ranked = products.map(p => ({ id: String(p._id), name: p.name, quantity: quantities.get(String(p._id)) }));
  const byName = (a,b) => a.name.localeCompare(b.name, 'vi');
  const top = [...ranked].sort((a,b) => b.quantity - a.quantity || byName(a,b)).slice(0,5);
  const bottom = [...ranked].sort((a,b) => a.quantity - b.quantity || byName(a,b)).slice(0,5);
  return { from, to, orderCount: recent.length,
    tables: [...groups].sort((a,b) => Number(a[0].match(/\d+/)[0]) - Number(b[0].match(/\d+/)[0])).map(([label,count]) => ({label,count})),
    customers: { newcomers, returning, guestOrders }, menu: { top, bottom, unmatchedItems } };
}
module.exports = { operationalStats, operationalRange };
