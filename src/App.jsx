import { useEffect, useMemo, useState } from 'react';

const DATA_URL = `${import.meta.env.BASE_URL}data/crop-prices.json`;
const REPORT_URL = `${import.meta.env.BASE_URL}data/ai-reports.json`;

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value) {
  const number = toNumber(value);
  return number === null ? '-' : number.toLocaleString('ko-KR');
}

function formatWon(value) {
  const number = toNumber(value);
  return number === null ? '-' : `${Math.round(number).toLocaleString('ko-KR')}원`;
}

function formatSignedWon(value) {
  const number = toNumber(value);
  if (number === null) return '-';
  return `${number > 0 ? '+' : ''}${Math.round(number).toLocaleString('ko-KR')}원`;
}

function formatPercent(value) {
  const number = toNumber(value);
  if (number === null) return '-';
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function normalizeText(value, fallback = '-') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

async function fetchJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

function getHashRoute() {
  if (typeof window === 'undefined') return { page: 'home', detail: '' };
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  const [page = 'home', ...rest] = raw ? raw.split('/') : ['home'];
  return { page: page || 'home', detail: rest.join('/') };
}

function useHashRoute() {
  const [route, setRoute] = useState(getHashRoute);
  useEffect(() => {
    const update = () => setRoute(getHashRoute());
    window.addEventListener('hashchange', update);
    update();
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}

function getStats(item) {
  const series = Array.isArray(item?.series) ? item.series.filter((point) => toNumber(point.price) !== null) : [];
  const latest = series.at(-1) ?? null;
  const previous = series.at(-2) ?? null;
  const latestPrice = toNumber(latest?.price);
  const previousPrice = toNumber(previous?.price);
  const diff = latestPrice !== null && previousPrice !== null ? latestPrice - previousPrice : null;
  const rate = diff !== null && previousPrice ? (diff / previousPrice) * 100 : null;
  const prices = series.map((point) => toNumber(point.price)).filter(Number.isFinite);
  return {
    latest,
    previous,
    latestPrice,
    previousPrice,
    diff,
    rate,
    average: prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null,
    min: prices.length ? Math.min(...prices) : null,
    max: prices.length ? Math.max(...prices) : null,
    count: prices.length,
  };
}

function getItemRouteId(item, index) {
  const raw = item?.id || `${item?.name}-${item?.region}-${index}`;
  return encodeURIComponent(String(raw).replace(/\s+/g, '-'));
}

function findItemByRouteId(items, detail) {
  return items.find((item, index) => getItemRouteId(item, index) === detail);
}

function normalizePoints(points) {
  const chartPoints = points
    .filter((point) => point?.date && toNumber(point.price ?? point.value) !== null)
    .map((point) => ({ label: point.date, date: point.date, value: toNumber(point.price ?? point.value) }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(-45);
  const values = chartPoints.map((point) => point.value).filter(Number.isFinite);
  if (!values.length) return { chartPoints: [], min: 0, max: 1 };
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = Math.max((rawMax - rawMin) * 0.18, rawMax * 0.012, 1);
  return { chartPoints, min: rawMin - pad, max: rawMax + pad };
}

function Shell({ children }) {
  return <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 text-slate-900 md:px-8"><div className="mx-auto max-w-[1180px] space-y-5">{children}</div></main>;
}

function PageHeader({ updatedAt }) {
  return (
    <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="break-keep text-3xl font-black tracking-tight text-slate-950 md:text-4xl">농산물 가격정보</h1>
          <p className="mt-2 break-keep text-sm font-semibold leading-6 text-slate-600">전국·지역별 생활 농산물 시세를 확인하는 가격 정보 사이트</p>
        </div>
        <p className="text-xs font-semibold text-slate-500 md:text-right">기준일 {formatDate(updatedAt)}</p>
      </div>
    </header>
  );
}

function FilterBar({ region, itemName, regions, itemNames, setRegion, setItemName }) {
  return (
    <section className="border border-slate-200 bg-white px-4 py-3 md:px-5">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label><span className="mb-1 block text-xs font-bold text-slate-600">지역</span><select className="h-10 w-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-950" value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label><span className="mb-1 block text-xs font-bold text-slate-600">품목</span><select className="h-10 w-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-950" value={itemName} onChange={(event) => setItemName(event.target.value)}>{itemNames.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <p className="text-xs font-semibold leading-5 text-slate-500">KAMIS Open API 기준</p>
      </div>
    </section>
  );
}

function InfoStrip({ items }) {
  return (
    <dl className="grid border border-slate-200 bg-white md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="border-b border-slate-200 px-5 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
          <dt className="text-xs font-bold text-slate-500">{item.label}</dt>
          <dd className="mt-2 text-2xl font-black tracking-tight text-slate-950">{item.value}<span className="ml-1 text-xs font-semibold text-slate-500">{item.unit}</span></dd>
          <dd className="mt-1 break-keep text-xs font-semibold leading-5 text-slate-500">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

function Panel({ title, description, children }) {
  return (
    <section className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="break-keep text-lg font-black text-slate-950">{title}</h2>
        {description ? <p className="mt-1 break-keep text-xs font-semibold leading-5 text-slate-500">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyPanel({ title, description, value, meta }) {
  return (
    <div className="grid min-h-52 place-items-center border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <div className="max-w-sm">
        <p className="text-sm font-black text-slate-700">{title}</p>
        {value ? <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p> : null}
        {meta ? <p className="mt-1 text-xs font-semibold text-slate-500">{meta}</p> : null}
        <p className="mt-3 break-keep text-sm font-semibold leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function LineChart({ points }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const { chartPoints, min, max } = normalizePoints(points);
  const width = 680;
  const height = 220;
  const padding = { top: 18, right: 24, bottom: 30, left: 34 };
  if (!chartPoints.length) return <EmptyPanel title="가격 추이 데이터가 없습니다" description="데이터 갱신 후 그래프가 표시됩니다." />;
  if (chartPoints.length === 1) return <EmptyPanel title="최근 수집값" value={formatWon(chartPoints[0].value)} meta={chartPoints[0].label} description="추이선은 2건 이상 수집된 뒤 표시합니다." />;
  const range = Math.max(max - min, 1);
  const getX = (index) => padding.left + ((width - padding.left - padding.right) * index) / Math.max(chartPoints.length - 1, 1);
  const getY = (value) => padding.top + (1 - ((value - min) / range)) * (height - padding.top - padding.bottom);
  const plotted = chartPoints.map((point, index) => ({ ...point, x: getX(index), y: getY(point.value) }));
  const path = plotted.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const active = activeIndex !== null ? plotted[activeIndex] : plotted.at(-1);
  function activate(event) { const rect = event.currentTarget.getBoundingClientRect(); const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)); setActiveIndex(Math.round(ratio * (plotted.length - 1))); }
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500"><span>{String(plotted[0].label)}</span><span className="text-slate-950">{active.label} · {formatWon(active.value)}</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full bg-white" onMouseMove={activate} onMouseLeave={() => setActiveIndex(null)} onClick={activate} role="img" aria-label="농산물 가격 추이">
        {[0, 1, 2].map((line) => { const y = padding.top + ((height - padding.top - padding.bottom) * line) / 2; return <line key={line} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e5e7eb" />; })}
        <path d={path} fill="none" stroke="#166534" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <line x1={active.x} x2={active.x} y1={padding.top} y2={height - padding.bottom} stroke="#94a3b8" strokeDasharray="3 4" />
        <circle cx={active.x} cy={active.y} r="5" fill="#fff" stroke="#166534" strokeWidth="3" />
        <text x={padding.left} y={height - 8} className="fill-slate-500 text-[11px] font-bold">{String(plotted[0].label).slice(5)}</text>
        <text x={width - padding.right - 60} y={height - 8} className="fill-slate-500 text-[11px] font-bold">{String(plotted.at(-1).label).slice(5)}</text>
      </svg>
    </div>
  );
}

function HorizontalBars({ bars }) {
  const chartBars = bars.filter((bar) => bar?.label && toNumber(bar.value) !== null).slice(0, 12);
  if (!chartBars.length) return <EmptyPanel title="비교 데이터가 없습니다" description="데이터 갱신 후 비교 정보가 표시됩니다." />;
  if (chartBars.length === 1) return <EmptyPanel title="비교 대상 1건" value={formatWon(chartBars[0].value)} meta={chartBars[0].label} description="2건 이상 수집되면 지역별 비교가 표시됩니다." />;
  const values = chartBars.map((bar) => toNumber(bar.value)).filter(Number.isFinite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return <div className="space-y-3">{chartBars.map((bar) => { const value = toNumber(bar.value) ?? 0; const width = Math.max(10, ((value - min) / Math.max(max - min, 1)) * 75 + 15); return <div key={bar.label} className="grid grid-cols-[72px_1fr_86px] items-center gap-3 text-sm"><span className="truncate font-bold text-slate-700">{bar.label}</span><span className="h-2 bg-slate-100"><span className="block h-2 bg-slate-800" style={{ width: `${width}%` }} /></span><span className="text-right font-black tabular-nums text-slate-950">{formatWon(value)}</span></div>; })}</div>;
}

function CropTable({ items }) {
  return (
    <div className="overflow-hidden border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="hidden bg-slate-100 text-left text-xs font-black text-slate-600 md:table-header-group"><tr><th className="px-4 py-3">품목</th><th className="px-4 py-3">지역</th><th className="px-4 py-3 text-right">가격</th><th className="px-4 py-3 text-right">전일 대비</th><th className="px-4 py-3">기준일</th></tr></thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {items.length ? items.slice(0, 12).map((item, index) => { const stats = getStats(item); return <tr key={`${item.id}-${index}`} className="block p-4 md:table-row md:p-0"><td className="block py-2 md:table-cell md:px-4 md:py-3"><a href={`#/item/${getItemRouteId(item, index)}`} className="font-black text-slate-950 underline-offset-4 hover:underline">{item.name}</a><p className="mt-1 text-xs font-semibold text-slate-500">{item.category} · {item.unit}</p></td><td className="flex justify-between py-2 font-semibold text-slate-700 md:table-cell md:px-4 md:py-3"><span className="font-bold text-slate-400 md:hidden">지역</span>{item.region}</td><td className="flex justify-between py-2 text-right font-black tabular-nums text-slate-950 md:table-cell md:px-4 md:py-3"><span className="font-bold text-slate-400 md:hidden">가격</span>{formatWon(stats.latestPrice)}</td><td className={`flex justify-between py-2 text-right font-black tabular-nums md:table-cell md:px-4 md:py-3 ${stats.diff > 0 ? 'text-red-600' : stats.diff < 0 ? 'text-emerald-700' : 'text-slate-500'}`}><span className="font-bold text-slate-400 md:hidden">전일 대비</span>{formatSignedWon(stats.diff)}</td><td className="flex justify-between py-2 font-semibold text-slate-700 md:table-cell md:px-4 md:py-3"><span className="font-bold text-slate-400 md:hidden">기준일</span>{formatDate(stats.latest?.date)}</td></tr>; }) : <tr><td colSpan="5" className="px-4 py-10 text-center text-sm font-semibold text-slate-500">데이터 갱신 후 농산물 시세가 표시됩니다.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function SummaryList({ lines }) {
  return <ul className="divide-y divide-slate-200 border border-slate-200 bg-white">{lines.map((line, index) => <li key={`${line}-${index}`} className="break-keep px-4 py-3 text-sm font-semibold leading-6 text-slate-700">{line}</li>)}</ul>;
}

function DetailGrid({ rows }) {
  return <dl className="grid border border-slate-200 bg-white md:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="border-b border-slate-200 px-4 py-3 md:border-r md:[&:nth-child(2n)]:border-r-0"><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 break-keep text-sm font-semibold leading-6 text-slate-900">{value ?? '-'}</dd></div>)}</dl>;
}

function CropDetail({ item, allItems, reports, updatedAt }) {
  if (!item) return <Shell><PageHeader updatedAt={updatedAt} /><Panel title="품목 정보를 찾을 수 없습니다" description="홈에서 다시 선택해 주세요."><a href="#/" className="inline-flex border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800">홈으로</a></Panel></Shell>;
  const stats = getStats(item);
  const related = allItems.filter((target) => target.name === item.name);
  const report = reports?.reports?.[item.id]?.['30'];
  const summary = Array.isArray(report?.summary) && report.summary.length ? report.summary : [`${item.name} ${item.region} 기준 가격은 ${formatWon(stats.latestPrice)}입니다.`, stats.diff !== null ? `전일 대비 ${formatSignedWon(stats.diff)}입니다.` : '전일 대비 데이터가 생성되면 표시됩니다.'];
  return (
    <Shell>
      <PageHeader updatedAt={updatedAt} />
      <section className="border border-slate-200 bg-white px-5 py-5 md:px-7"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="text-sm font-semibold text-slate-500">품목 상세</p><h2 className="mt-1 break-keep text-3xl font-black tracking-tight text-slate-950">{item.name}</h2><p className="mt-2 text-sm font-semibold text-slate-600">{item.region} · {item.market} · {item.unit}</p></div><a href="#/" className="inline-flex w-fit border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800">목록으로</a></div></section>
      <InfoStrip items={[{ label: '현재가', value: formatWon(stats.latestPrice), unit: '', detail: formatDate(stats.latest?.date) }, { label: '전일 대비', value: formatSignedWon(stats.diff), unit: '', detail: formatPercent(stats.rate) }, { label: '30일 평균', value: formatWon(stats.average), unit: '', detail: `${stats.count}개 가격 기록` }]} />
      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]"><Panel title="가격 추이" description="최근 수집 가격 흐름입니다."><LineChart points={item.series ?? []} /></Panel><Panel title="동일 품목 지역 비교" description="수집된 지역 기준 현재가를 비교합니다."><HorizontalBars bars={related.map((target) => ({ label: target.region, value: getStats(target).latestPrice }))} /></Panel></section>
      <Panel title="상세 정보" description="KAMIS 수집 결과를 집계한 값입니다."><DetailGrid rows={[[ '분류', item.category ], [ '지역', item.region ], [ '시장 구분', item.market ], [ '단위', item.unit ], [ '지역 코드', item.regionCode ], [ '평균가', formatWon(stats.average) ], [ '최저가', formatWon(stats.min) ], [ '최고가', formatWon(stats.max) ]]} /></Panel>
      <Panel title="요약" description="수집된 가격 기록 기준의 짧은 정리입니다."><SummaryList lines={summary} /></Panel>
      <footer className="border border-slate-200 bg-white px-5 py-4 text-center text-xs font-semibold text-slate-500">개인적 학습 목적으로 제작된 정적 데이터 사이트입니다.</footer>
    </Shell>
  );
}

export default function App() {
  const route = useHashRoute();
  const [data, setData] = useState(null);
  const [reports, setReports] = useState(null);
  const [region, setRegion] = useState('전국');
  const [itemName, setItemName] = useState('전체');

  useEffect(() => {
    Promise.all([fetchJson(DATA_URL, { items: [] }), fetchJson(REPORT_URL, { reports: {} })]).then(([priceData, reportData]) => {
      setData(priceData);
      setReports(reportData);
    });
  }, []);

  const items = Array.isArray(data?.items) ? data.items : [];
  const regions = useMemo(() => ['전국', ...Array.from(new Set(items.map((item) => item.region).filter(Boolean).filter((name) => name !== '전국')))], [items]);
  const itemNames = useMemo(() => ['전체', ...Array.from(new Set(items.map((item) => item.name).filter(Boolean)))], [items]);
  const visibleItems = items.filter((item) => (region === '전국' || item.region === region) && (itemName === '전체' || item.name === itemName));
  const nationalItems = items.filter((item) => item.region === '전국');
  const selectedItem = visibleItems[0] ?? items[0] ?? null;
  const selectedStats = selectedItem ? getStats(selectedItem) : {};
  const regionalForItem = selectedItem ? items.filter((item) => item.name === selectedItem.name && item.region !== '전국') : [];
  const regionAverage = visibleItems.length ? Math.round(visibleItems.map((item) => getStats(item).latestPrice).filter(Number.isFinite).reduce((sum, value) => sum + value, 0) / Math.max(visibleItems.map((item) => getStats(item).latestPrice).filter(Number.isFinite).length, 1)) : null;
  const nationalAverage = nationalItems.length ? Math.round(nationalItems.map((item) => getStats(item).latestPrice).filter(Number.isFinite).reduce((sum, value) => sum + value, 0) / Math.max(nationalItems.map((item) => getStats(item).latestPrice).filter(Number.isFinite).length, 1)) : null;
  const detailItem = route.page === 'item' && route.detail ? findItemByRouteId(items, route.detail) : null;
  if (route.page === 'item' && route.detail) return <CropDetail item={detailItem} allItems={items} reports={reports} updatedAt={data?.generatedAt} />;

  const report = selectedItem ? reports?.reports?.[selectedItem.id]?.['30'] : null;
  const summaryLines = Array.isArray(report?.summary) && report.summary.length ? report.summary : [
    selectedItem ? `${selectedItem.name} ${selectedItem.region} 기준 현재가는 ${formatWon(selectedStats.latestPrice)}입니다.` : 'KAMIS 데이터가 생성되면 가격 요약이 표시됩니다.',
    selectedStats.diff !== undefined ? `전일 대비는 ${formatSignedWon(selectedStats.diff)}입니다.` : '전일 대비 데이터가 생성되면 표시됩니다.',
    '전국과 지역별 가격을 함께 확인할 수 있습니다.',
  ];

  return (
    <Shell>
      <PageHeader updatedAt={data?.generatedAt} />
      <FilterBar region={region} itemName={itemName} regions={regions.length ? regions : ['전국']} itemNames={itemNames.length ? itemNames : ['전체']} setRegion={setRegion} setItemName={setItemName} />
      <InfoStrip items={[{ label: '전국 평균가', value: formatWon(nationalAverage), unit: '', detail: '전국 수집 품목 평균' }, { label: `${region} 평균가`, value: formatWon(regionAverage), unit: '', detail: '현재 필터 기준' }, { label: '전일 대비', value: formatSignedWon(selectedStats.diff), unit: '', detail: selectedItem ? `${selectedItem.name} 기준` : '선택 품목 기준' }]} />
      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <Panel title="농산물 시세표" description="품목명을 누르면 가격 추이와 지역별 가격을 확인할 수 있습니다."><CropTable items={visibleItems} /></Panel>
        <div className="space-y-5"><Panel title="가격 추이" description="선택 품목의 최근 가격 흐름입니다."><LineChart points={selectedItem?.series ?? []} /></Panel><Panel title="요약" description="수집된 가격 기준의 짧은 정리입니다."><SummaryList lines={summaryLines} /></Panel></div>
      </section>
      <Panel title="지역별 가격 비교" description="선택 품목의 지역별 현재가를 비교합니다."><HorizontalBars bars={regionalForItem.map((item) => ({ label: item.region, value: getStats(item).latestPrice }))} /></Panel>
      <footer className="border border-slate-200 bg-white px-5 py-4 text-center text-xs font-semibold text-slate-500">개인적 학습 목적으로 제작된 정적 데이터 사이트입니다.</footer>
    </Shell>
  );
}
