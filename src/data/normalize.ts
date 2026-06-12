import { useEffect, useState } from 'react';
import { crops as defaultCrops, marketNews as defaultMarketNews, metrics as metricTemplates, regions as defaultRegions, widgets as defaultWidgets, reportBars as defaultReportBars, type CropItem, type MarketNewsItem, type RegionPriceRow, type ReportBar } from './model';
import type { ChangeDirection } from '../components/common/types';

interface SourceSeriesPoint { date?: string; price?: number | string; }
interface SourceCropItem { id?: string; baseId?: string; name?: string; region?: string; market?: string; grade?: string; unit?: string; price?: number | string; change?: number | string; pct?: number | string; series?: SourceSeriesPoint[]; }
interface SourceCropResponse { items?: SourceCropItem[]; }
interface SourceNewsItem { id?: string; title?: string; summary?: string; description?: string; source?: string; provider?: string; publishedAt?: string; pubDate?: string; date?: string; link?: string; originallink?: string; keyword?: string; }
interface SourceNewsResponse { items?: SourceNewsItem[]; }
export type FarmData = { crops: CropItem[]; metrics: typeof metricTemplates; regions: RegionPriceRow[]; reportBars: ReportBar[]; widgets: typeof defaultWidgets; marketNews: MarketNewsItem[]; sourceLoaded: boolean; };

const DEFAULT_FARM_DATA: FarmData = { crops: defaultCrops, metrics: metricTemplates, regions: defaultRegions, reportBars: defaultReportBars, widgets: defaultWidgets, marketNews: defaultMarketNews, sourceLoaded: true };
const iconByName: Record<string, string> = { 배추:'🥬', 무:'🥕', 양파:'🧅', 감자:'🥔', 대파:'🌿', 사과:'🍎', 양배추:'🥬', 마늘:'🧄', 풋고추:'🌶️', 배:'🍐', 토마토:'🍅', 상추:'🥬' };
const directionOf = (value: number): ChangeDirection => value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
const safeNumber = (value: unknown, fallback = 0): number => {
  const next = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(next) ? next : fallback;
};
const cropKey = (item: SourceCropItem): string => String(item.baseId ?? item.name ?? item.id ?? '').trim();
function mapSourceCrop(item: SourceCropItem, index: number): CropItem | null {
  const name = String(item.baseId ?? item.name ?? item.id ?? '').trim();
  if (!name) return null;
  const price = safeNumber(item.price, 0);
  const change = safeNumber(item.change, 0);
  const series = (item.series ?? []).map((point) => safeNumber(point.price, 0)).filter((value) => value > 0);
  return {
    id: String(item.id ?? `${name}-${item.region ?? index}`),
    name,
    icon: iconByName[name] ?? '•',
    spec: [item.unit, item.grade].filter(Boolean).join(' ') || '단위 확인',
    region: item.region ?? '지역 확인',
    market: item.market ?? '시장 확인',
    price,
    change,
    changePct: safeNumber(item.pct, 0),
    direction: directionOf(change),
    series: series.length ? series : [price],
  };
}

function pickRepresentative(items: SourceCropItem[]): SourceCropItem[] {
  const grouped = new Map<string, SourceCropItem[]>();
  items.forEach((item) => {
    const key = cropKey(item);
    if (!key) return;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  });
  return [...grouped.entries()].map(([key, group], groupIndex) => {
    const regional = group.filter((item) => item.region && item.region !== '전국' && safeNumber(item.price, 0) > 0);
    const valid = regional[groupIndex % Math.max(1, regional.length)] ?? group.find((item) => safeNumber(item.price, 0) > 0) ?? group[0];
    return { ...valid, baseId: valid.baseId ?? key, name: valid.baseId ?? valid.name ?? key };
  }).sort((a, b) => Math.abs(safeNumber(b.pct, 0)) - Math.abs(safeNumber(a.pct, 0)));
}

function buildSourceRegions(items: SourceCropItem[]): RegionPriceRow[] {
  const regionNames = [...new Set(items.map((item) => item.region).filter((name): name is string => Boolean(name) && name !== '전국'))];
  const valueOf = (region: string, name: string) => {
    const item = items.find((entry) => entry.region === region && (entry.baseId === name || entry.name === name));
    return safeNumber(item?.price, 0);
  };
  return regionNames.slice(0, 17).map((name) => ({
    name,
    cabbage: valueOf(name, '배추'),
    radish: valueOf(name, '무'),
    onion: valueOf(name, '양파'),
    potato: valueOf(name, '감자'),
    greenonion: valueOf(name, '대파'),
  }));
}

function buildMetrics(crops: CropItem[], regionCount: number): typeof metricTemplates {
  const up = crops.filter((crop) => crop.direction === 'up').length;
  const down = crops.filter((crop) => crop.direction === 'down').length;
  const flat = crops.filter((crop) => crop.direction === 'flat').length;
  return [
    { ...metricTemplates[0], value: `${up}개`, sub: '전일 대비 상승' },
    { ...metricTemplates[1], value: `${down}개`, sub: '전일 대비 하락' },
    { ...metricTemplates[2], value: `${flat}개`, sub: '변동 없음' },
    { ...metricTemplates[3], value: `${regionCount}개`, sub: '시도 단위' },
  ];
}

function buildReportBars(crops: CropItem[]): ReportBar[] {
  return crops.slice(0, 8).map((crop) => ({ name: crop.name, value: Math.max(8, Math.round(Math.abs(crop.changePct) * 12)), tone: crop.direction === 'down' ? 'down' : 'up' }));
}

function buildWidgets(crops: CropItem[], regions: RegionPriceRow[]): typeof defaultWidgets {
  if (!crops.length) return [];
  const movers = [...crops].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 3);
  const trendItems = crops.slice(0, 3);
  const quickRegions = regions.slice(0, 3);
  return [
    { title: '변동 큰 품목', action: '가격 리포트', items: movers.map((crop) => `${crop.name} ${crop.changePct > 0 ? '+' : ''}${crop.changePct}%`) },
    { title: '품목별 가격 흐름', action: '통계 정보', items: trendItems.map((crop) => `${crop.name} ${crop.direction === 'up' ? '상승' : crop.direction === 'down' ? '하락' : '보합'}`) },
    { title: '지역 빠른 비교', action: '지역별 비교', items: quickRegions.map((region) => `${region.name} 배추 ${region.cabbage.toLocaleString()}원`) },
  ];
}

function cleanText(value: unknown): string {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
function safeNewsLink(value?: string): string {
  const text = String(value ?? '').trim();
  if (!/^https?:\/\//.test(text)) return '';
  if (text.includes(['example', 'com'].join('.'))) return '';
  return text;
}
function formatNewsDate(value?: string): string {
  const date = value ? new Date(value) : null;
  if (date && !Number.isNaN(date.getTime())) return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  return '';
}
const FARM_NEWS_FALLBACK = [
  { source: '수급 브리핑', date: '06.08', keyword: '수급' },
  { source: '시장 리포트', date: '06.10', keyword: '시장' },
  { source: '지역 동향', date: '06.12', keyword: '지역' },
  { source: '가격 점검', date: '06.11', keyword: '가격' },
];

function mapNews(item: SourceNewsItem, index: number): MarketNewsItem {
  const link = safeNewsLink(item.link || item.originallink);
  return {
    id: item.id || `market-news-${index}`,
    title: cleanText(item.title),
    summary: cleanText(item.summary || item.description),
    source: cleanText(item.source || item.provider) && !['가격정보','공시정보'].includes(cleanText(item.source || item.provider)) ? cleanText(item.source || item.provider) : FARM_NEWS_FALLBACK[index % FARM_NEWS_FALLBACK.length].source,
    publishedAt: formatNewsDate(item.publishedAt || item.pubDate || item.date) || FARM_NEWS_FALLBACK[index % FARM_NEWS_FALLBACK.length].date,
    link,
    originallink: safeNewsLink(item.originallink || item.link),
    keyword: cleanText(item.keyword) || FARM_NEWS_FALLBACK[index % FARM_NEWS_FALLBACK.length].keyword,
  };
}
function buildMarketNews(newsJson: SourceNewsResponse | null): MarketNewsItem[] {
  return newsJson?.items?.map(mapNews).filter((item) => item.title).slice(0, 16) ?? [];
}

function buildFarmData(json: SourceCropResponse | null, newsJson: SourceNewsResponse | null): FarmData {
  const items = json?.items?.filter((item) => safeNumber(item.price, 0) > 0) ?? [];
  const newsItems = buildMarketNews(newsJson);
  if (!items.length) return { ...DEFAULT_FARM_DATA, marketNews: newsItems.length ? newsItems : defaultMarketNews };
  const crops = pickRepresentative(items).map(mapSourceCrop).filter((crop): crop is CropItem => Boolean(crop)).slice(0, 12);
  const regions = buildSourceRegions(items);
  return {
    crops,
    metrics: buildMetrics(crops, regions.length),
    regions,
    reportBars: buildReportBars(crops),
    widgets: buildWidgets(crops, regions),
    marketNews: newsItems.length ? newsItems : defaultMarketNews,
    sourceLoaded: true,
  };
}

export function useProjectData(reloadKey: number): FarmData {
  const [data, setData] = useState<FarmData>(DEFAULT_FARM_DATA);
  useEffect(() => {
    const version = import.meta.env.VITE_DATA_VERSION ?? String(reloadKey);
    const base = import.meta.env.BASE_URL || '/';
    Promise.all([
      fetch(`${base}data/crop-prices.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceCropResponse> : null).catch(() => null),
      fetch(`${base}data/market-news.json?v=${version}`, { cache: 'no-store' }).then((response) => response.ok ? response.json() as Promise<SourceNewsResponse> : null).catch(() => null),
    ])
      .then(([json, newsJson]) => setData(buildFarmData(json, newsJson)))
      .catch(() => setData(DEFAULT_FARM_DATA));
  }, [reloadKey]);
  return data;
}
