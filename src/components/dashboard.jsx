
import { useEffect, useMemo, useState } from 'react';
import koreaMap from '../assets/korea-market-map.png';
import cabbageImg from '../assets/crop-cabbage.svg';
import radishImg from '../assets/crop-radish.svg';
import appleImg from '../assets/crop-apple.svg';
import greenOnionImg from '../assets/crop-greenonion.svg';
import garlicImg from '../assets/crop-garlic.svg';
import onionImg from '../assets/crop-onion.svg';
import potatoImg from '../assets/crop-potato.svg';
import sweetPotatoImg from '../assets/crop-sweetpotato.svg';
import carrotImg from '../assets/crop-carrot.svg';
import tomatoImg from '../assets/crop-tomato.svg';
import cucumberImg from '../assets/crop-cucumber.svg';
import roundCabbageImg from '../assets/crop-cabbage-round.svg';
import spinachImg from '../assets/crop-spinach.svg';
import lettuceImg from '../assets/crop-lettuce.svg';
import zucchiniImg from '../assets/crop-zucchini.svg';
import pepperImg from '../assets/crop-pepper.svg';
import pearImg from '../assets/crop-pear.svg';
import tangerineImg from '../assets/crop-tangerine.svg';

const DATA_URL = `${import.meta.env.BASE_URL}data/crop-prices.json`;
const MAX_CROP_DATA_AGE_DAYS = 7;

function withCacheBust(url) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(import.meta.env.VITE_DATA_VERSION || import.meta.env.MODE || 'local')}&t=${Date.now()}`;
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateOnly(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return parseDate(value);
  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00+09:00`);
}

function daysOld(date) {
  if (!date) return Infinity;
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / 86400000);
}

function formatDateShort(value) {
  const date = dateOnly(value);
  if (!date) return '날짜 없음';
  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\.$/, '');
}

function latestSeriesDate(items) {
  let latest = null;
  for (const item of Array.isArray(items) ? items : []) {
    for (const point of Array.isArray(item?.series) ? item.series : []) {
      const pointDate = dateOnly(point?.date);
      if (pointDate && (!latest || pointDate > latest)) latest = pointDate;
    }
  }
  return latest;
}


const imageByCropName = {
  배추: cabbageImg,
  무: radishImg,
  사과: appleImg,
  대파: greenOnionImg,
  마늘: garlicImg,
  양파: onionImg,
  감자: potatoImg,
  고구마: sweetPotatoImg,
  당근: carrotImg,
  토마토: tomatoImg,
  오이: cucumberImg,
  양배추: roundCabbageImg,
  시금치: spinachImg,
  상추: lettuceImg,
  호박: zucchiniImg,
  풋고추: pepperImg,
  배: pearImg,
  감귤: tangerineImg,
};

const TRACKED_CROP_CATALOG = [
  '배추', '무', '양파', '감자', '대파', '오이',
  '사과', '배', '마늘', '고구마', '당근', '토마토',
  '양배추', '시금치', '상추', '호박', '풋고추', '감귤',
];

const ADMIN_REGIONS = [
  { short: '서울', full: '서울특별시' },
  { short: '부산', full: '부산광역시' },
  { short: '대구', full: '대구광역시' },
  { short: '인천', full: '인천광역시' },
  { short: '광주', full: '광주광역시' },
  { short: '대전', full: '대전광역시' },
  { short: '울산', full: '울산광역시' },
  { short: '세종', full: '세종특별자치시' },
  { short: '경기', full: '경기도' },
  { short: '강원', full: '강원특별자치도' },
  { short: '충북', full: '충청북도' },
  { short: '충남', full: '충청남도' },
  { short: '전북', full: '전북특별자치도' },
  { short: '전남', full: '전라남도' },
  { short: '경북', full: '경상북도' },
  { short: '경남', full: '경상남도' },
  { short: '제주', full: '제주특별자치도' },
];
const ADMIN_REGION_NAMES = ['전국', ...ADMIN_REGIONS.map((region) => region.short)];
const ADMIN_REGION_ORDER = new Map(ADMIN_REGION_NAMES.map((name, index) => [name, index]));
const CITY_TO_ADMIN_REGION = {
  서울: '서울', 부산: '부산', 대구: '대구', 인천: '인천', 광주: '광주', 대전: '대전', 울산: '울산', 세종: '세종',
  수원: '경기', 성남: '경기', 의정부: '경기', 고양: '경기', 용인: '경기', 경기: '경기', 경기도: '경기',
  춘천: '강원', 강릉: '강원', 강원: '강원', 강원도: '강원', 강원특별자치도: '강원',
  청주: '충북', 충북: '충북', 충청북도: '충북',
  천안: '충남', 충남: '충남', 충청남도: '충남',
  전주: '전북', 전북: '전북', 전라북도: '전북', 전북특별자치도: '전북',
  순천: '전남', 전남: '전남', 전라남도: '전남',
  포항: '경북', 안동: '경북', 경북: '경북', 경상북도: '경북',
  창원: '경남', 김해: '경남', 경남: '경남', 경상남도: '경남',
  제주: '제주', 제주도: '제주', 제주특별자치도: '제주',
};

function normalizeAdminRegion(value) {
  const raw = String(value || '').replace(/평균|시장|광역시|특별시|특별자치시|특별자치도|자치도|도/g, '').trim();
  if (!raw || raw === '전국') return '전국';
  return CITY_TO_ADMIN_REGION[raw] || CITY_TO_ADMIN_REGION[String(value || '').trim()] || raw;
}

function regionDisplayName(shortName) {
  return ADMIN_REGIONS.find((region) => region.short === shortName)?.full || shortName;
}

function orderAdminRegions(a, b) {
  return (ADMIN_REGION_ORDER.get(a.city) ?? 999) - (ADMIN_REGION_ORDER.get(b.city) ?? 999);
}

function averageRegionSnapshots(snapshots) {
  const valid = snapshots.filter((item) => Number.isFinite(item.price));
  if (!valid.length) return { price: null, change: null };
  const price = Math.round(valid.reduce((sum, item) => sum + item.price, 0) / valid.length);
  const validChanges = valid.filter((item) => Number.isFinite(item.change));
  const change = validChanges.length ? Math.round(validChanges.reduce((sum, item) => sum + item.change, 0) / validChanges.length) : null;
  return { price, change };
}

function parseNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatUpdateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'KAMIS · 갱신시각 없음';
  return `KAMIS · ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신`;
}

function normalizeCropPayload(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) return { crops: [], generatedAt: payload?.generatedAt || null, status: payload?.status || 'empty', source: payload?.source || null };

  const latestDate = latestSeriesDate(items);
  if (!latestDate || daysOld(latestDate) > MAX_CROP_DATA_AGE_DAYS) {
    return {
      crops: [],
      generatedAt: payload?.generatedAt || null,
      status: 'stale',
      source: payload?.source || null,
      latestDate: latestDate ? latestDate.toISOString().slice(0, 10) : null,
      message: latestDate
        ? `KAMIS 데이터의 최신 기준일이 ${latestDate.toISOString().slice(0, 10)}로 오래되어 화면에 표시하지 않았습니다.`
        : 'KAMIS 데이터에 기준일이 없어 운영 화면에 표시하지 않았습니다.',
    };
  }

  const groups = new Map();
  items.forEach((item) => {
    const name = String(item.name || item.baseId || item.id || '').trim();
    if (!name) return;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  });

  const normalized = [...groups.entries()].map(([name, group]) => {
    const primary = group.find((item) => ['전국', '서울'].includes(item.region)) || group[0];
    const series = Array.isArray(primary.series) ? primary.series : [];
    const cleanSeries = series
      .map((point) => ({ date: point.date, price: parseNumber(point.price, null) }))
      .filter((point) => point.price !== null && dateOnly(point.date))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const recentSeries = cleanSeries.slice(-90);
    const chartSeries = recentSeries.slice(-7);
    const values = chartSeries.map((point) => point.price);
    const labels = chartSeries.map((point) => formatDateShort(point.date));
    if (!values.length) return null;
    const latest = values[values.length - 1];
    const previous = values.length > 1 ? values[values.length - 2] : latest;
    const change = latest - previous;
    const rate = previous ? `${Math.abs((change / previous) * 100).toFixed(1)}%` : '0.0%';
    const groupedRegions = new Map();
    group.forEach((item) => {
      const adminName = normalizeAdminRegion(item.region);
      if (!adminName || adminName === '전국') return;
      const itemSeries = (Array.isArray(item.series) ? item.series : [])
        .map((point) => ({ date: point.date, price: parseNumber(point.price, null) }))
        .filter((point) => point.price !== null && dateOnly(point.date))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const latestPoint = itemSeries.at(-1) || {};
      const prevPoint = itemSeries.at(-2) || latestPoint;
      const price = parseNumber(latestPoint.price, null);
      const prevPrice = parseNumber(prevPoint.price, price);
      if (!groupedRegions.has(adminName)) groupedRegions.set(adminName, []);
      groupedRegions.get(adminName).push({ price, change: price !== null && prevPrice !== null ? price - prevPrice : null });
    });
    const regions = ADMIN_REGIONS.map((region) => {
      const averaged = averageRegionSnapshots(groupedRegions.get(region.short) || []);
      return {
        market: `${region.full} 평균`,
        city: region.short,
        price: averaged.price,
        change: averaged.change,
        missing: averaged.price === null,
      };
    }).sort(orderAdminRegions);

    return {
      name,
      grade: primary.kindName || '상품',
      unit: primary.unit || '1kg',
      wholesale: latest,
      consumer: latest,
      change,
      rate,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
      image: imageByCropName[name] || null,
      series: recentSeries,
      data: values,
      labels,
      regions: regions.length ? regions : [{ market: '지역 데이터 없음', city: '지역', price: latest, change }],
      latestDate: chartSeries.at(-1)?.date || null,
    };
  }).filter(Boolean);

  return normalized.length
    ? { crops: normalized, generatedAt: payload.generatedAt, status: payload.status || 'live', source: payload.source || 'KAMIS Open API', latestDate: latestDate.toISOString().slice(0, 10) }
    : { crops: [], generatedAt: payload?.generatedAt || null, status: 'empty', source: payload?.source || null };
}

function useLiveCropData(refreshKey = 0) {
  const [live, setLive] = useState({ crops: [], generatedAt: null, status: 'loading', source: null });
  useEffect(() => {
    let ignore = false;
    fetch(withCacheBust(DATA_URL), { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (ignore) return;
        const normalized = normalizeCropPayload(payload);
        if (normalized) {
          setLive(normalized);
          return;
        }
        setLive({
          crops: [],
          generatedAt: payload?.generatedAt || null,
          status: payload?.status || 'empty',
          source: payload?.source || null,
        });
      })
      .catch((error) => {
        if (ignore) return;
        setLive({ crops: [], generatedAt: null, status: 'error', source: null, message: error?.message || '데이터 요청 실패' });
      });
    return () => { ignore = true; };
  }, [refreshKey]);
  return live;
}

const CHANGE_TOKENS = {
  up: { icon: '▲', label: '상승', className: 'is-up', badge: '부담 증가' },
  down: { icon: '▼', label: '하락', className: 'is-down', badge: '장보기 유리' },
  flat: { icon: '—', label: '보합', className: 'is-flat', badge: '보합' },
};

const navItems = [
  { id: 'home', label: '홈', icon: '⌂' },
  { id: 'items', label: '품목별 시세', icon: '▤' },
  { id: 'regions', label: '지역별 비교', icon: '◇' },
  { id: 'reports', label: '가격 리포트', icon: '☰' },
  { id: 'favorites', label: '관심 품목', icon: '♡' },
  { id: 'guide', label: '데이터 안내', icon: 'ⓘ' },
];

const EMPTY_CROP = {
  name: '데이터 없음',
  grade: '상품',
  unit: 'kg',
  wholesale: 0,
  consumer: 0,
  change: 0,
  rate: '0.0%',
  trend: 'flat',
  image: null,
  data: [0, 0, 0, 0, 0, 0, 0],
  regions: [{ market: '지역 데이터 없음', city: '지역', price: 0, change: 0 }],
};

function buildSummaryRows(cropList) {
  const counts = cropList.reduce((acc, crop) => {
    const trend = crop.trend || trendFromData(crop.data || []);
    acc[trend] = (acc[trend] || 0) + 1;
    return acc;
  }, { up: 0, down: 0, flat: 0 });
  return [
    { label: '상승 품목', value: `${counts.up || 0}개`, trend: 'up', width: counts.up >= counts.down ? 'long' : 'mid' },
    { label: '하락 품목', value: `${counts.down || 0}개`, trend: 'down', width: counts.down >= counts.up ? 'long' : 'mid' },
    { label: '보합 품목', value: `${counts.flat || 0}개`, trend: 'flat', width: 'short' },
  ];
}

const quickTags = TRACKED_CROP_CATALOG;
const periods = ['7일', '30일', '90일'];
const grades = ['상품', '중품', '하품'];

function formatWon(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '대기';
  return `${number.toLocaleString('ko-KR')}원`;
}

function getCrop(name, list = []) {
  return list.find((crop) => crop.name === name) || list[0] || EMPTY_CROP;
}

function changeType(value) {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'flat';
}

function trendFromData(data) {
  return changeType(data[data.length - 1] - data[0]);
}

function chartSeriesFor(crop, period) {
  const maxPoints = Number.parseInt(period, 10) || 7;
  const series = Array.isArray(crop.series) && crop.series.length
    ? crop.series.slice(-maxPoints)
    : (crop.data || []).slice(-maxPoints).map((price, index) => ({ date: `지점 ${index + 1}`, price }));
  return {
    values: series.map((point) => parseNumber(point.price, 0)),
    labels: series.map((point, index) => point.date ? formatDateShort(point.date) : `지점 ${index + 1}`),
  };
}

const CHART_LEFT = 68;
const CHART_RIGHT = 690;
const CHART_TOP = 52;
const CHART_BOTTOM = 190;

function chartX(index, total) {
  if (total <= 1) return CHART_LEFT;
  return CHART_LEFT + ((CHART_RIGHT - CHART_LEFT) / (total - 1)) * index;
}

function chartY(value, min, max) {
  const range = Math.max(1, max - min);
  return CHART_BOTTOM - ((value - min) / range) * (CHART_BOTTOM - CHART_TOP);
}

function shouldShowAxisLabel(index, total) {
  if (total <= 10) return true;
  const step = Math.ceil(total / 7);
  return index === 0 || index === total - 1 || index % step === 0;
}

function chartPoints(data, min, max) {
  return data.map((value, index) => `${chartX(index, data.length)},${Math.round(chartY(value, min, max))}`).join(' ');
}

function yTicks(min, max) {
  return Array.from({ length: 5 }, (_, index) => Math.round(max - ((max - min) / 4) * index));
}


function normalizeTabId(value) {
  const id = String(value || 'home');
  return navItems.some((item) => item.id === id) ? id : 'home';
}

function readInitialTab() {
  try {
    if (typeof window === 'undefined') return 'home';
    const rawHash = window.location.hash.replace(/^#/, '');
    const [hashId, queryString = ''] = rawHash.split('?');
    const params = new URLSearchParams(queryString);
    return normalizeTabId(params.get('tab') || hashId || 'home');
  } catch {
    return 'home';
  }
}

function Sidebar({ tab, updateTab, favoriteCount }) {
  return (
    <aside className="side">
      <a href="#main-content" className="skip-link">본문 바로가기</a>
      <div className="brand"><span>⌁</span><b>농산물 가격정보</b></div>
      <nav aria-label="농산물 가격정보 메뉴">
        {navItems.map((item) => (
          <button type="button" onClick={() => updateTab(item.id)} aria-current={tab === item.id ? 'page' : undefined} className={tab === item.id ? 'on' : ''} key={item.id}>
            <span>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
      <button type="button" onClick={() => updateTab('favorites')} className="manage">★ 관심 품목 {favoriteCount}개</button>
      <p>출처: KAMIS · 통계청</p>
    </aside>
  );
}

function Header({ refreshing, onRefresh, updateLabel }) {
  return (
    <header>
      <span className="header-space" />
      <div className="update" aria-live="polite"><i /> {updateLabel} <button type="button" onClick={onRefresh}><span className={refreshing ? 'spinner spinning' : 'spinner'}>↻</span> 새로고침</button></div>
    </header>
  );
}

function SearchPanel({ selectedCrop, selectedName, selectedGrade, searchTerm, onSearchTermChange, onSearchSubmit, filterOpen, onToggleFilter, regionFilter, onRegionFilterChange, priceBasis, onPriceBasisChange, onSelect, onGradeChange, quickTagList = quickTags }) {
  const submit = (event) => {
    event.preventDefault();
    onSearchSubmit();
  };
  return (
    <section className="search-panel" aria-label="품목 검색과 필터">
      <form className="search-row" onSubmit={submit}>
        <b>품목 검색</b>
        <label>
          <input aria-label="품목명 검색" value={searchTerm} onChange={(event) => onSearchTermChange(event.target.value)} placeholder="품목명을 검색하세요" />
          <span>⌕</span>
        </label>
        <button type="button" onClick={onToggleFilter} aria-expanded={filterOpen}>지역 <strong>{regionFilter}</strong></button>
        <button type="button" onClick={onToggleFilter} aria-expanded={filterOpen}>시세 기준 <strong>{priceBasis}</strong></button>
        <div className="grade-tabs" aria-label="등급 선택">
          {grades.map((grade) => <button type="button" key={grade} onClick={() => onGradeChange(grade)} aria-pressed={selectedGrade === grade}>{grade}</button>)}
        </div>
        <button type="button" onClick={submit} className="search-submit">조회하기</button>
      </form>
      {filterOpen ? (
        <div className="filter-panel" role="region" aria-label="상세 필터">
          <div><b>지역</b>{ADMIN_REGION_NAMES.map((item) => <button type="button" key={item} onClick={() => onRegionFilterChange(item)} aria-pressed={regionFilter === item}>{item}</button>)}</div>
          <div><b>시세 기준</b>{['도매 평균', '소매 평균'].map((item) => <button type="button" key={item} onClick={() => onPriceBasisChange(item)} aria-pressed={priceBasis === item}>{item}</button>)}</div>
        </div>
      ) : null}
      <div className="result-card">
        <b>{selectedName} 검색 결과</b>
        <span>도매 기준 <strong>{formatWon(selectedCrop.wholesale)}/{selectedCrop.unit}</strong></span>
        <span>소비자 체감 <em>≈ {formatWon(selectedCrop.consumer)}/kg</em></span>
      </div>
      <div className="quick-tags">
        <b>많이 찾는 품목</b>
        {quickTagList.map((tag) => (
          <button type="button" onClick={() => onSelect(tag)} aria-pressed={selectedName === tag} className={selectedName === tag ? 'selected' : ''} key={tag}>{tag}</button>
        ))}
      </div>
    </section>
  );
}

function CropCards({ selectedName, onSelect, items, onPrev, onNext }) {
  return (
    <section className="section-card price-card">
      <div className="section-head compact">
        <div><h2>오늘의 주요 품목 시세 <small>클릭하면 차트가 바뀝니다</small></h2></div>
        <div className="arrow-set"><button type="button" onClick={onPrev} aria-label="이전 품목">‹</button><button type="button" onClick={onNext} aria-label="다음 품목">›</button></div>
      </div>
      <div className="crop-grid">
        {items.slice(0, 5).map((crop) => {
          const token = CHANGE_TOKENS[crop.trend];
          return (
            <article key={crop.name} className={`${token.className} ${selectedName === crop.name ? 'selected' : ''}`}>
              <button type="button" onClick={() => onSelect(crop.name)} aria-pressed={selectedName === crop.name}>
                <span className="crop-image"><img src={crop.image || onionImg} alt="" /></span>
                <div>
                  <h3>{crop.name} <small className="grade-badge">{crop.grade}</small></h3>
                  <strong>{formatWon(crop.wholesale)}<em>/{crop.unit}</em></strong>
                  <p>전일 대비 <b>{token.icon} {Math.abs(crop.change).toLocaleString('ko-KR')}원 ({crop.rate})</b></p>
                  {crop.trend === 'down' ? <i>{token.icon} {token.badge}</i> : <i className="warn">⚠ 등락 주의</i>}
                </div>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TrendChart({ selectedCrop, selectedGrade, compareName, period, onPeriodChange, onToggleCompare, onOpenAll, cropList }) {
  const compareCrop = compareName ? getCrop(compareName, cropList) : null;
  const mainChart = chartSeriesFor(selectedCrop, period);
  const compareChart = compareCrop ? chartSeriesFor(compareCrop, period) : { values: [], labels: [] };
  const mainData = mainChart.values;
  const compareData = compareChart.values;
  const labels = mainChart.labels;
  const allData = [...mainData, ...compareData];
  const min = Math.floor(Math.min(...allData) * 0.95);
  const max = Math.ceil(Math.max(...allData) * 1.05);
  const ticks = yTicks(min, max);
  const mainTrend = trendFromData(mainData);
  const compareTrend = compareCrop ? trendFromData(compareData) : 'flat';
  const [activePoint, setActivePoint] = useState(mainData.length - 1);
  useEffect(() => {
    setActivePoint(mainData.length - 1);
  }, [selectedCrop.name, period, compareName, mainData.length]);
  const activeIndex = Math.min(activePoint, mainData.length - 1);
  const activeValue = mainData[activeIndex];
  const activeX = chartX(activeIndex, mainData.length);
  const activeY = chartY(activeValue, min, max);

  return (
    <section className="section-card chart-card" aria-live="polite">
      <div className="section-head">
        <div>
          <p className="eyebrow">현재 선택 품목 · {selectedCrop.name}</p>
          <h2>{selectedCrop.name}({selectedGrade}) 가격 추이</h2>
        </div>
        <div className="chart-actions">
          <button type="button" onClick={onToggleCompare} className="compare-btn">+ 비교 품목</button>
          <div className="segment">
            {periods.map((label) => <button type="button" onClick={() => onPeriodChange(label)} aria-pressed={period === label} key={label}>{label}</button>)}
          </div>
        </div>
      </div>
      <p className="legend"><i className={mainTrend} />{selectedCrop.name}({selectedGrade}){compareCrop ? <><i className={compareTrend} />{compareCrop.name}({compareCrop.grade})</> : null}</p>
      <svg viewBox="0 0 720 250" role="img" aria-label={`${selectedCrop.name} 가격 추이`} tabIndex="0" onFocus={() => setActivePoint(mainData.length - 1)} onMouseEnter={() => setActivePoint(mainData.length - 1)}>
        {ticks.map((tick, index) => {
          const y = 48 + index * 35;
          return <g key={tick}><line x1="58" x2="690" y1={y} y2={y} /><text x="6" y={y + 4}>{tick.toLocaleString('ko-KR')}</text></g>;
        })}
        {labels.map((date, index) => shouldShowAxisLabel(index, labels.length) ? <text key={`${date}-${index}`} x={chartX(index, labels.length) - 14} y="232">{date}</text> : null)}
        <polyline className={`trend-line ${mainTrend}`} points={chartPoints(mainData, min, max)} />
        {compareCrop ? <polyline className={`trend-line compare ${compareTrend}`} points={chartPoints(compareData, min, max)} /> : null}
        {mainData.map((value, index) => <circle key={`${value}-${index}`} className={index === activeIndex ? 'dot active' : 'dot'} cx={chartX(index, mainData.length)} cy={chartY(value, min, max)} r={index === activeIndex ? 6 : 3.5} onMouseEnter={() => setActivePoint(index)} onFocus={() => setActivePoint(index)} tabIndex="0" />)}
        <g className="callout"><line x1={activeX} x2={activeX} y1="36" y2="198" /><rect x={Math.max(58, Math.min(542, activeX - 90))} y={Math.max(24, activeY - 34)} width="128" height="28" rx="14" /><text x={Math.max(72, Math.min(556, activeX - 76))} y={Math.max(43, activeY - 15)}>{formatWon(activeValue)}/kg</text></g>
      </svg>
      <div className="chart-foot"><span>선택 품목과 비교 품목은 최대 2개 라인까지 표시됩니다.</span><button type="button" onClick={onOpenAll}>전체 시세 보기 ›</button></div>
    </section>
  );
}

function SummaryCard({ onOpenAll, cropList }) {
  const rows = buildSummaryRows(cropList);
  return (
    <section className="section-card summary-card">
      <div className="section-head compact"><h2>가격 요약 <small>(전일 대비)</small></h2></div>
      {rows.map((row) => <article key={row.label} className={`${CHANGE_TOKENS[row.trend].className} ${row.width}`}><b>{CHANGE_TOKENS[row.trend].icon} {row.label}</b><strong>{row.value}</strong><span /></article>)}
      <button type="button" onClick={onOpenAll} className="outline">전체 품목 시세 보기 ›</button>
    </section>
  );
}

function RegionCard({ selectedCrop, selectedGrade, selectedRegion, onRegionSelect, onOpenRegions }) {
  const prices = [...(selectedCrop.regions || [])].sort(orderAdminRegions);
  const pricedRows = prices.filter((row) => Number.isFinite(row.price));
  const min = pricedRows.length ? Math.min(...pricedRows.map((row) => row.price)) : 0;
  const max = pricedRows.length ? Math.max(...pricedRows.map((row) => row.price)) : 0;
  const active = prices.find((row) => row.market === selectedRegion) || pricedRows[0] || prices[0];

  return (
    <section className="section-card region-card">
      <div className="section-head compact">
        <h2>지역별 가격 비교 <small>({selectedCrop.name} / {selectedGrade})</small></h2><em>전국 17개 시도 · 단위: 원/kg</em>
      </div>
      <div className="region-body">
        <div className="map-panel interactive-map">
          <img src={koreaMap} alt="대한민국 17개 시도 시장 위치 지도" />
          <span className="map-badge">{selectedCrop.name} 조회중</span>
          {prices.map((row, index) => {
            const hasPrice = Number.isFinite(row.price);
            const size = hasPrice ? Math.round(((row.price - min) / Math.max(1, max - min)) * 3) + 1 : 1;
            return <button type="button" key={row.market} onClick={() => onRegionSelect(row.market)} aria-pressed={selectedRegion === row.market} disabled={!hasPrice} className={`market-dot p${index} size-${size} ${hasPrice ? '' : 'missing'}`}>{row.city}</button>;
          })}
          {active ? <div className={`market-popover popover-${Math.max(0, prices.findIndex((row) => row.market === active.market))}`} role="status">
            <b>{active.market}</b>
            <span>{selectedCrop.name}({selectedGrade}) · {Number.isFinite(active.price) ? `${formatWon(active.price)}/kg` : '데이터 대기'}</span>
            <em>{Number.isFinite(active.change) ? `전일 대비 ${CHANGE_TOKENS[changeType(active.change)].icon}${Math.abs(active.change).toLocaleString('ko-KR')}` : '전일 대비 없음'}</em>
          </div> : null}
        </div>
        <div className="bar-list region-scroll">
          {prices.map((row, index) => {
            const trend = changeType(row.change);
            return <button type="button" key={row.market} onClick={() => onRegionSelect(row.market)} className={selectedRegion === row.market ? 'active' : ''} disabled={!Number.isFinite(row.price)}><b>{row.market}</b><span><i className={`w${Math.min(index, 16)}`} /></span><strong className={Number.isFinite(row.price) ? CHANGE_TOKENS[trend].className : 'is-flat'}>{Number.isFinite(row.price) ? row.price.toLocaleString('ko-KR') : '대기'}</strong></button>;
          })}
        </div>
      </div>
      <button type="button" onClick={onOpenRegions} className="outline">지역별 더보기 ›</button>
    </section>
  );
}

function MarketCard({ selectedCrop, onOpenReport }) {
  const officialText = selectedCrop.trend === 'down'
    ? '최근 기준 가격이 하락해 소비자 체감 부담이 낮아진 상태입니다.'
    : selectedCrop.trend === 'up'
      ? '최근 기준 가격이 상승해 구매 전 지역별 가격 확인이 필요합니다.'
      : '최근 기준 가격이 전일과 비슷한 수준을 유지하고 있습니다.';
  const availableRegions = (selectedCrop.regions || []).filter((region) => Number.isFinite(region.price)).length;
  const rows = [
    { name: selectedCrop.name, text: officialText },
    { name: selectedCrop.name, text: `전국 17개 시도 중 ${availableRegions}개 지역의 가격 데이터가 확보되어 비교에 사용됩니다.` },
  ];
  return (
    <section className="section-card market-card">
      <div className="section-head compact"><h2>시장 동향 요약 <span className="source-badge official">KAMIS 공식 동향</span></h2></div>
      {rows.map((item) => <article key={`${item.name}-${item.text}`}><span><img src={selectedCrop.image || cabbageImg} alt="" /></span><div><b>{item.name}</b><p>{item.text}</p></div></article>)}
      <button type="button" onClick={onOpenReport} className="outline">동향 전체 리포트 ›</button>
    </section>
  );
}

function AiInsight({ selectedCrop, onOpenAi }) {
  return (
    <section className="section-card ai-insight">
      <div className="section-head compact"><h2>AI 인사이트 <span className="source-badge ai" title="KAMIS 공식 동향과 AI 분석은 출처와 역할이 다릅니다.">AI 분석 · Beta</span></h2></div>
      <p>이번 주 {selectedCrop.name}은 {selectedCrop.trend === 'down' ? '구매 적기에 가까워요. 가격이 안정되는 지역부터 확인해보세요.' : selectedCrop.trend === 'up' ? '가격 부담이 커지고 있어요. 구매 시점을 나누는 것이 좋아요.' : '큰 변동 없이 유지되고 있어요. 주변 시장 가격을 비교해보세요.'}</p>
      <button type="button" onClick={onOpenAi} className="outline">AI 분석 더 보기 ›</button>
    </section>
  );
}

function FavoriteCard({ favoriteNames, onToggleFavorite, onSelect, onManage, cropList }) {
  const favoriteCrops = cropList.filter((crop) => favoriteNames.includes(crop.name)).slice(0, 4);
  return (
    <section className="section-card favorites-card">
      <div className="section-head compact"><h2>내 관심 품목</h2><button type="button" onClick={onManage}>관리</button></div>
      {favoriteCrops.map((crop) => {
        const token = CHANGE_TOKENS[crop.trend];
        return <article key={crop.name} className={token.className}><button type="button" onClick={() => onSelect(crop.name)}><b>★ {crop.name} <small className="grade-badge">{crop.grade}</small></b><strong>{formatWon(crop.consumer)}/kg</strong><span>{token.icon} {Math.abs(crop.change).toLocaleString('ko-KR')}</span></button><button type="button" onClick={() => onToggleFavorite(crop.name)} aria-label={`${crop.name} 관심 품목 제거`}>×</button></article>;
      })}
      <button type="button" onClick={onManage} className="outline">관심 품목 설정하기 ›</button>
    </section>
  );
}


function PageIntro({ eyebrow, title, description, children }) {
  return (
    <section className="tab-intro">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      {children ? <div className="tab-intro-actions">{children}</div> : null}
    </section>
  );
}

function DataEmptyState({ status, latestDate, message, onOpenGuide, onRefresh }) {
  const isLoading = status === 'loading';
  const isStale = status === 'stale';
  const title = isLoading ? 'KAMIS 데이터를 확인하고 있습니다' : isStale ? 'KAMIS 데이터가 오래되어 표시하지 않았습니다' : 'KAMIS 실데이터 연결 대기 중입니다';
  const description = isLoading
    ? '배포된 public/data/crop-prices.json을 불러와 화면에 반영합니다.'
    : isStale
      ? `${message || 'KAMIS 데이터 기준일이 오래되어 운영 화면에 표시하지 않습니다.'} Actions를 다시 실행해 최신 JSON을 갱신하세요.`
      : '현재 public/data/crop-prices.json에 실데이터가 없어 임의 가격을 대신 보여주지 않습니다. GitHub Secrets에 KAMIS_CERT_ID/KAMIS_CERT_KEY를 등록하고 Actions를 실행하면 실제 시세가 표시됩니다.';
  return (
    <section className="section-card data-empty-card" role="status" aria-live="polite">
      <div>
        <p className="eyebrow">운영 데이터 상태</p>
        <h2>{title}</h2>
        <span>{description}</span>
        <ul>
          <li>클라이언트에서 임의 가격을 생성하지 않음</li>
          <li>GitHub Actions 갱신 JSON이 있으면 해당 데이터만 우선 사용</li>
          <li>데이터가 비어 있거나 기준일이 {MAX_CROP_DATA_AGE_DAYS}일을 넘기면 빈 상태 안내를 표시</li>
          {isStale && latestDate ? <li>차단된 최신 기준일: {latestDate}</li> : null}
        </ul>
      </div>
      <div className="data-empty-actions">
        <button type="button" onClick={onRefresh}>데이터 다시 확인</button>
        <button type="button" onClick={onOpenGuide}>연동 방식 보기</button>
      </div>
    </section>
  );
}



function TrackedCropCatalog() {
  return (
    <section className="section-card tracked-catalog-card">
      <div className="section-head compact"><h2>수집 대상 농산물</h2><span>KAMIS Actions가 갱신하면 가격 카드로 전환됩니다.</span></div>
      <div className="tracked-catalog-grid">
        {TRACKED_CROP_CATALOG.map((name) => (
          <article key={name}>
            <span>{imageByCropName[name] ? <img src={imageByCropName[name]} alt="" /> : name.slice(0, 1)}</span>
            <b>{name}</b>
          </article>
        ))}
      </div>
    </section>
  );
}

function FarmDataWaitPage({ tab, liveData, regionFilter, onRegionFilterChange, priceBasis, onPriceBasisChange, selectedGrade, onGradeChange, filterOpen, onToggleFilter, onOpenGuide, onRefresh }) {
  const meta = {
    home: ['농산물 가격정보', '실데이터 준비 전 홈 상태입니다', '탭과 필터는 반응하지만 임의 가격은 표시하지 않습니다.'],
    items: ['품목별 시세', '품목 탭은 열려 있습니다', 'KAMIS 품목 데이터가 들어오면 검색·품목 칩·차트가 이 화면에 표시됩니다.'],
    regions: ['지역별 비교', '지역 비교 탭은 열려 있습니다', '지역 필터 선택은 저장하고, 실제 시장 가격 데이터가 갱신되면 지도와 표에 반영합니다.'],
    reports: ['가격 리포트', '리포트 탭은 열려 있습니다', 'KAMIS 공식 동향과 AI 분석은 실데이터가 있을 때 분리 표시됩니다.'],
    favorites: ['관심 품목', '관심 품목 탭은 열려 있습니다', '관심 품목 토글은 실제 품목 데이터가 들어온 뒤 활성화됩니다.'],
    guide: ['데이터 안내', '연동 방식과 배포 상태를 확인합니다', 'Secrets 등록과 Actions 실행 후 실데이터 화면으로 전환됩니다.'],
  }[tab] || ['농산물 가격정보', '데이터 연결 대기', '탭 상태를 확인했습니다.'];
  return (
    <div className="tab-page">
      <PageIntro eyebrow={meta[0]} title={meta[1]} description={meta[2]}>
        <button type="button" onClick={onRefresh}>데이터 다시 확인</button>
      </PageIntro>
      {['home', 'items', 'regions'].includes(tab) ? (
        <section className="section-card control-state-card">
          <div className="section-head compact"><h2>필터 선택 상태</h2><button type="button" onClick={onToggleFilter} aria-expanded={filterOpen}>필터 {filterOpen ? '닫기' : '열기'}</button></div>
          <p>실데이터가 없어 결과 표시는 막았지만, 필터 선택 자체는 즉시 반영됩니다.</p>
          <div className="control-pill-row"><b>지역</b>{ADMIN_REGION_NAMES.map((item) => <button type="button" key={item} onClick={() => onRegionFilterChange(item)} aria-pressed={regionFilter === item}>{item}</button>)}</div>
          <div className="control-pill-row"><b>시세 기준</b>{['도매 평균', '소매 평균'].map((item) => <button type="button" key={item} onClick={() => onPriceBasisChange(item)} aria-pressed={priceBasis === item}>{item}</button>)}</div>
          <div className="control-pill-row"><b>등급</b>{grades.map((grade) => <button type="button" key={grade} onClick={() => onGradeChange(grade)} aria-pressed={selectedGrade === grade}>{grade}</button>)}</div>
          <strong className="state-readout">현재 선택: {regionFilter} · {priceBasis} · {selectedGrade}</strong>
        </section>
      ) : null}
      {tab === 'guide' ? (
        <section className="section-card guide-card"><h2>필요한 GitHub 설정</h2><ul><li>Secret: KAMIS_CERT_ID</li><li>Secret: KAMIS_CERT_KEY</li><li>Variable: KAMIS_FETCH_ENABLED=true</li></ul></section>
      ) : null}
      <TrackedCropCatalog />
      <DataEmptyState status={liveData.status} latestDate={liveData.latestDate} message={liveData.message} onOpenGuide={onOpenGuide} onRefresh={onRefresh} />
    </div>
  );
}

function MobileNav({ tab, updateTab }) {
  return (
    <nav className="mobile-tabbar" aria-label="농산물 가격정보 모바일 메뉴">
      {navItems.map((item) => (
        <button type="button" key={item.id} onClick={() => updateTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}>
          <span>{item.icon}</span>{item.label}
        </button>
      ))}
    </nav>
  );
}

function CropDataTable({ cropList, selectedName, onSelect }) {
  return (
    <section className="section-card tab-table-card">
      <div className="section-head"><h2>전체 품목 시세</h2><span>클릭하면 차트 기준 품목이 바뀝니다.</span></div>
      <table className="tab-table">
        <caption>전체 품목 시세 목록</caption>
        <thead><tr><th>품목</th><th>등급</th><th>도매 기준</th><th>소비자 체감</th><th>전일 대비</th><th>상태</th></tr></thead>
        <tbody>
          {cropList.map((crop) => {
            const token = CHANGE_TOKENS[crop.trend];
            return (
              <tr key={crop.name} className={selectedName === crop.name ? 'selected-row' : ''}>
                <td><button type="button" onClick={() => onSelect(crop.name)}>{crop.name}</button></td>
                <td><span className="grade-badge">{crop.grade}</span></td>
                <td>{formatWon(crop.wholesale)}/{crop.unit}</td>
                <td>≈ {formatWon(crop.consumer)}/kg</td>
                <td className={token.className}>{token.icon} {Math.abs(crop.change).toLocaleString('ko-KR')}원</td>
                <td><span className={`state-pill ${token.className}`}>{token.badge}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function FarmItemsPage(props) {
  const search = props.searchProps;
  const chart = props.chartProps;
  return (
    <div className="tab-page">
      <PageIntro eyebrow="품목별 시세" title="품목을 고르면 차트와 표가 함께 바뀝니다" description="빠른 선택 칩, 주요 품목 카드, 전체 품목 표가 모두 같은 선택 상태를 공유합니다.">
        <button type="button" onClick={props.onToggleCompare}>+ 비교 품목</button>
      </PageIntro>
      <SearchPanel selectedCrop={search.selectedCrop} selectedName={search.selectedName} selectedGrade={search.selectedGrade} searchTerm={search.searchTerm} onSearchTermChange={search.onSearchTermChange} onSearchSubmit={search.onSearchSubmit} filterOpen={search.filterOpen} onToggleFilter={search.onToggleFilter} regionFilter={search.regionFilter} onRegionFilterChange={search.onRegionFilterChange} priceBasis={search.priceBasis} onPriceBasisChange={search.onPriceBasisChange} onSelect={search.onSelect} onGradeChange={search.onGradeChange} quickTagList={search.quickTagList} />
      <CropCards selectedName={props.selectedName} onSelect={props.onSelect} items={props.cropList} onPrev={props.onPrev} onNext={props.onNext} />
      <div className="middle-grid"><TrendChart selectedCrop={chart.selectedCrop} selectedGrade={chart.selectedGrade} compareName={chart.compareName} period={chart.period} onPeriodChange={chart.onPeriodChange} onToggleCompare={chart.onToggleCompare} onOpenAll={chart.onOpenAll} cropList={chart.cropList} /><SummaryCard onOpenAll={props.onOpenItems} cropList={props.cropList} /></div>
      <CropDataTable cropList={props.cropList} selectedName={props.selectedName} onSelect={props.onSelect} />
    </div>
  );
}

function FarmRegionsPage({ selectedCrop, selectedGrade, selectedRegion, onRegionSelect, onOpenItems }) {
  return (
    <div className="tab-page">
      <PageIntro eyebrow="지역별 비교" title="시장별 가격 차이를 지도와 표로 확인합니다" description="지도 점을 누르면 말풍선과 아래 표의 선택 행이 함께 바뀝니다.">
        <button type="button" onClick={onOpenItems}>품목 바꾸기</button>
      </PageIntro>
      <RegionCard selectedCrop={selectedCrop} selectedGrade={selectedGrade} selectedRegion={selectedRegion} onRegionSelect={onRegionSelect} />
      <section className="section-card tab-table-card">
        <div className="section-head"><h2>{selectedCrop.name} 지역별 상세</h2><span>단위: 원/kg</span></div>
        <table className="tab-table">
          <caption>선택 품목 지역별 가격 상세</caption>
          <thead><tr><th>시장</th><th>지역</th><th>현재가</th><th>전일 대비</th><th>상태</th></tr></thead>
          <tbody>
            {[...(selectedCrop.regions || [])].sort(orderAdminRegions).map((row) => {
              const hasPrice = Number.isFinite(row.price);
              const token = CHANGE_TOKENS[changeType(row.change)];
              return <tr key={row.market} className={selectedRegion === row.market ? 'selected-row' : ''}><td><button type="button" onClick={() => onRegionSelect(row.market)} disabled={!hasPrice}>{row.market}</button></td><td>{regionDisplayName(row.city)}</td><td>{hasPrice ? formatWon(row.price) : '데이터 대기'}</td><td className={hasPrice ? token.className : 'is-flat'}>{Number.isFinite(row.change) ? `${token.icon} ${Math.abs(row.change).toLocaleString('ko-KR')}원` : '—'}</td><td><span className={`state-pill ${hasPrice ? token.className : 'is-flat'}`}>{hasPrice ? token.label : '수집 대기'}</span></td></tr>;
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function FarmReportsPage({ selectedCrop, cropList, onOpenAi, onOpenGuide }) {
  return (
    <div className="tab-page">
      <PageIntro eyebrow="가격 리포트" title="공식 동향과 AI 분석을 분리해서 봅니다" description="KAMIS 공식 동향은 객관 서술, AI 인사이트는 소비자 행동 조언으로 역할을 나눴습니다.">
        <button type="button" onClick={onOpenGuide}>출처 보기</button>
      </PageIntro>
      <div className="report-grid"><MarketCard selectedCrop={selectedCrop} onOpenReport={onOpenGuide} /><AiInsight selectedCrop={selectedCrop} onOpenAi={onOpenAi} /></div>
      <section className="section-card report-list-card">
        <div className="section-head"><h2>동향 전체 리포트</h2><span>KAMIS 공식 동향 · AI 분석 분리</span></div>
        {[selectedCrop, ...(cropList || []).filter((crop) => crop.name !== selectedCrop.name)].slice(0, 5).map((crop, index) => <article key={crop.name}><b>{index + 1}. {crop.name}</b><p>{index === 0 ? '선택 품목의 가격 흐름과 지역별 편차를 기준으로 장보기 판단을 돕습니다.' : `${crop.name} 가격 흐름과 확보된 지역 데이터를 함께 확인합니다.`}</p><button type="button" onClick={onOpenAi}>AI 분석 연결 →</button></article>)}
      </section>
    </div>
  );
}

function FarmFavoritesPage({ favoriteNames, cropList, selectedName, onSelect, onToggleFavorite, onOpenItems }) {
  const favoriteCrops = cropList.filter((crop) => favoriteNames.includes(crop.name));
  return (
    <div className="tab-page">
      <PageIntro eyebrow="관심 품목" title="자주 보는 품목을 모아 가격 변화를 추적합니다" description="관심 품목을 누르면 차트 기준 품목도 즉시 바뀝니다.">
        <button type="button" onClick={onOpenItems}>전체 품목 보기</button>
      </PageIntro>
      <section className="section-card favorite-page-grid">
        {favoriteCrops.map((crop) => {
          const token = CHANGE_TOKENS[crop.trend];
          return <article key={crop.name} className={`${token.className} ${selectedName === crop.name ? 'selected-row' : ''}`}><button type="button" onClick={() => onSelect(crop.name)}><b>{crop.name}</b><span className="grade-badge">{crop.grade}</span><strong>{formatWon(crop.consumer)}/kg</strong><em>{token.icon} {Math.abs(crop.change).toLocaleString('ko-KR')}원 · {token.badge}</em></button><button type="button" onClick={() => onToggleFavorite(crop.name)}>관심 해제</button></article>;
        })}
        {!favoriteCrops.length ? <article className="empty-state"><b>관심 품목이 없습니다.</b><button type="button" onClick={onOpenItems}>품목에서 추가하기</button></article> : null}
      </section>
    </div>
  );
}

function FarmGuidePage({ onOpenReports }) {
  return (
    <div className="tab-page">
      <PageIntro eyebrow="데이터 안내" title="KAMIS·통계청 기반 가격 정보 운영 방식" description="GitHub Actions가 갱신한 KAMIS JSON만 운영 데이터로 사용하고, 데이터가 없으면 임의 가격 대신 빈 상태를 표시합니다.">
        <button type="button" onClick={onOpenReports}>리포트 보기</button>
      </PageIntro>
      <section className="section-card guide-card">
        <article><b>데이터 출처</b><p>KAMIS 농산물유통정보, 통계청 공개 자료를 기준으로 합니다.</p></article>
        <article><b>갱신 방식</b><p>Actions가 public/data/crop-prices.json을 갱신하고 UI는 해당 JSON을 운영 데이터로 사용합니다.</p></article>
        <article><b>면책 고지</b><p>가격 데이터는 유통시장 상황에 따라 변동될 수 있으며, 장보기 판단 참고용입니다.</p></article>
      </section>
    </div>
  );
}

export default function FarmDashboard() {
  const [tab, setTab] = useState(() => readInitialTab());
  const [selectedName, setSelectedName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [regionFilter, setRegionFilter] = useState('전국');
  const [priceBasis, setPriceBasis] = useState('도매 평균');
  const [compareName, setCompareName] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState('상품');
  const [period, setPeriod] = useState('7일');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [cardPage, setCardPage] = useState(0);
  const [favoriteNames, setFavoriteNames] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const liveData = useLiveCropData(reloadKey);

  useEffect(() => {
    const syncTabFromHash = () => {
      try {
        const rawHash = window.location.hash.replace(/^#/, '');
        const [hashId, queryString = ''] = rawHash.split('?');
        const params = new URLSearchParams(queryString);
        setTab(normalizeTabId(params.get('tab') || hashId || 'home'));
      } catch {
        setTab('home');
      }
    };
    syncTabFromHash();
    window.addEventListener('hashchange', syncTabFromHash);
    return () => window.removeEventListener('hashchange', syncTabFromHash);
  }, []);

  const updateTab = (id) => {
    const safeId = normalizeTabId(id);
    setTab(safeId);
    try {
      const params = new URLSearchParams();
      params.set('tab', safeId);
      window.history.replaceState(null, '', `#${safeId}?${params}`);
    } catch {
      setTab(safeId);
    }
  };

  const cropList = liveData.crops;
  const hasData = cropList.length > 0;
  const updateLabel = liveData.generatedAt ? formatUpdateLabel(liveData.generatedAt) : liveData.status === 'loading' ? 'KAMIS · 확인 중' : 'KAMIS · 데이터 대기';
  const selectedCrop = hasData ? getCrop(selectedName, cropList) : EMPTY_CROP;
  const visibleCropCards = useMemo(() => {
    if (!cropList.length) return [];
    const visibleCount = Math.min(5, cropList.length);
    const start = ((cardPage % cropList.length) + cropList.length) % cropList.length;
    const pool = [...cropList, ...cropList];
    return pool.slice(start, start + visibleCount);
  }, [cropList, cardPage]);
  useEffect(() => {
    if (!cropList.length) return;
    const firstCrop = cropList[0];
    if (!cropList.some((crop) => crop.name === selectedName)) {
      setSelectedName(firstCrop.name);
      setSearchTerm(firstCrop.name);
      setSelectedRegion((firstCrop.regions.find((row) => Number.isFinite(row.price)) || firstCrop.regions[0])?.market || '');
    }
    setFavoriteNames((current) => current.filter((name) => cropList.some((crop) => crop.name === name)));
  }, [cropList, selectedName]);

  const selectCrop = (name) => {
    const crop = getCrop(name, cropList);
    setSelectedName(crop.name);
    setSearchTerm(crop.name);
    setSelectedRegion((crop.regions.find((row) => Number.isFinite(row.price)) || crop.regions[0])?.market || '');
  };

  const submitSearch = () => {
    const keyword = searchTerm.trim();
    if (!keyword) return;
    const match = cropList.find((crop) => crop.name.includes(keyword) || keyword.includes(crop.name));
    if (match) selectCrop(match.name);
  };

  const openTab = (id) => () => updateTab(id);

  const prevCards = () => { if (cropList.length) setCardPage((current) => (current - 1 + cropList.length) % cropList.length); };
  const nextCards = () => { if (cropList.length) setCardPage((current) => (current + 1) % cropList.length); };

  const toggleCompare = () => {
    if (compareName) {
      setCompareName(null);
      return;
    }
    const next = cropList.find((crop) => crop.name !== selectedName)?.name || null;
    setCompareName(next);
  };

  const toggleFavorite = (name) => {
    setFavoriteNames((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  };

  const refresh = () => {
    setRefreshing(true);
    setReloadKey((current) => current + 1);
    window.setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <div className="page">
      <Sidebar tab={tab} updateTab={updateTab} favoriteCount={favoriteNames.length} />
      <main id="main-content">
        <Header refreshing={refreshing} onRefresh={refresh} updateLabel={updateLabel} />
        <MobileNav tab={tab} updateTab={updateTab} />
        <div className="content-wrap">
          {!hasData ? (
            <FarmDataWaitPage tab={tab} liveData={liveData} regionFilter={regionFilter} onRegionFilterChange={setRegionFilter} priceBasis={priceBasis} onPriceBasisChange={setPriceBasis} selectedGrade={selectedGrade} onGradeChange={setSelectedGrade} filterOpen={filterOpen} onToggleFilter={() => setFilterOpen((current) => !current)} onOpenGuide={openTab('guide')} onRefresh={refresh} />
          ) : (() => {
            const searchProps = { selectedCrop, selectedName, selectedGrade, searchTerm, onSearchTermChange: setSearchTerm, onSearchSubmit: submitSearch, filterOpen, onToggleFilter: () => setFilterOpen((current) => !current), regionFilter, onRegionFilterChange: setRegionFilter, priceBasis, onPriceBasisChange: setPriceBasis, onSelect: selectCrop, onGradeChange: setSelectedGrade, quickTagList: cropList.map((crop) => crop.name).slice(0, 10) };
            const chartProps = { selectedCrop, selectedGrade, compareName, period, onPeriodChange: setPeriod, onToggleCompare: toggleCompare, onOpenAll: openTab('items'), cropList };
            if (tab === 'items') return <FarmItemsPage searchProps={searchProps} chartProps={chartProps} selectedName={selectedName} selectedCrop={selectedCrop} cropList={cropList} onSelect={selectCrop} onPrev={prevCards} onNext={nextCards} onToggleCompare={toggleCompare} onOpenItems={openTab('items')} />;
            if (tab === 'regions') return <FarmRegionsPage selectedCrop={selectedCrop} selectedGrade={selectedGrade} selectedRegion={selectedRegion} onRegionSelect={setSelectedRegion} onOpenItems={openTab('items')} />;
            if (tab === 'reports') return <FarmReportsPage selectedCrop={selectedCrop} cropList={cropList} onOpenAi={openTab('reports')} onOpenGuide={openTab('guide')} />;
            if (tab === 'favorites') return <FarmFavoritesPage favoriteNames={favoriteNames} cropList={cropList} selectedName={selectedName} onSelect={selectCrop} onToggleFavorite={toggleFavorite} onOpenItems={openTab('items')} />;
            if (tab === 'guide') return <FarmGuidePage onOpenReports={openTab('reports')} />;
            return (
              <>
                <SearchPanel selectedCrop={searchProps.selectedCrop} selectedName={searchProps.selectedName} selectedGrade={searchProps.selectedGrade} searchTerm={searchProps.searchTerm} onSearchTermChange={searchProps.onSearchTermChange} onSearchSubmit={searchProps.onSearchSubmit} filterOpen={searchProps.filterOpen} onToggleFilter={searchProps.onToggleFilter} regionFilter={searchProps.regionFilter} onRegionFilterChange={searchProps.onRegionFilterChange} priceBasis={searchProps.priceBasis} onPriceBasisChange={searchProps.onPriceBasisChange} onSelect={searchProps.onSelect} onGradeChange={searchProps.onGradeChange} quickTagList={searchProps.quickTagList} />
                <CropCards selectedName={selectedName} onSelect={selectCrop} items={visibleCropCards} onPrev={prevCards} onNext={nextCards} />
                <div className="middle-grid"><TrendChart selectedCrop={chartProps.selectedCrop} selectedGrade={chartProps.selectedGrade} compareName={chartProps.compareName} period={chartProps.period} onPeriodChange={chartProps.onPeriodChange} onToggleCompare={chartProps.onToggleCompare} onOpenAll={chartProps.onOpenAll} cropList={chartProps.cropList} /><SummaryCard onOpenAll={openTab('items')} cropList={cropList} /></div>
                <div className="bottom-grid"><RegionCard selectedCrop={selectedCrop} selectedGrade={selectedGrade} selectedRegion={selectedRegion} onRegionSelect={setSelectedRegion} onOpenRegions={openTab('regions')} /><MarketCard selectedCrop={selectedCrop} onOpenReport={openTab('reports')} /><div className="right-stack"><AiInsight selectedCrop={selectedCrop} onOpenAi={openTab('reports')} /><FavoriteCard favoriteNames={favoriteNames} onToggleFavorite={toggleFavorite} onSelect={selectCrop} onManage={openTab('favorites')} cropList={cropList} /></div></div>
              </>
            );
          })()}
          <footer>KAMIS·통계청 자료를 바탕으로 제공하며, 가격 데이터는 유통시장 상황에 따라 변동될 수 있습니다.</footer>
        </div>
      </main>
    </div>
  );
}
