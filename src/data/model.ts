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

export const marketNews: MarketNewsItem[] = [
  { id:'market-1', title:'배추·무 도매가, 최근 경매 기준 변동 확인', summary:'가락시장 최근 경매 기준으로 엽채류와 저장 채소 가격을 함께 확인합니다.', source:'수급 브리핑', publishedAt:'06.08', link:'', originallink:'', keyword:'수급' },
  { id:'market-2', title:'양파·대파, 단위별 가격 차이 확인 필요', summary:'1kg·단·상자 단위가 품목별로 달라 비교 시 기준단위를 먼저 확인해야 합니다.', source:'시장 리포트', publishedAt:'06.09', link:'', originallink:'', keyword:'시장' },
  { id:'market-3', title:'과일류는 상자 단위 경락가 중심으로 비교', summary:'사과와 배는 상자 단위 경락가를 기준으로 최근 흐름을 확인하는 방식이 적합합니다.', source:'지역 동향', publishedAt:'06.10', link:'', originallink:'', keyword:'지역' },
  { id:'market-4', title:'풋고추·상추, 단기 가격 변동성 유의', summary:'생육과 반입량 영향을 받는 품목은 단기 변동폭이 커질 수 있어 최근 흐름을 함께 봅니다.', source:'가격 점검', publishedAt:'06.11', link:'', originallink:'', keyword:'가격' }
];

export const crops: CropItem[] = [
  { id:'crop-cabbage', name:'배추', icon:'🥬', spec:'10키로망대 상', region:'서울', market:'가락시장', price:4647, change:51, changePct:1.1, direction:'up', series:[4452, 4489, 4526, 4563, 4535, 4596, 4647] },
  { id:'crop-radish', name:'무', icon:'🥕', spec:'20키로상자 상', region:'부산', market:'부산엄궁', price:18100, change:-140, changePct:-0.8, direction:'down', series:[18900, 18770, 18660, 18520, 18370, 18240, 18100] },
  { id:'crop-onion', name:'양파', icon:'🧅', spec:'1키로 상', region:'대구', market:'대구북부', price:619, change:7, changePct:1.1, direction:'up', series:[593, 598, 603, 608, 604, 612, 619] },
  { id:'crop-potato', name:'감자', icon:'🥔', spec:'20키로상자 상', region:'인천', market:'인천남촌', price:26350, change:-210, changePct:-0.8, direction:'down', series:[27510, 27320, 27170, 26960, 26750, 26560, 26350] },
  { id:'crop-greenonion', name:'대파', icon:'🌿', spec:'1키로단 상', region:'광주', market:'각화시장', price:1117, change:12, changePct:1.1, direction:'up', series:[1070, 1079, 1088, 1097, 1090, 1105, 1117] },
  { id:'crop-apple', name:'사과', icon:'🍎', spec:'10키로상자 상', region:'대전', market:'대전오정', price:55450, change:610, changePct:1.1, direction:'up', series:[53120, 53560, 54010, 54450, 54120, 54840, 55450] },
  { id:'crop-cabbage-round', name:'양배추', icon:'🥬', spec:'8키로망대 상', region:'울산', market:'울산도매', price:2625, change:-21, changePct:-0.8, direction:'down', series:[2740, 2722, 2706, 2685, 2664, 2646, 2625] },
  { id:'crop-garlic', name:'마늘', icon:'🧄', spec:'3키로 상', region:'세종', market:'세종시장', price:12640, change:140, changePct:1.1, direction:'up', series:[12110, 12210, 12310, 12410, 12340, 12500, 12640] },
  { id:'crop-pepper', name:'풋고추', icon:'🌶️', spec:'10키로상자 상', region:'경기', market:'구리시장', price:61580, change:680, changePct:1.1, direction:'up', series:[58990, 59490, 59980, 60470, 60100, 60900, 61580] },
  { id:'crop-pear', name:'배', icon:'🍐', spec:'15키로상자 상', region:'강원', market:'춘천도매', price:63620, change:-510, changePct:-0.8, direction:'down', series:[66420, 65970, 65590, 65080, 64570, 64130, 63620] },
  { id:'crop-tomato', name:'토마토', icon:'🍅', spec:'10키로상자 상', region:'충북', market:'청주도매', price:14540, change:160, changePct:1.1, direction:'up', series:[13930, 14050, 14160, 14280, 14190, 14380, 14540] },
  { id:'crop-lettuce', name:'상추', icon:'🥬', spec:'4키로상자 상', region:'충남', market:'천안도매', price:20010, change:40, changePct:0.2, direction:'up', series:[19950, 20030, 19990, 20010, 20050, 19970, 20010] }
];

export const regions: RegionPriceRow[] = [
  { name:'서울', cabbage:4647, radish:18360, onion:624, potato:26430, greenonion:1137 },
  { name:'부산', cabbage:4582, radish:18100, onion:615, potato:26060, greenonion:1121 },
  { name:'대구', cabbage:4610, radish:18210, onion:619, potato:26220, greenonion:1128 },
  { name:'인천', cabbage:4633, radish:18300, onion:622, potato:26350, greenonion:1134 },
  { name:'광주', cabbage:4563, radish:18030, onion:613, potato:25950, greenonion:1117 },
  { name:'대전', cabbage:4591, radish:18140, onion:617, potato:26110, greenonion:1123 },
  { name:'울산', cabbage:4577, radish:18080, onion:615, potato:26030, greenonion:1120 },
  { name:'세종', cabbage:4596, radish:18160, onion:617, potato:26140, greenonion:1124 },
  { name:'경기', cabbage:4628, radish:18280, onion:622, potato:26320, greenonion:1132 },
  { name:'강원', cabbage:4549, radish:17970, onion:611, potato:25870, greenonion:1113 },
  { name:'충북', cabbage:4568, radish:18050, onion:613, potato:25980, greenonion:1118 },
  { name:'충남', cabbage:4573, radish:18060, onion:614, potato:26000, greenonion:1119 }
];

export const reportBars: ReportBar[] = [
  { name:'풋고추', value:79, tone:'up' },
  { name:'대파', value:60, tone:'up' },
  { name:'배추', value:52, tone:'up' },
  { name:'무', value:48, tone:'down' },
  { name:'양배추', value:41, tone:'down' },
  { name:'감자', value:36, tone:'down' },
  { name:'배', value:31, tone:'down' },
  { name:'사과', value:29, tone:'up' }
];

export const widgets: BottomWidget[] = [
  { title:'변동 큰 품목', action:'가격 리포트', items:['풋고추 +6.6%', '대파 +5.0%', '배추 +4.3%'] },
  { title:'품목별 가격 흐름', action:'통계 정보', items:['배추 상승','무 하락','양파 상승'] },
  { title:'지역 빠른 비교', action:'지역별 비교', items:['서울 배추 4,647원','부산 배추 4,582원','대구 배추 4,610원'] }
];

export const metrics: MetricItem[] = [
  { label:'상승 품목', value:'7개', sub:'최근 흐름 상승', icon: TrendingUp },
  { label:'하락 품목', value:'4개', sub:'최근 흐름 하락', icon: BarChart2 },
  { label:'보합 품목', value:'1개', sub:'변동폭 낮음', icon: Copy },
  { label:'지역 비교', value:'17개', sub:'시도 단위', icon: Map }
];
