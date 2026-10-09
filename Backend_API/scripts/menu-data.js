const toppings = [
  ['Trân châu đen', 5000], ['Trân châu trắng', 5000], ['Thạch củ năng', 5000],
  ['Thạch nha đam', 5000], ['Pudding trứng', 8000], ['Kem cheese', 10000], ['Thạch cà phê', 5000]
].map(([name, price]) => ({ name, price, status: 'active' }));
const tea = toppings.slice(0, 6).map(t => t.name);
const products = [
  ['Cà phê đặc biệt', 45000], ['Cà phê đen', 30000], ['Cà phê sữa', 35000],
  ['Cà phê Espresso', 30000], ['Cà phê Cappuccino', 40000], ['Cà phê Latte', 40000],
  ['Cà phê trứng', 45000], ['Cà phê dừa', 40000], ['Bạc xỉu', 35000, ['Kem cheese']],
  ['Cà phê muối', 35000, ['Kem cheese']], ['Cà phê đá xay', 45000, ['Thạch cà phê']],
  ['Cà phê Mocha', 40000, ['Thạch cà phê']],
  ['Trà đào', 40000, tea], ['Trà chanh', 30000, tea], ['Trà vải', 35000, tea],
  ['Trà dâu', 35000, tea], ['Trà trái cây nhiệt đới', 40000, tea], ['Trà sữa socola', 40000, tea],
  ['Sinh tố chuối', 35000], ['Sinh tố dưa hấu', 35000], ['Sinh tố mít', 35000],
  ['Sinh tố xoài', 35000], ['Sinh tố kiwi', 40000], ['Sinh tố mãng cầu', 40000],
  ['Sinh tố việt quất', 40000], ['Sinh tố dâu', 45000], ['Sinh tố bơ', 45000],
  ['Nước ép chanh dây', 35000], ['Nước ép đào', 35000], ['Nước ép táo', 40000], ['Nước ép cam', 45000]
].map(([name, price, toppings = []]) => ({ name, price, toppings }));
const normalize = name => name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
module.exports = { toppings, products, normalize };
