import { useEffect, useMemo, useState } from 'react';

const DATA_URL = `${import.meta.env.BASE_URL}data/crop-prices.json`;
const REPORT_URL = `${import.meta.env.BASE_URL}data/ai-reports.json`;

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const formatNumber = (value) => {
  const number = toNumber(value);
  return number === null ? '-' : number.toLocaleString('ko-KR');
};
const formatWon = (value) => toNumber(value) === null ? '-' : `${formatNumber(value)}원`;
const toPercent = (value) => {
  const number = toNumber(value);
  return number === null ? '-' : `${number > 0 ? '+' : ''}${number.toFixed(2)}%`;
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function fetchJson(url, fallback = null) {
  try {
    const response = await fetch(url);
    if (!response.ok) return fallback;
    return response.json();
  } catch {
    return fallback;
  }
}

function normalizeItems(items = []) {
  return items.map((item, index) => ({
    id: item.id || `crop-${index}`,
    name: item.name || '-',
    category: item.category || '-',
    regionCode: item.regionCode || item.countrycode || item.sourceMeta?.countrycode || item.region || 'ALL',
    region: item.region || item.regionName || '전국',
    market: item.market || '소매',
    unit: item.unit || '1kg',
    series: Array.isArray(item.series) ? item.series : [],
  }));
}

function getStats(item) {
  const points = (item?.series ?? [])
    .map((point) => ({ ...point, price: Number(point.price) }))
    .filter((point) => Number.isFinite(point.price) && point.price > 0);
  const latest = points.at(-1) ?? null;
  const previous = points.at(-2) ?? latest;
  const diff = latest && previous ? latest.price - previous.price : null;
  const rate = Number.isFinite(diff) && previous?.price ? (diff / previous.price) * 100 : null;
  const prices = points.map((point) => point.price);
  return {
    latest,
    previous,
    diff,
    rate,
    average: prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null,
    min: prices.length ? Math.min(...prices) : null,
    max: prices.length ? Math.max(...prices) : null,
  };
}

function uniqueOptions(values) {
  return [...new Set(values.filter(Boolean))];
}

function getCropEmoji(name) {
  const text = String(name ?? '');
  if (text.includes('배추')) return '🥬';
  if (text.includes('무')) return '🥬';
  if (text.includes('양파')) return '🧅';
  if (text.includes('대파') || text.includes('파')) return '🌿';
  if (text.includes('감자')) return '🥔';
  if (text.includes('사과')) return '🍎';
  if (text.includes('오이')) return '🥒';
  if (text.includes('토마토')) return '🍅';
  return '🌱';
}

function MiniSparkline({ points, stroke = '#15803d' }) {
  const values = points.map((point) => toNumber(point.value)).filter(Number.isFinite).slice(-12);
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const d = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 92;
    const y = 44 - ((value - min) / range) * 32;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  return <svg className="hidden h-12 w-24 md:block" viewBox="0 0 96 48" aria-hidden="true"><path d={d} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" /></svg>;
}

function FilterSelect({ label, icon, value, onChange, options }) {
  return (
    <label className="flex min-w-0 items-center gap-3 px-4 py-4 md:border-r md:border-slate-200 last:border-r-0">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-xl text-slate-500">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 block text-sm font-extrabold text-slate-700">{label}</span>
        <select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      </span>
    </label>
  );
}

function LineChart({ points, stroke = '#15803d' }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const chartPoints = points
    .filter((point) => toNumber(point.value) !== null)
    .sort((a, b) => String(a.date || a.label).localeCompare(String(b.date || b.label)))
    .slice(-45);
  const width = 680;
  const height = 230;
  const padding = { top: 30, right: 30, bottom: 34, left: 58 };
  const values = chartPoints.map((point) => toNumber(point.value));
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const rawRange = maxValue - minValue;
  const paddingValue = Math.max(rawRange * 0.14, maxValue * 0.015, 1);
  const adjustedMin = minValue - paddingValue;
  const adjustedMax = maxValue + paddingValue;
  const adjustedRange = Math.max(1, adjustedMax - adjustedMin);
  const getX = (index) => chartPoints.length <= 1 ? width / 2 : padding.left + ((width - padding.left - padding.right) * index) / (chartPoints.length - 1);
  const getY = (value) => padding.top + ((adjustedMax - Number(value)) / adjustedRange) * (height - padding.top - padding.bottom);
  const plotted = chartPoints.map((point, index) => ({ ...point, x: getX(index), y: getY(point.value), value: toNumber(point.value) }));
  const path = plotted.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const activePoint = activeIndex !== null ? plotted[activeIndex] : plotted.at(-1);

  function activateFromEvent(event) {
    if (!plotted.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setActiveIndex(Math.round(ratio * (plotted.length - 1)));
  }

  if (!plotted.length) return <div className="grid h-56 place-items-center rounded-xl bg-slate-50 px-4 text-center text-sm font-bold text-slate-500">데이터 갱신 후 표시됩니다.</div>;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {activePoint ? <div className="rounded-xl bg-slate-900 px-3 py-2 text-right text-xs font-extrabold leading-5 text-white shadow-lg"><div>{activePoint.label}</div><div>{formatWon(activePoint.value)}</div></div> : null}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full overflow-visible"
        role="img"
        aria-label="가격 추이 그래프"
        onMouseMove={activateFromEvent}
        onMouseLeave={() => setActiveIndex(null)}
        onClick={activateFromEvent}
      >
        {[0, 1, 2, 3].map((line) => {
          const y = padding.top + ((height - padding.top - padding.bottom) * line) / 3;
          return <line key={line} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 5" />;
        })}
        <path d={path} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {plotted.map((point, index) => (
          <circle key={`${point.label}-${index}`} cx={point.x} cy={point.y} r={activeIndex === index ? 7 : 5} fill="#fff" stroke={stroke} strokeWidth="3" />
        ))}
        {activePoint ? <line x1={activePoint.x} x2={activePoint.x} y1={padding.top} y2={height - padding.bottom} stroke="#94a3b8" strokeDasharray="4 4" /> : null}
        {plotted.map((point, index) => (
          index % Math.max(1, Math.ceil(plotted.length / 5)) === 0 ? <text key={`label-${point.label}-${index}`} x={point.x} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[11px] font-bold">{String(point.label).slice(5)}</text> : null
        ))}
      </svg>
    </div>
  );
}

function BarChart({ bars }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const chartBars = bars.filter((bar) => toNumber(bar.value) !== null).slice(0, 10);
  const maxValue = Math.max(1, ...chartBars.map((bar) => toNumber(bar.value) ?? 0));
  const activeBar = activeIndex !== null ? chartBars[activeIndex] : chartBars[0];
  if (!chartBars.length) return <div className="grid h-56 place-items-center rounded-xl bg-slate-50 px-4 text-center text-sm font-bold text-slate-500">데이터 갱신 후 표시됩니다.</div>;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {activeBar ? <div className="rounded-xl bg-slate-900 px-3 py-2 text-right text-xs font-extrabold leading-5 text-white shadow-lg"><div>{activeBar.label}</div><div>{formatWon(activeBar.value)}</div></div> : null}
      </div>
      <div className="flex h-56 items-end gap-3 border-b border-slate-200 px-2 pb-8 pt-6">
        {chartBars.map((bar, index) => {
          const height = Math.max(18, ((toNumber(bar.value) ?? 0) / maxValue) * 155);
          return (
            <button
              key={`${bar.label}-${index}`}
              type="button"
              className="group relative flex min-w-0 flex-1 flex-col items-center gap-2"
              aria-label={`${bar.label} ${formatWon(bar.value)}`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => setActiveIndex(index)}
            >
              <span className="text-xs font-extrabold text-slate-700">{formatNumber(bar.value)}</span>
              <span className="w-full max-w-14 rounded-t-lg bg-emerald-600 transition group-hover:opacity-80" style={{ height, opacity: index === activeIndex ? 1 : 0.62 }} />
              <span className="absolute -bottom-7 max-w-20 truncate text-xs font-bold text-slate-600">{bar.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RegionMapMini({ bars, selectedRegion }) {
  const visible = bars.filter((bar) => toNumber(bar.value) !== null).slice(0, 6);
  const pins = [
    { x: 42, y: 34 }, { x: 54, y: 45 }, { x: 66, y: 60 },
    { x: 48, y: 70 }, { x: 34, y: 58 }, { x: 58, y: 76 },
  ];

  return (
    <div className="relative min-h-56 rounded-xl bg-slate-50 p-3">
      <svg className="h-56 w-full" viewBox="0 0 120 100" role="img" aria-label="지역별 비교 지도 요약">
        <path d="M46 12 60 18 70 12 78 23 72 35 82 45 76 58 85 71 73 83 59 78 47 88 36 77 25 70 31 55 21 45 32 34 30 21Z" fill="#ecfdf5" stroke="#cbd5e1" strokeWidth="1.5" />
        <path d="M47 18 56 27 50 38 36 36 32 27Z" fill="#bbf7d0" opacity="0.9" />
        <path d="M57 42 70 47 67 59 54 58Z" fill="#bbf7d0" opacity="0.9" />
        <path d="M39 55 50 64 43 76 32 69Z" fill="#bbf7d0" opacity="0.9" />
        {visible.map((bar, index) => {
          const pin = pins[index] ?? pins[0];
          const active = bar.label === selectedRegion || selectedRegion.includes(bar.label);
          return (
            <g key={`${bar.label}-${index}`}>
              <circle cx={pin.x} cy={pin.y} r={active ? 4.5 : 3.4} fill={active ? '#047857' : '#16a34a'} opacity="0.92" />
              <circle cx={pin.x} cy={pin.y} r={active ? 8 : 6} fill="none" stroke="#10b981" strokeOpacity="0.22" strokeWidth="2" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MetricCard({ icon, label, value, unit, accent = 'green', detail, sparkline }) {
  const palette = accent === 'red' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700';
  const valueColor = accent === 'red' ? 'text-red-600' : 'text-emerald-700';
  return (
    <article className="flex min-h-32 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex min-w-0 items-center gap-4">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl font-black ${palette}`}>{icon}</div>
        <div className="min-w-0">
          <p className="break-keep text-sm font-extrabold text-slate-700">{label}</p>
          <p><strong className={`text-4xl font-black tabular-nums tracking-tight ${valueColor}`}>{value}</strong>{unit && <span className="ml-1 text-sm font-bold text-slate-500">{unit}</span>}</p>
          {detail ? <p className="mt-2 text-xs font-bold text-slate-500">{detail}</p> : null}
        </div>
      </div>
      {sparkline ? <MiniSparkline points={sparkline} stroke={accent === 'red' ? '#dc2626' : '#15803d'} /> : null}
    </article>
  );
}

function DataCell({ label, children, className = '', align = 'center' }) {
  const desktopAlign = align === 'right' ? 'md:text-right' : align === 'left' ? 'md:text-left' : 'md:text-center';
  return (
    <td data-label={label} className={`flex items-start justify-between gap-4 border-b border-slate-100 px-1 py-2 text-right font-semibold text-slate-700 last:border-b-0 md:table-cell md:px-4 md:py-3 ${desktopAlign} ${className}`}>
      <span className="shrink-0 font-extrabold text-slate-500 md:hidden">{label}</span>
      <span className="min-w-0">{children}</span>
    </td>
  );
}

function EmptyCell({ colSpan, children }) {
  return (
    <td colSpan={colSpan} className="block rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-10 text-center font-semibold text-slate-500 md:table-cell md:border-0 md:bg-transparent">
      {children}
    </td>
  );
}


export default function App() {
  const [payload, setPayload] = useState(null);
  const [reports, setReports] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('전국');
  const [selectedMarket, setSelectedMarket] = useState('전체');
  const [selectedItemName, setSelectedItemName] = useState('전체 품목');

  useEffect(() => {
    Promise.all([fetchJson(DATA_URL, { items: [] }), fetchJson(REPORT_URL, null)]).then(([cropPayload, reportPayload]) => {
      setPayload(cropPayload);
      setReports(reportPayload);
    });
  }, []);

  const items = useMemo(() => normalizeItems(payload?.items ?? []), [payload]);
  const regionOptions = useMemo(() => ['전국', ...uniqueOptions(items.map((item) => item.region)).filter((region) => region !== '전국')], [items]);
  const marketOptions = useMemo(() => ['전체', ...uniqueOptions(items.map((item) => item.market))], [items]);
  const itemOptions = useMemo(() => ['전체 품목', ...uniqueOptions(items.map((item) => item.name))], [items]);
  const filteredItems = items.filter((item) => {
    const matchesRegion = selectedRegion === '전국' || item.region === selectedRegion;
    const matchesMarket = selectedMarket === '전체' || item.market === selectedMarket;
    const matchesItem = selectedItemName === '전체 품목' || item.name === selectedItemName;
    return matchesRegion && matchesMarket && matchesItem;
  });

  const selectedItem = filteredItems[0] || items[0];
  const selectedStats = getStats(selectedItem);
  const nationalAverage = (() => {
    const prices = items.map((item) => getStats(item).latest?.price).filter(Number.isFinite);
    return prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null;
  })();
  const regionAverage = (() => {
    const prices = filteredItems.map((item) => getStats(item).latest?.price).filter(Number.isFinite);
    return prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null;
  })();
  const latestDate = selectedItem?.series?.at(-1)?.date || payload?.generatedAt;
  const trendPoints = (selectedItem?.series ?? []).map((point) => ({ label: formatDate(point.date), date: point.date, value: Number(point.price) }));
  const regionBars = regionOptions
    .filter((region) => region !== '전국')
    .map((region) => {
      const regionItems = items.filter((item) => item.region === region && (selectedItemName === '전체 품목' || item.name === selectedItemName));
      const prices = regionItems.map((item) => getStats(item).latest?.price).filter(Number.isFinite);
      const average = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null;
      return { label: region, value: average };
    })
    .filter((bar) => Number.isFinite(bar.value));
  const summaryLines = (() => {
    if (!items.length || !selectedItem) return ['GitHub Actions 데이터 갱신 후 가격 요약이 표시됩니다.'];
    const report = reports?.reports?.[selectedItem?.id]?.['30'];
    if (Array.isArray(report?.summary) && report.summary.length) return report.summary.slice(0, 3);
    const diff = selectedStats.diff;
    const direction = diff > 0 ? '상승' : diff < 0 ? '하락' : '보합';
    return [
      `${selectedItem.name} 현재가는 ${formatWon(selectedStats.latest?.price)}입니다.`,
      `전일 대비 ${toNumber(diff) !== null ? `${Math.abs(diff).toLocaleString('ko-KR')}원 ${direction}` : '변동 정보가 준비되지 않았습니다.'}`,
      `${selectedRegion} 기준으로 지역별 가격 비교와 추이를 함께 확인할 수 있습니다.`,
    ];
  })();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-6 md:flex-row md:items-end md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center text-emerald-700" aria-hidden="true">
              <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor"><path d="M20.4 3.6C13.9 3.9 7.2 7.1 4.7 12.2 2.5 16.6 4.5 20.6 8.6 21.5c4.9 1.1 9.5-2.8 10.9-8.3.8-3.1.7-6.2.9-9.6ZM8.2 18.7c1.4-4.4 4.5-8.1 9.3-11.2-3.4 3.6-5.7 7.2-6.9 11.2H8.2Z" /></svg>
            </div>
            <div>
              <h1 className="break-keep text-4xl font-black tracking-tight text-emerald-900">농산물 가격정보</h1>
              <p className="mt-1 text-base font-bold text-slate-500">전국·지역별 생활 농산물 시세</p>
            </div>
          </div>
          <nav className="flex max-w-full gap-5 overflow-x-auto whitespace-nowrap text-sm font-black text-slate-700 md:gap-9" aria-label="주요 메뉴">
          <a className="shrink-0 border-b-4 border-current pb-3 text-emerald-700 transition hover:text-slate-950" href="#top">홈</a>
          <a className="shrink-0 border-b-4 border-transparent pb-3 transition hover:text-slate-950" href="#national">전국 시세</a>
          <a className="shrink-0 border-b-4 border-transparent pb-3 transition hover:text-slate-950" href="#regions">지역별 비교</a>
          <a className="shrink-0 border-b-4 border-transparent pb-3 transition hover:text-slate-950" href="#trend">가격 추이</a>
        </nav>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[1440px] space-y-5 px-5 py-5 md:px-8">
        <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-4">
          <FilterSelect label="지역" icon="📍" value={selectedRegion} onChange={setSelectedRegion} options={regionOptions} />
          <FilterSelect label="시장 유형" icon="🏪" value={selectedMarket} onChange={setSelectedMarket} options={marketOptions} />
          <FilterSelect label="품목" icon="🌱" value={selectedItemName} onChange={setSelectedItemName} options={itemOptions} />
          <div className="flex min-w-0 items-center gap-3 px-4 py-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-xl text-slate-500">📅</span><span className="min-w-0 flex-1"><span className="mb-1 block text-sm font-extrabold text-slate-700">기준일</span><span className="flex min-h-11 w-full items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">{formatDate(latestDate)}</span></span></div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard icon="₩" label="전국 평균가" value={formatNumber(nationalAverage)} unit="원" detail="전국 품목 평균" sparkline={trendPoints} />
          <MetricCard icon="📍" label={`선택 지역 평균가 (${selectedRegion})`} value={formatNumber(regionAverage)} unit="원" detail={selectedMarket} sparkline={trendPoints} />
          <MetricCard icon={toNumber(selectedStats.diff) === null ? '–' : selectedStats.diff > 0 ? '▲' : selectedStats.diff < 0 ? '▼' : '–'} label="전일 대비" value={toNumber(selectedStats.diff) === null ? '-' : `${selectedStats.diff > 0 ? '+' : ''}${formatNumber(selectedStats.diff)}`} unit="원" accent={selectedStats.diff > 0 ? 'red' : 'green'} detail={toPercent(selectedStats.rate)} sparkline={trendPoints} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]" id="national">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <h2 className="mb-4 text-lg font-extrabold text-slate-900">전국 주요 품목 시세</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-3 text-sm md:border-collapse md:border-spacing-y-0">
                <thead className="hidden md:table-header-group">
                  <tr>
                    <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700 text-left">품목</th>
                    <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">단위</th>
                    <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">지역</th>
                    <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">가격</th>
                    <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">전일 대비</th>
                    <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">등락률</th>
                  </tr>
                </thead>
                <tbody className="md:divide-y md:divide-slate-100">
                  {filteredItems.slice(0, 8).map((item) => {
                    const stats = getStats(item);
                    return (
                      <tr key={`${item.id}-${item.region}`} className="block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:table-row md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                        <DataCell label="품목" align="left" className="font-extrabold text-slate-950"><span className="inline-flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-lg">{getCropEmoji(item.name)}</span>{item.name}</span></DataCell>
                        <DataCell label="단위">{item.unit}</DataCell>
                        <DataCell label="지역">{item.region}</DataCell>
                        <DataCell label="가격" className="font-extrabold tabular-nums text-emerald-700">{formatWon(stats.latest?.price)}</DataCell>
                        <DataCell label="전일 대비" className={stats.diff > 0 ? 'text-red-600' : stats.diff < 0 ? 'text-emerald-700' : 'text-slate-600'}>
                          {toNumber(stats.diff) === null ? '-' : `${stats.diff > 0 ? '▲ ' : stats.diff < 0 ? '▼ ' : ''}${formatNumber(Math.abs(stats.diff))}원`}
                        </DataCell>
                        <DataCell label="등락률" className={stats.rate > 0 ? 'text-red-600' : 'text-emerald-700'}>{toPercent(stats.rate)}</DataCell>
                      </tr>
                    );
                  })}
                  {!filteredItems.length && <tr><EmptyCell colSpan="6">데이터 갱신 후 표시됩니다.</EmptyCell></tr>}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5" id="regions">
            <h2 className="mb-4 text-lg font-extrabold text-slate-900">지역별 비교</h2>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <RegionMapMini bars={regionBars} selectedRegion={selectedRegion} />
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-3 text-sm md:border-collapse md:border-spacing-y-0">
                  <thead className="hidden md:table-header-group">
                    <tr>
                      <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">지역</th>
                      <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">평균가</th>
                    </tr>
                  </thead>
                  <tbody className="md:divide-y md:divide-slate-100">
                    {regionBars.slice(0, 8).map((bar) => (
                      <tr key={bar.label} className="block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:table-row md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                        <DataCell label="지역">{bar.label}</DataCell>
                        <DataCell label="평균가" className="font-extrabold tabular-nums text-emerald-700">{formatWon(bar.value)}</DataCell>
                      </tr>
                    ))}
                    {!regionBars.length && <tr><EmptyCell colSpan="2">데이터 갱신 후 표시됩니다.</EmptyCell></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-2" id="trend">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"><h2 className="mb-3 text-lg font-extrabold text-slate-900">가격 추이</h2><LineChart points={trendPoints} /></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"><h2 className="mb-3 text-lg font-extrabold text-slate-900">지역별 가격 비교</h2><BarChart bars={regionBars} /></article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <h2 className="mb-4 text-lg font-extrabold text-slate-900">선택 지역 상세 ({selectedRegion})</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-3 text-sm md:border-collapse md:border-spacing-y-0">
              <thead className="hidden md:table-header-group">
                <tr>
                  <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700 text-left">품목</th>
                  <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">단위</th>
                  <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">지역</th>
                  <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">시장</th>
                  <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">평균가</th>
                  <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">최저가</th>
                  <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">최고가</th>
                  <th className="border-y border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-700">기준일</th>
                </tr>
              </thead>
              <tbody className="md:divide-y md:divide-slate-100">
                {filteredItems.slice(0, 8).map((item) => {
                  const prices = item.series.map((point) => Number(point.price)).filter(Number.isFinite);
                  const stats = getStats(item);
                  return (
                    <tr key={`detail-${item.id}-${item.region}`} className="block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:table-row md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                      <DataCell label="품목" align="left" className="font-extrabold text-slate-950"><span className="inline-flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-lg">{getCropEmoji(item.name)}</span>{item.name}</span></DataCell>
                      <DataCell label="단위">{item.unit}</DataCell>
                      <DataCell label="지역">{item.region}</DataCell>
                      <DataCell label="시장">{item.market}</DataCell>
                      <DataCell label="평균가">{formatWon(stats.average)}</DataCell>
                      <DataCell label="최저가">{formatWon(prices.length ? Math.min(...prices) : null)}</DataCell>
                      <DataCell label="최고가">{formatWon(prices.length ? Math.max(...prices) : null)}</DataCell>
                      <DataCell label="기준일">{formatDate(stats.latest?.date)}</DataCell>
                    </tr>
                  );
                })}
                {!filteredItems.length && <tr><EmptyCell colSpan="8">데이터 갱신 후 표시됩니다.</EmptyCell></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-3 text-lg font-extrabold text-emerald-700">가격 변동 요약</h2><ul className="list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">{summaryLines.map((line) => <li key={line}>{line}</li>)}</ul></section>
      </main>

      <footer className="px-6 pb-8 pt-2 text-center text-sm font-semibold text-slate-500">개인적 학습 목적으로 제작된 정적 데이터 사이트</footer>
    </div>
  );
}
