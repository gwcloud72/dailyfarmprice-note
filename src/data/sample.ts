import type { BottomWidget, ChangeDirection, MetricItem } from '../components/common/types';
import { BarChart2, Copy, Map, TrendingUp } from 'lucide-react';

export const ADMIN_REGION_NAMES = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'];

export interface MarketNewsItem { id: string; title: string; summary: string; source: string; publishedAt: string; link: string; originallink: string; keyword: string; }
export interface CropItem {
  id: string;
  name: string;
  icon: string;
  spec: string;
  region: string;
  market: string;
  price: number;
  change: number;
  changePct: number;
  direction: ChangeDirection;
  series: number[];
}
export interface RegionPriceRow { name: string; cabbage: number; radish: number; onion: number; potato: number; greenonion: number; }
export interface ReportBar { name: string; value: number; tone: 'up' | 'down'; }

export const marketNews: MarketNewsItem[] = [];
export const crops: CropItem[] = [];
export const regions: RegionPriceRow[] = [];
export const reportBars: ReportBar[] = [];
export const widgets: BottomWidget[] = [];

export const metrics: MetricItem[] = [
  { label:'상승 품목', value:'0개', sub:'전일 대비 상승', icon: TrendingUp },
  { label:'하락 품목', value:'0개', sub:'전일 대비 하락', icon: BarChart2 },
  { label:'보합 품목', value:'0개', sub:'변동 없음', icon: Copy },
  { label:'지역 비교', value:'0개', sub:'시도 단위', icon: Map },
];
