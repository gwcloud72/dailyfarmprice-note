import { BarChart2, Leaf, Map, Newspaper, Star } from 'lucide-react';
import type { NavItem } from '../components/common/types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '오늘시세', icon: Leaf },
  { id: 'items', label: '품목비교', icon: BarChart2 },
  { id: 'regions', label: '지역·도매', icon: Map },
  { id: 'market-news', label: '수급뉴스', icon: Newspaper },
  { id: 'trend', label: '관심품목', icon: Star },
];
