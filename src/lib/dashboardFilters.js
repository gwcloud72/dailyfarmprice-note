export const SORT_OPTIONS = [
  { label: '변동 큰 순', value: 'change-desc' },
  { label: '가격 낮은 순', value: 'price-asc' },
  { label: '가격 높은 순', value: 'price-desc' },
  { label: '품목명', value: 'name-asc' },
];
export const DEFAULT_FILTERS = { query: '', item: '전체 품목', region: '전국', period: '최근 7일', sort: 'change-desc' };
const LEGACY_SORT_VALUES = new Map(SORT_OPTIONS.map((option) => [option.label, option.value]));


export function normalizeSort(value) {
  return LEGACY_SORT_VALUES.get(value) || SORT_OPTIONS.find((option) => option.value === value)?.value || DEFAULT_FILTERS.sort;
}

export function hasActiveFilters(filters) {
  return normalizeText(filters?.query) !== ''
    || filters?.item !== DEFAULT_FILTERS.item
    || filters?.region !== DEFAULT_FILTERS.region
    || filters?.period !== DEFAULT_FILTERS.period
    || normalizeSort(filters?.sort) !== DEFAULT_FILTERS.sort;
}

export function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function decorateRows(rows) {
  return rows.map((row, index) => ({
    id: row.name || `crop-${index}`,
    icon: String(row.name || '품목').slice(0, 1),
    name: row.name,
    grade: row.grade || '상품',
    unit: row.unit || '1kg',
    price: Number(row.price) || 0,
    change: Number(row.diff ?? row.change) || 0,
    rate: Number(row.rate) || 0,
    range: row.range || `${row.low || '-'} ~ ${row.high || '-'}`,
    region: row.region || '전국',
    high: row.high,
    low: row.low,
    favorite: Boolean(row.favorite),
  }));
}

export function filterRows(rows, filters) {
  const query = normalizeText(filters.query);
  return rows.filter((row) => {
    const matchesItem = filters.item === '전체 품목' || row.name === filters.item;
    const matchesRegion = filters.region === '전국' || normalizeText(`${row.region} ${row.high} ${row.low}`).includes(normalizeText(filters.region));
    const haystack = normalizeText(`${row.name} ${row.region} ${row.range} ${row.high} ${row.low}`);
    return matchesItem && matchesRegion && (!query || haystack.includes(query));
  });
}

export function sortRows(rows, sort) {
  const list = [...rows];
  if (sort === 'price-asc') return list.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') return list.sort((a, b) => b.price - a.price);
  if (sort === 'name-asc') return list.sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
  return list.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

export function filterRegions(rows, filters) {
  const query = normalizeText(filters.query);
  return rows.filter((row) => {
    const matchesRegion = filters.region === '전국' || normalizeText(row.name).includes(normalizeText(filters.region));
    const haystack = normalizeText(`${row.name} ${row.note}`);
    return matchesRegion && (!query || haystack.includes(query));
  });
}

export function sortRegions(rows, sort) {
  const list = [...rows];
  if (sort === 'price-asc') return list.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') return list.sort((a, b) => b.price - a.price);
  return list.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

function periodLimit(period) {
  if (period === '최근 90일') return 90;
  if (period === '최근 30일') return 30;
  return 7;
}

export function sliceSeries(values, labels, period) {
  const limit = periodLimit(period);
  const nextValues = values.slice(-limit);
  const nextLabels = labels.slice(-limit);
  return { values: nextValues.length ? nextValues : values, labels: nextLabels.length ? nextLabels : labels };
}
