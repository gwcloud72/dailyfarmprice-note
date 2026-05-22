export function cls(...values) {
  return values.filter(Boolean).join(' ');
}

export function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toLocaleString('ko-KR');
}

export function signed(value, suffix = '') {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return `${number > 0 ? '+' : ''}${formatNumber(number)}${suffix}`;
}
