import { useEffect, useMemo, useState } from 'react';
import { fetchAiReports, fetchCropPrices } from './services/cropPriceApi.js';
import { formatDate, formatFullDate, formatPercent, formatSignedWon, formatWon } from './utils/formatters.js';
import { createCropReport } from './utils/reportGenerator.js';

const RANGE_OPTIONS = [7, 30, 90];

const CROP_META = {
  cabbage: {
    emoji: '🥬',
    seasonTitle: '11월 ~ 2월',
    seasonBullets: [
      '겨울철 출하 물량이 안정적이라 가격 흐름이 비교적 완만한 편입니다.',
      '기온이 급격히 내려가면 생육 속도가 늦어져 단기 변동이 생길 수 있습니다.',
      '김장철 수요가 커지는 시기에는 일시적으로 가격이 오를 수 있습니다.',
    ],
    tip: '저온기에는 저장성과 신선도 차이가 커질 수 있어 산지·도매시장 흐름을 함께 확인하는 것이 좋습니다.',
  },
  radish: {
    emoji: '🤍',
    seasonTitle: '10월 ~ 2월',
    seasonBullets: [
      '가을·겨울 무는 품질이 안정적이라 가격 비교 지표로 활용하기 좋습니다.',
      '기상 악화나 산지 물량 감소가 생기면 단기 상승폭이 커질 수 있습니다.',
      '김장철에는 배추와 함께 연동된 흐름을 보이는 경우가 많습니다.',
    ],
    tip: '배추와 함께 묶어 보면 장바구니 채소 물가 흐름을 설명하기 좋습니다.',
  },
  onion: {
    emoji: '🧅',
    seasonTitle: '3월 ~ 6월',
    seasonBullets: [
      '저장 양파 물량과 햇양파 출하 시점에 따라 가격 흐름이 달라집니다.',
      '봄철에는 산지 출하량이 늘어 안정세를 보이는 경우가 많습니다.',
      '보관 물량이 줄어드는 시기에는 가격이 상대적으로 민감하게 반응할 수 있습니다.',
    ],
    tip: '양파는 저장 물량과 산지 출하 시기를 같이 보면 리포트 설명이 자연스럽습니다.',
  },
  potato: {
    emoji: '🥔',
    seasonTitle: '6월 ~ 9월',
    seasonBullets: [
      '여름 햇감자 출하가 본격화되면 가격이 안정되는 경우가 많습니다.',
      '장마와 고온은 품질과 출하량에 영향을 줘 단기 변동을 만들 수 있습니다.',
      '저장 감자 비중이 높아지는 시기에는 공급 상황에 따라 가격 차이가 커질 수 있습니다.',
    ],
    tip: '감자는 저장 여부에 따라 가격 해석이 달라질 수 있어 계절 설명과 함께 보여주기 좋습니다.',
  },
  greenOnion: {
    emoji: '🌿',
    seasonTitle: '4월 ~ 6월',
    seasonBullets: [
      '대파는 기온 변화에 민감해 일별 가격 변동이 비교적 빠르게 나타납니다.',
      '봄철 출하가 늘어나는 시기에는 하락 안정세를 보이기도 합니다.',
      '이상 기온이나 산지 피해가 생기면 단기 급등 사례가 발생할 수 있습니다.',
    ],
    tip: '대파는 생활물가 체감도가 높아 비교 카드에서 강조하기 좋은 품목입니다.',
  },
  cucumber: {
    emoji: '🥒',
    seasonTitle: '5월 ~ 8월',
    seasonBullets: [
      '봄철부터 초여름까지는 출하량이 늘어나 가격이 비교적 안정적인 편입니다.',
      '장마철에는 일조량 부족으로 단기 가격 변동이 발생할 수 있습니다.',
      '여름 후반으로 갈수록 산지 물량 변화에 따라 등락 폭이 커질 수 있습니다.',
    ],
    tip: '장마철에는 통풍과 배수 관리가 중요하며, 가격 분석에서는 기상 변수와 함께 보는 것이 좋습니다.',
  },
};

const getTrendClass = (value) => {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'flat';
};

const calculateStats = (series) => {
  if (!series.length) {
    return {
      latest: null,
      previous: null,
      diff: null,
      rate: null,
      average: null,
      min: null,
      max: null,
    };
  }

  const prices = series.map((point) => Number(point.price)).filter((price) => !Number.isNaN(price));
  const latest = prices.at(-1) ?? null;
  const previous = prices.at(-2) ?? latest;
  const diff = latest !== null && previous !== null ? latest - previous : null;
  const rate = previous ? (diff / previous) * 100 : null;
  const average = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null;

  return {
    latest,
    previous,
    diff,
    rate,
    average,
    min: prices.length ? Math.min(...prices) : null,
    max: prices.length ? Math.max(...prices) : null,
  };
};

function AppHeader({ generatedAt }) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <span className="leaf" />
        </div>
        <div>
          <h1>팜프라이스 노트</h1>
          <p>농산물 가격 추이와 계절 정보를 한눈에 확인하세요</p>
        </div>
      </div>
      <div className="update-pill">
        <span className="clock-icon" aria-hidden="true">◷</span>
        최근 업데이트: {generatedAt || '-'}
      </div>
    </header>
  );
}

function FilterBar({ items, selectedId, onSelect, range, onRangeChange }) {
  return (
    <section className="filter-card">
      <div className="filter-group">
        <p className="filter-label">품목 선택</p>
        <div className="chip-row">
          {items.map((item) => {
            const meta = CROP_META[item.id] || {};
            return (
              <button
                type="button"
                key={item.id}
                className={`chip-button ${selectedId === item.id ? 'active' : ''}`}
                onClick={() => onSelect(item.id)}
              >
                <span className="chip-emoji" aria-hidden="true">{meta.emoji || '●'}</span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="filter-group period-group">
        <p className="filter-label">기간 선택</p>
        <div className="period-buttons">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={range === option ? 'active' : ''}
              onClick={() => onRangeChange(option)}
            >
              {option}일
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function LineChart({ series, latestPrice }) {
  const width = 860;
  const height = 330;
  const padding = { top: 22, right: 72, bottom: 42, left: 62 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (!series.length) {
    return <div className="chart-empty">표시할 가격 데이터가 없습니다.</div>;
  }

  const prices = series.map((point) => Number(point.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const gap = Math.max(max - min, 1);
  const paddedMin = Math.max(0, min - gap * 0.18);
  const paddedMax = max + gap * 0.18;
  const yRange = Math.max(paddedMax - paddedMin, 1);

  const xForIndex = (index) => padding.left + (series.length === 1 ? chartWidth / 2 : (index / (series.length - 1)) * chartWidth);
  const yForPrice = (price) => padding.top + chartHeight - ((price - paddedMin) / yRange) * chartHeight;

  const points = series.map((point, index) => ({
    ...point,
    x: xForIndex(index),
    y: yForPrice(Number(point.price)),
  }));

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const areaPath = `${path} L ${points.at(-1).x.toFixed(2)} ${height - padding.bottom} L ${points[0].x.toFixed(2)} ${height - padding.bottom} Z`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = Math.round(paddedMin + yRange * ratio);
    return { value, y: yForPrice(value) };
  }).reverse();

  const xTickIndexes = series.length <= 6
    ? series.map((_, index) => index)
    : [...new Set([0, Math.floor((series.length - 1) * 0.2), Math.floor((series.length - 1) * 0.45), Math.floor((series.length - 1) * 0.65), Math.floor((series.length - 1) * 0.82), series.length - 1])];

  const lastPoint = points.at(-1);

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="농산물 가격 추이 그래프">
        <defs>
          <linearGradient id="priceAreaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2f8b43" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2f8b43" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick.value} className="grid-row">
            <line x1={padding.left} x2={width - padding.right} y1={tick.y} y2={tick.y} />
            <text x={padding.left - 12} y={tick.y + 4} textAnchor="end">{tick.value.toLocaleString('ko-KR')}</text>
          </g>
        ))}

        <path d={areaPath} className="line-area" />
        <path d={path} className="line-path" />

        {points.map((point) => (
          <g key={`${point.date}-${point.price}`} className="line-point">
            <circle cx={point.x} cy={point.y} r="4" />
            <title>{`${formatFullDate(point.date)} · ${formatWon(point.price)}`}</title>
          </g>
        ))}

        {xTickIndexes.map((index) => {
          const point = points[index];
          return (
            <text key={`${point.date}-label`} className="x-tick" x={point.x} y={height - 12} textAnchor="middle">
              {formatDate(point.date)}
            </text>
          );
        })}

        {lastPoint ? (
          <g className="value-tag">
            <rect x={lastPoint.x + 12} y={lastPoint.y - 20} width="76" height="34" rx="10" />
            <text x={lastPoint.x + 50} y={lastPoint.y + 2} textAnchor="middle">{latestPrice ? latestPrice.toLocaleString('ko-KR') : '-'}</text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function SummaryCards({ stats, range }) {
  const diffClass = getTrendClass(stats.diff);

  return (
    <div className="summary-row">
      <article className="metric-card tone-green">
        <span className="metric-icon">₩</span>
        <div>
          <small>현재 가격</small>
          <strong>{formatWon(stats.latest)}</strong>
        </div>
      </article>
      <article className="metric-card tone-blue">
        <span className="metric-icon">↓</span>
        <div>
          <small>전일 대비</small>
          <strong className={diffClass}>{formatSignedWon(stats.diff)}</strong>
          <em className={diffClass}>{formatPercent(stats.rate)}</em>
        </div>
      </article>
      <article className="metric-card tone-yellow">
        <span className="metric-icon">▮</span>
        <div>
          <small>최근 {range}일 평균</small>
          <strong>{formatWon(stats.average)}</strong>
        </div>
      </article>
      <article className="metric-card tone-rose">
        <span className="metric-icon">↑</span>
        <div>
          <small>최고가({range}일)</small>
          <strong>{formatWon(stats.max)}</strong>
        </div>
      </article>
      <article className="metric-card tone-mint">
        <span className="metric-icon">↘</span>
        <div>
          <small>최저가({range}일)</small>
          <strong>{formatWon(stats.min)}</strong>
        </div>
      </article>
    </div>
  );
}

function AiReportCard({ report, range }) {
  const summaryLines = report?.summary?.slice(0, 4) || [];
  return (
    <aside className="side-card ai-card">
      <div className="side-title">
        <h2>AI 리포트</h2>
        <span className="sparkle">✦</span>
      </div>
      <ul className="report-list">
        {summaryLines.map((line, index) => (
          <li key={`${line}-${index}`}>
            <strong>{index === 0 ? `최근 ${range}일 흐름` : index === 1 ? '평균 비교' : index === 2 ? '변동 포인트' : '관찰 포인트'}</strong>
            <p>{line}</p>
          </li>
        ))}
        {report?.recommendation ? (
          <li>
            <strong>단기 체크</strong>
            <p>{report.recommendation}</p>
          </li>
        ) : null}
      </ul>
      <div className="side-note">AI 리포트는 Gemini API 또는 데이터 규칙 분석으로 생성됩니다.</div>
    </aside>
  );
}

function SeasonCard({ itemId, itemName }) {
  const meta = CROP_META[itemId] || CROP_META.cucumber;

  return (
    <aside className="side-card season-card">
      <div className="side-title">
        <h2>계절 정보</h2>
        <span className="sparkle">🌱</span>
      </div>
      <div className="season-layout">
        <div className="season-badge">
          <small>제철 시기</small>
          <strong>{meta.seasonTitle}</strong>
          <div className="season-emoji" aria-hidden="true">{meta.emoji}</div>
        </div>
        <ul className="season-points">
          {meta.seasonBullets.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </div>
      <div className="side-note">{itemName} 참고: {meta.tip}</div>
    </aside>
  );
}

function MiniSparkline({ series, positive }) {
  if (!series?.length) return null;
  const width = 120;
  const height = 34;
  const pad = 3;
  const values = series.map((point) => Number(point.price));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => {
    const x = pad + (index / Math.max(values.length - 1, 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');

  return (
    <svg className={`mini-sparkline ${positive ? 'up' : 'down'}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={points} />
    </svg>
  );
}

function ComparisonSection({ items, selectedId }) {
  return (
    <section className="compare-card">
      <h2>다른 품목 가격 현황</h2>
      <div className="compare-grid">
        {items.map((item) => {
          const stats = calculateStats(item.series || []);
          const trendClass = getTrendClass(stats.diff);
          return (
            <article key={item.id} className={`compare-item ${selectedId === item.id ? 'active' : ''}`}>
              <div className="compare-head">
                <span className="compare-emoji" aria-hidden="true">{CROP_META[item.id]?.emoji || '●'}</span>
                <div>
                  <strong>{item.name}</strong>
                  <span>{formatWon(stats.latest)}</span>
                </div>
                <b className={trendClass}>{formatPercent(stats.rate)}</b>
              </div>
              <MiniSparkline series={(item.series || []).slice(-14)} positive={stats.diff >= 0} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="page-footer">
      <p>데이터 출처: KAMIS 농산물유통정보 Open API</p>
      <p>본 화면은 개인 포트폴리오용 데모입니다.</p>
      <p>© 2026 Farm Price Note. 화면 디자인과 구현 코드는 포트폴리오 용도로 제작되었으며, 무단 복제 및 상업적 이용을 금합니다.</p>
    </footer>
  );
}

function EmptyState() {
  return (
    <main className="app-shell">
      <AppHeader generatedAt={null} />
      <section className="empty-state-card">
        <h2>실데이터 파일이 아직 생성되지 않았습니다.</h2>
        <p>GitHub Actions에서 KAMIS 데이터를 생성하면 화면에 가격 추이와 AI 리포트가 표시됩니다.</p>
      </section>
      <Footer />
    </main>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [aiReports, setAiReports] = useState(null);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState('cucumber');
  const [range, setRange] = useState(30);

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      try {
        const [json, aiJson] = await Promise.all([fetchCropPrices(), fetchAiReports()]);
        if (!ignore) {
          setData(json);
          setAiReports(aiJson);
          const hasCucumber = json.items?.some((item) => item.id === 'cucumber');
          setSelectedId(hasCucumber ? 'cucumber' : json.items?.[0]?.id ?? 'cucumber');
        }
      } catch (fetchError) {
        if (!ignore) setError(fetchError.message);
      }
    };

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const items = data?.items || [];
  const selectedItem = items.find((item) => item.id === selectedId) || items[0];
  const visibleSeries = useMemo(() => {
    const series = selectedItem?.series || [];
    return series.slice(-range);
  }, [selectedItem, range]);

  const stats = useMemo(() => calculateStats(visibleSeries), [visibleSeries]);

  const report = useMemo(() => {
    const fallbackReport = createCropReport({
      item: selectedItem,
      series: visibleSeries,
      stats,
      range,
    });
    const geminiReport = selectedItem?.id ? aiReports?.reports?.[selectedItem.id]?.[String(range)] : null;

    if (geminiReport) {
      return {
        ...fallbackReport,
        ...geminiReport,
      };
    }

    return fallbackReport;
  }, [selectedItem, visibleSeries, stats, range, aiReports]);

  if (error) {
    return (
      <main className="app-shell">
        <AppHeader generatedAt={null} />
        <section className="empty-state-card">
          <h2>데이터를 불러오지 못했습니다.</h2>
          <p>{error}</p>
        </section>
        <Footer />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="app-shell">
        <AppHeader generatedAt={null} />
        <section className="loading-card simple-loading">
          <span className="loader" />
          <p>농산물 가격 데이터를 불러오는 중입니다.</p>
        </section>
        <Footer />
      </main>
    );
  }

  if (!items.length) {
    return <EmptyState />;
  }

  return (
    <main className="app-shell dashboard-page">
      <AppHeader generatedAt={data.generatedAt} />
      <FilterBar
        items={items}
        selectedId={selectedItem?.id}
        onSelect={setSelectedId}
        range={range}
        onRangeChange={setRange}
      />

      <section className="content-grid">
        <div className="main-panel">
          <section className="chart-card">
            <div className="chart-head">
              <div>
                <h2>{selectedItem?.name} 가격 추이</h2>
                <p>단위: {selectedItem?.unit || '-'}</p>
              </div>
              <button type="button" className="outline-button">차트 다운로드</button>
            </div>

            <LineChart series={visibleSeries} latestPrice={stats.latest} />
            <SummaryCards stats={stats} range={range} />
          </section>
        </div>

        <div className="side-panel">
          <AiReportCard report={report} range={range} />
          <SeasonCard itemId={selectedItem?.id} itemName={selectedItem?.name} />
        </div>
      </section>

      <ComparisonSection items={items} selectedId={selectedItem?.id} />
      <Footer />
    </main>
  );
}

export default App;
