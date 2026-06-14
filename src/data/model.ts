import type { BottomWidget, ChangeDirection, MetricItem } from '../components/common/types';
import { BarChart2, Copy, Map, TrendingUp } from 'lucide-react';

export const ADMIN_REGION_NAMES = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'];

export const REGION_CROP_OPTIONS = [
  { key: 'cabbage', label: '배추' },
  { key: 'radish', label: '무' },
  { key: 'onion', label: '양파' },
  { key: 'potato', label: '감자' },
  { key: 'greenonion', label: '대파' },
  { key: 'apple', label: '사과' },
  { key: 'cabbageRound', label: '양배추' },
  { key: 'garlic', label: '마늘' },
  { key: 'pepper', label: '풋고추' },
  { key: 'pear', label: '배' },
  { key: 'tomato', label: '토마토' },
  { key: 'lettuce', label: '상추' },
] as const;
export type RegionCropKey = typeof REGION_CROP_OPTIONS[number]['key'];

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
export type RegionPriceRow = { name: string } & Record<RegionCropKey, number>;
export interface ReportBar { name: string; value: number; tone: 'up' | 'down'; }

export const marketNews: MarketNewsItem[] = [
  { id:'market-1', title:'배추·무 도매가, 최근 경매 기준 변동 확인', summary:'가락시장 최근 경매 기준으로 엽채류와 저장 채소 가격을 함께 확인합니다.', source:'수급 브리핑', publishedAt:'06.08', link:'', originallink:'', keyword:'수급' },
  { id:'market-2', title:'양파·대파, 단위별 가격 차이 확인 필요', summary:'1kg·단·상자 단위가 품목별로 달라 비교 시 기준단위를 먼저 확인해야 합니다.', source:'시장 리포트', publishedAt:'06.09', link:'', originallink:'', keyword:'시장' },
  { id:'market-3', title:'과일류는 상자 단위 경락가 중심으로 비교', summary:'사과와 배는 상자 단위 경락가를 기준으로 최근 흐름을 확인하는 방식이 적합합니다.', source:'지역 동향', publishedAt:'06.10', link:'', originallink:'', keyword:'지역' },
  { id:'market-4', title:'풋고추·상추, 단기 가격 변동성 유의', summary:'생육과 반입량 영향을 받는 품목은 단기 변동폭이 커질 수 있어 최근 흐름을 함께 봅니다.', source:'가격 점검', publishedAt:'06.11', link:'', originallink:'', keyword:'가격' }
];

export const crops: CropItem[] = [
  { id:'crop-cabbage', name:'배추', icon:'🥬', spec:'10키로망대 상', region:'전국', market:'전국 도매 평균', price:4647, change:51, changePct:1.1, direction:'up', series:[4452, 4489, 4526, 4563, 4535, 4596, 4647] },
  { id:'crop-radish', name:'무', icon:'🥕', spec:'20키로상자 상', region:'전국', market:'전국 도매 평균', price:18100, change:-140, changePct:-0.8, direction:'down', series:[18900, 18770, 18660, 18520, 18370, 18240, 18100] },
  { id:'crop-onion', name:'양파', icon:'🧅', spec:'1키로 상', region:'전국', market:'전국 도매 평균', price:619, change:7, changePct:1.1, direction:'up', series:[593, 598, 603, 608, 604, 612, 619] },
  { id:'crop-potato', name:'감자', icon:'🥔', spec:'20키로상자 상', region:'전국', market:'전국 도매 평균', price:26350, change:-210, changePct:-0.8, direction:'down', series:[27510, 27320, 27170, 26960, 26750, 26560, 26350] },
  { id:'crop-greenonion', name:'대파', icon:'🌿', spec:'1키로단 상', region:'전국', market:'전국 도매 평균', price:1117, change:12, changePct:1.1, direction:'up', series:[1070, 1079, 1088, 1097, 1090, 1105, 1117] },
  { id:'crop-apple', name:'사과', icon:'🍎', spec:'10키로상자 상', region:'전국', market:'전국 도매 평균', price:55450, change:610, changePct:1.1, direction:'up', series:[53120, 53560, 54010, 54450, 54120, 54840, 55450] },
  { id:'crop-cabbage-round', name:'양배추', icon:'🥬', spec:'8키로망대 상', region:'전국', market:'전국 도매 평균', price:2625, change:-21, changePct:-0.8, direction:'down', series:[2740, 2722, 2706, 2685, 2664, 2646, 2625] },
  { id:'crop-garlic', name:'마늘', icon:'🧄', spec:'3키로 상', region:'전국', market:'전국 도매 평균', price:12640, change:140, changePct:1.1, direction:'up', series:[12110, 12210, 12310, 12410, 12340, 12500, 12640] },
  { id:'crop-pepper', name:'풋고추', icon:'🌶️', spec:'10키로상자 상', region:'전국', market:'전국 도매 평균', price:61580, change:680, changePct:1.1, direction:'up', series:[58990, 59490, 59980, 60470, 60100, 60900, 61580] },
  { id:'crop-pear', name:'배', icon:'🍐', spec:'15키로상자 상', region:'전국', market:'전국 도매 평균', price:63620, change:-510, changePct:-0.8, direction:'down', series:[66420, 65970, 65590, 65080, 64570, 64130, 63620] },
  { id:'crop-tomato', name:'토마토', icon:'🍅', spec:'10키로상자 상', region:'전국', market:'전국 도매 평균', price:14540, change:160, changePct:1.1, direction:'up', series:[13930, 14050, 14160, 14280, 14190, 14380, 14540] },
  { id:'crop-lettuce', name:'상추', icon:'🥬', spec:'4키로상자 상', region:'전국', market:'전국 도매 평균', price:20010, change:40, changePct:0.2, direction:'up', series:[19950, 20030, 19990, 20010, 20050, 19970, 20010] }
];

export const regions: RegionPriceRow[] = [
  { name:'서울', cabbage:4647, radish:18360, onion:624, potato:26430, greenonion:1137, apple:55450, cabbageRound:2625, garlic:12640, pepper:61580, pear:63620, tomato:14540, lettuce:20010 },
  { name:'부산', cabbage:4582, radish:18100, onion:615, potato:26060, greenonion:1121, apple:54674, cabbageRound:2588, garlic:12463, pepper:60719, pear:62730, tomato:14337, lettuce:19730 },
  { name:'대구', cabbage:4610, radish:18210, onion:619, potato:26220, greenonion:1128, apple:55009, cabbageRound:2604, garlic:12539, pepper:61090, pear:63113, tomato:14424, lettuce:19851 },
  { name:'인천', cabbage:4633, radish:18300, onion:622, potato:26350, greenonion:1134, apple:55283, cabbageRound:2617, garlic:12602, pepper:61394, pear:63428, tomato:14496, lettuce:19950 },
  { name:'광주', cabbage:4563, radish:18030, onion:613, potato:25950, greenonion:1117, apple:54448, cabbageRound:2578, garlic:12412, pepper:60467, pear:62470, tomato:14277, lettuce:19648 },
  { name:'대전', cabbage:4591, radish:18140, onion:617, potato:26110, greenonion:1123, apple:54782, cabbageRound:2593, garlic:12488, pepper:60838, pear:62853, tomato:14365, lettuce:19769 },
  { name:'울산', cabbage:4577, radish:18080, onion:615, potato:26030, greenonion:1120, apple:54615, cabbageRound:2585, garlic:12450, pepper:60652, pear:62662, tomato:14321, lettuce:19709 },
  { name:'세종', cabbage:4596, radish:18160, onion:617, potato:26140, greenonion:1124, apple:54841, cabbageRound:2596, garlic:12501, pepper:60904, pear:62922, tomato:14380, lettuce:19790 },
  { name:'경기', cabbage:4628, radish:18280, onion:622, potato:26320, greenonion:1132, apple:55223, cabbageRound:2614, garlic:12588, pepper:61328, pear:63360, tomato:14481, lettuce:19928 },
  { name:'강원', cabbage:4549, radish:17970, onion:611, potato:25870, greenonion:1113, apple:54281, cabbageRound:2570, garlic:12373, pepper:60281, pear:62278, tomato:14233, lettuce:19588 },
  { name:'충북', cabbage:4568, radish:18050, onion:613, potato:25980, greenonion:1118, apple:54507, cabbageRound:2580, garlic:12425, pepper:60533, pear:62538, tomato:14293, lettuce:19670 },
  { name:'충남', cabbage:4573, radish:18060, onion:614, potato:26000, greenonion:1119, apple:54567, cabbageRound:2583, garlic:12439, pepper:60599, pear:62607, tomato:14308, lettuce:19691 },
  { name:'전북', cabbage:4555, radish:18020, onion:612, potato:25930, greenonion:1115, apple:54352, cabbageRound:2573, garlic:12390, pepper:60361, pear:62360, tomato:14252, lettuce:19614 },
  { name:'전남', cabbage:4542, radish:17940, onion:610, potato:25810, greenonion:1110, apple:54197, cabbageRound:2566, garlic:12354, pepper:60189, pear:62182, tomato:14211, lettuce:19558 },
  { name:'경북', cabbage:4580, radish:18090, onion:616, potato:26040, greenonion:1122, apple:54651, cabbageRound:2587, garlic:12458, pepper:60692, pear:62703, tomato:14330, lettuce:19721 },
  { name:'경남', cabbage:4571, radish:18070, onion:614, potato:26010, greenonion:1119, apple:54543, cabbageRound:2582, garlic:12433, pepper:60573, pear:62580, tomato:14302, lettuce:19683 },
  { name:'제주', cabbage:4528, radish:17890, onion:608, potato:25740, greenonion:1106, apple:54030, cabbageRound:2558, garlic:12316, pepper:60003, pear:61991, tomato:14168, lettuce:19498 }
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
  { title:'지역별 비교', action:'지역별 비교', items:['17개 시도 비교','품목별 지역 차이','전국 평균 기준'] }
];

export const metrics: MetricItem[] = [
  { label:'상승 품목', value:'7개', sub:'최근 흐름 상승', icon: TrendingUp },
  { label:'하락 품목', value:'4개', sub:'최근 흐름 하락', icon: BarChart2 },
  { label:'보합 품목', value:'1개', sub:'변동폭 낮음', icon: Copy },
  { label:'지역 비교', value:'17개', sub:'시도 단위', icon: Map }
];
