export function formatCurrency(value: number) {
  return `${Math.round(value || 0).toLocaleString('vi-VN')}đ`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function removeAccents(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function getToppingPrice(name: string) {
  const normalized = removeAccents(name).toLowerCase();
  if (/kem pho mai|cream cheese|cheese|macchiato/.test(normalized)) return 10000;
  if (/tran chau|thach|pudding/.test(normalized)) return 5000;
  if (/hat chia|basil/.test(normalized)) return 3000;
  return 5000;
}

export function getSizePrice(size: string) {
  if (size === 'L') return 10000;
  if (size === 'M') return 5000;
  return 0;
}

