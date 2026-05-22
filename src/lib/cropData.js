import { formatNumber } from './format.js';

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function latestPoint(item) {
  const series = Array.isArray(item?.series) ? item.series.filter((point) => toNumber(point.price) !== null) : [];
  const latest = series.at(-1) || null;
  const previous = series.at(-2) || null;
  return { latest, previous, series };
}

function percent(diff, previous) {
  if (!previous) return 0;
  return Number(((diff / previous) * 100).toFixed(2));
}

function shortDate(value) {
  const text = String(value || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text.slice(5, 7)}/${text.slice(8, 10)}`;
  return text || '-';
}

function formatTimestamp(value) {
  if (!value) return '수집 대기';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10).replaceAll('-', '.');
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date).replace(/\.$/, '');
}

function groupByName(items) {
  const groups = new Map();
  items.forEach((item) => {
    const { latest } = latestPoint(item);
    const price = toNumber(latest?.price);
    if (price === null) return;
    const key = String(item.name || item.baseId || item.id || '품목').trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return groups;
}

function buildCropRows(items) {
  const groups = groupByName(items);
  const rows = [];

  groups.forEach((groupItems, name) => {
    const enriched = groupItems.map((item) => {
      const { latest, previous, series } = latestPoint(item);
      const price = toNumber(latest?.price);
      const previousPrice = toNumber(previous?.price) ?? price;
      const diff = price !== null && previousPrice !== null ? price - previousPrice : 0;
      return { item, latest, previous, series, price, diff };
    }).filter((entry) => entry.price !== null);

    if (!enriched.length) return;

    const preferred = enriched.find((entry) => entry.item.region === '전국' || entry.item.regionCode === 'ALL') || enriched[0];
    const high = enriched.reduce((best, entry) => (entry.price > best.price ? entry : best), enriched[0]);
    const low = enriched.reduce((best, entry) => (entry.price < best.price ? entry : best), enriched[0]);
    const previousPrice = toNumber(preferred.previous?.price) ?? preferred.price;

    rows.push({
      name,
      grade: preferred.item.kindName || preferred.item.market || preferred.item.category || '상품',
      unit: preferred.item.unit || '1kg',
      price: preferred.price,
      diff: preferred.diff,
      rate: percent(preferred.diff, previousPrice),
      high: `${high.item.region || '전국'} ${formatNumber(high.price)}`,
      low: `${low.item.region || '전국'} ${formatNumber(low.price)}`,
      region: low.item.region || '전국',
      series: preferred.series,
    });
  });

  return rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

function buildRegionRows(items) {
  const regions = new Map();

  items.forEach((item) => {
    const region = item.region || '전국';
    if (region === '전국') return;
    const { latest, previous } = latestPoint(item);
    const price = toNumber(latest?.price);
    if (price === null) return;
    const previousPrice = toNumber(previous?.price) ?? price;
    if (!regions.has(region)) regions.set(region, { prices: [], diffs: [], items: new Set() });
    const group = regions.get(region);
    group.prices.push(price);
    group.diffs.push(price - previousPrice);
    if (item.name) group.items.add(item.name);
  });

  return [...regions.entries()].map(([name, group]) => {
    const price = Math.round(group.prices.reduce((sum, value) => sum + value, 0) / group.prices.length);
    const diff = Math.round(group.diffs.reduce((sum, value) => sum + value, 0) / group.diffs.length);
    const [firstItem] = [...group.items];
    return {
      name,
      price,
      diff,
      note: firstItem ? `${firstItem} 관찰` : '가격 확인',
    };
  }).sort((a, b) => b.price - a.price).slice(0, 8);
}

function buildTrendFromRows(rows) {
  const first = rows.find((row) => Array.isArray(row.series) && row.series.length >= 2);
  if (!first) return { values: [], labels: [], label: '품목' };
  const points = first.series
    .map((point) => ({ value: toNumber(point.price), label: shortDate(point.date) }))
    .filter((point) => point.value !== null)
    .slice(-7);
  return {
    values: points.map((point) => point.value),
    labels: points.map((point) => point.label),
    label: first.name,
  };
}

function buildMarketTrend(rows) {
  const map = new Map();
  rows.forEach((row) => {
    (row.series || []).slice(-7).forEach((point) => {
      const price = toNumber(point.price);
      if (price === null || !point.date) return;
      if (!map.has(point.date)) map.set(point.date, []);
      map.get(point.date).push(price);
    });
  });

  const points = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-7).map(([date, prices]) => ({
    label: shortDate(date),
    value: Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length),
  }));

  return { values: points.map((point) => point.value), labels: points.map((point) => point.label) };
}

function pickReportLines(reportPayload, rows) {
  const reports = reportPayload?.reports || {};
  const firstRow = rows[0];
  if (firstRow) {
    const reportKey = Object.keys(reports).find((key) => key.includes(firstRow.name));
    const summary = reportKey ? reports?.[reportKey]?.['7']?.summary : null;
    if (Array.isArray(summary) && summary.length) return summary.slice(0, 4);
  }
  return [];
}

function buildHeadline(rows) {
  const riser = rows.filter((row) => row.diff > 0).sort((a, b) => b.diff - a.diff)[0];
  const faller = rows.filter((row) => row.diff < 0).sort((a, b) => a.diff - b.diff)[0];
  if (riser && faller) return `${riser.name}가 가장 많이 오르고, ${faller.name}는 하락 구간입니다.`;
  if (riser) return `${riser.name}가 오늘 가장 크게 움직였습니다.`;
  if (faller) return `${faller.name} 가격이 하락 구간입니다.`;
  return rows.length ? '오늘 주요 품목은 안정권입니다.' : '수집된 가격 데이터가 없습니다.';
}

export function buildCropDashboard(pricePayload, reportPayload) {
  const items = Array.isArray(pricePayload?.items) ? pricePayload.items : [];
  const rows = buildCropRows(items);
  const regionRows = rows.length ? buildRegionRows(items) : [];
  const featuredTrend = buildTrendFromRows(rows);
  const marketTrend = buildMarketTrend(rows);

  return {
    rows,
    regionRows,
    trendValues: marketTrend.values,
    trendLabels: marketTrend.labels,
    featuredTrendValues: featuredTrend.values,
    featuredTrendLabels: featuredTrend.labels,
    featuredTrendLabel: featuredTrend.label,
    headline: buildHeadline(rows),
    updatedAt: formatTimestamp(pricePayload?.generatedAt),
    reportLines: pickReportLines(reportPayload, rows),
    isLive: rows.length > 0,
  };
}
