import { BarChart2, Bell, Download, FileText, Grid3X3, Home, Map, Newspaper, Search, Star, TrendingUp } from 'lucide-react';
import type { NavItem } from '../components/common/types';
export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'items', label: '품목별 시세', icon: Search },
  { id: 'markets', label: '시장별 가격', icon: Grid3X3 },
  { id: 'trend', label: '가격 리포트', icon: TrendingUp },
  { id: 'regions', label: '지역별 비교', icon: Map },
  { id: 'stats', label: '통계 정보', icon: BarChart2 },
  { id: 'market-news', label: '시장 동향', icon: Newspaper },
  { id: 'alerts', label: '알림 서비스', icon: Bell },
  { id: 'download', label: '데이터 다운로드', icon: Download },
  { id: 'favorites', label: '관심 품목', icon: Star },
  { id: 'guide', label: '이용 안내', icon: FileText },
];
