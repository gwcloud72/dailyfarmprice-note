
import { useEffect, useMemo, useState } from 'react';
import { fetchAiReports, fetchCropPrices } from './services/cropPriceApi.js';
import { formatDate, formatFullDate, formatPercent, formatSignedWon, formatWon } from './utils/formatters.js';

const RANGE_OPTIONS = [7, 30, 90];

const CROP_META = {
  cabbage: {
    seasonTitle: '11월 ~ 2월',
    seasonBullets: [
      '겨울철 출하 물량이 안정적이라 가격 흐름이 비교적 완만합니다.',
      '김장철 수요가 커지면 단기 상승이 나타날 수 있습니다.',
      '한파나 기상 악화가 생기면 산지 출하량이 줄어 변동 폭이 커질 수 있습니다.',
    ],
    tip: '배추는 김장철 수요와 기상 영향을 함께 보면 흐름 설명이 자연스럽습니다.',
  },
  radish: {
    seasonTitle: '10월 ~ 2월',
    seasonBullets: [
      '가을·겨울 무는 품질이 안정적이라 가격 비교 지표로 활용하기 좋습니다.',
      '배추와 함께 움직이는 경우가 많아 장바구니 물가 설명에 적합합니다.',
      '산지 물량이 줄어들면 단기 상승 폭이 커질 수 있습니다.',
    ],
    tip: '배추와 함께 비교하면 생활물가 흐름을 보여주기 좋습니다.',
  },
  onion: {
    seasonTitle: '3월 ~ 6월',
    seasonBullets: [
      '햇양파 출하가 시작되면 가격이 비교적 안정되는 경우가 많습니다.',
      '저장 양파 물량이 줄어드는 시기에는 가격 민감도가 높아질 수 있습니다.',
      '봄철 출하량 증가 여부에 따라 보합 또는 약세 흐름이 나타납니다.',
    ],
    tip: '양파는 저장 물량과 햇양파 출하 시기를 함께 보면 해석이 쉬워집니다.',
  },
  potato: {
    seasonTitle: '6월 ~ 9월',
    seasonBullets: [
      '여름 햇감자 출하가 본격화되면 가격이 안정되는 경우가 많습니다.',
      '장마와 고온은 품질과 출하량에 영향을 줘 변동을 만들 수 있습니다.',
      '저장 감자 비중이 높아지는 시기에는 공급 상황에 따라 가격 차이가 커질 수 있습니다.',
    ],
    tip: '감자는 저장 여부에 따라 가격 해석이 달라져 계절 설명과 잘 어울립니다.',
  },
  'green-onion': {
    seasonTitle: '4월 ~ 6월',
    seasonBullets: [
      '대파는 기온 변화에 민감해 일별 가격 변동이 비교적 빠른 편입니다.',
      '봄철 출하가 늘어나면 안정세를 보이기도 합니다.',
      '이상 기온이나 산지 피해가 생기면 단기 급등 사례가 나타날 수 있습니다.',
    ],
    tip: '대파는 체감 물가와 연결해 설명하기 좋은 품목입니다.',
  },
  cucumber: {
    seasonTitle: '5월 ~ 8월',
    seasonBullets: [
      '봄부터 초여름까지는 출하량이 늘어나 가격이 비교적 안정적인 편입니다.',
      '장마철에는 일조량 부족과 생육 영향으로 단기 변동이 발생할 수 있습니다.',
      '여름 후반에는 산지 물량 변화에 따라 등락 폭이 커질 수 있습니다.',
    ],
    tip: '오이는 장마철 기상 변수와 함께 보면 가격 해석이 더 자연스럽습니다.',
  },
};

const getTrendClass = (value) => {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'flat';
};

const getTrendLabel = (value) => {
  if (value > 0) return '상승세';
  if (value < 0) return '하락세';
  return '보합세';
};

const getValidPrice = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number;
};

const formatUpdatedAt = (value) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(/\./g, '.').replace(/\s+/g, ' ').trim();
};

const calculateStats = (series) => {
  const validPrices = series
    .map((point) => ({ ...point, price: getValidPrice(point.price) }))
    .filter((point) => point.price !== null);

  if (!validPrices.length) {
    return {
      latest: null,
      previous: null,
      diff: null,
      rate: null,
      average: null,
      min: null,
      max: null,
      latestDate: null,
    };
  }

  const prices = validPrices.map((point) => point.price);
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
    latestDate: validPrices.at(-1)?.date ?? null,
  };
};


function CropIcon({ id, className = '' }) {
  const commonProps = {
    viewBox: '0 0 48 48',
    role: 'img',
    focusable: 'false',
    'aria-hidden': 'true',
  };

  const icons = {
    cabbage: (
      <svg {...commonProps}>
        <circle cx="24" cy="25" r="17" fill="#d8f0b6" />
        <path d="M24 8c7 6 8 15 0 32C16 23 17 14 24 8Z" fill="#75b843" />
        <path d="M12 18c10 0 18 7 24 18C22 36 14 30 12 18Z" fill="#93cd5a" />
        <path d="M36 18c-10 0-18 7-24 18 14 0 22-6 24-18Z" fill="#9fd66a" />
        <path d="M24 10v28M14 20c7 3 12 8 16 15M34 20c-7 3-12 8-16 15" stroke="#2f8b43" strokeWidth="2" strokeLinecap="round" opacity=".75" />
      </svg>
    ),
    radish: (
      <svg {...commonProps}>
        <path d="M24 13c8 3 13 9 13 17 0 8-6 14-13 14S11 38 11 30c0-8 5-14 13-17Z" fill="#f7f7fb" stroke="#d8d9e5" strokeWidth="2" />
        <path d="M24 13c-5 7-5 20 0 31" stroke="#e6e6f2" strokeWidth="2" />
        <path d="M21 13c-2-7 3-10 7-7M25 13c1-7 8-8 10-3M23 14c-5-5-2-10 3-11" stroke="#5dbd48" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    onion: (
      <svg {...commonProps}>
        <path d="M24 9c9 7 15 15 15 25 0 8-6 13-15 13S9 42 9 34c0-10 6-18 15-25Z" fill="#d98a42" />
        <path d="M18 11c-5 10-6 22-2 35M30 11c5 10 6 22 2 35M24 10c-2 12-2 24 0 36" stroke="#b66b34" strokeWidth="2" strokeLinecap="round" opacity=".6" />
        <path d="M22 9c-1-4 1-6 4-7" stroke="#7c9b3b" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    potato: (
      <svg {...commonProps}>
        <ellipse cx="24" cy="27" rx="16" ry="13" fill="#d9a16c" transform="rotate(-18 24 27)" />
        <circle cx="18" cy="25" r="1.8" fill="#b77d50" />
        <circle cx="27" cy="20" r="1.6" fill="#b77d50" />
        <circle cx="31" cy="31" r="1.5" fill="#b77d50" />
        <circle cx="22" cy="34" r="1.3" fill="#b77d50" />
      </svg>
    ),
    'green-onion': (
      <svg {...commonProps}>
        <path d="M14 39c7-12 11-23 13-34" stroke="#78c957" strokeWidth="5" strokeLinecap="round" />
        <path d="M22 40c4-13 9-24 18-34" stroke="#4cad45" strokeWidth="5" strokeLinecap="round" />
        <path d="M29 38c-2-12-1-23 3-34" stroke="#96d96a" strokeWidth="5" strokeLinecap="round" />
        <path d="M11 42c8-3 16-3 25 0" stroke="#f5f1d8" strokeWidth="8" strokeLinecap="round" />
        <path d="M11 42c8-3 16-3 25 0" stroke="#d8cfa7" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    cucumber: (
      <svg {...commonProps}>
        <path d="M10 31c5-14 15-22 29-25 5 9 0 25-12 34-8 6-17 3-17-9Z" fill="#4caf54" />
        <path d="M14 32c7-10 16-18 28-23" stroke="#77d06d" strokeWidth="3" strokeLinecap="round" opacity=".85" />
        <circle cx="25" cy="21" r="1.4" fill="#e6ffd8" />
        <circle cx="31" cy="16" r="1.2" fill="#e6ffd8" />
        <circle cx="19" cy="29" r="1.1" fill="#e6ffd8" />
      </svg>
    ),
  };

  return <span className={`crop-icon crop-icon-${id} ${className}`}>{icons[id] || icons.cabbage}</span>;
}


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
        최근 업데이트: {formatUpdatedAt(generatedAt)}
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
            return (
              <button
                type="button"
                key={item.id}
                className={`chip-button ${selectedId === item.id ? 'active' : ''}`}
                onClick={() => onSelect(item.id)}
              >
                <CropIcon id={item.id} />
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


function getNiceStep(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;

  if (fraction <= 1) return 1 * 10 ** exponent;
  if (fraction <= 2) return 2 * 10 ** exponent;
  if (fraction <= 5) return 5 * 10 ** exponent;
  return 10 * 10 ** exponent;
}

function LineChart({ series, latestPrice }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const cleaned = series.filter((point) => getValidPrice(point.price) !== null);
  const width = 920;
  const height = 390;
  const padding = { top: 34, right: 92, bottom: 56, left: 72 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (!cleaned.length) {
    return <div className="chart-empty">표시할 가격 데이터가 없습니다.</div>;
  }

  const prices = cleaned.map((point) => Number(point.price));
  const averagePrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const gap = Math.max(max - min, 1);
  const step = getNiceStep(gap / 4);
  const paddedMin = Math.max(0, Math.floor((min - gap * 0.12) / step) * step);
  const paddedMax = Math.ceil((max + gap * 0.14) / step) * step;
  const yRange = Math.max(paddedMax - paddedMin, 1);

  const xForIndex = (index) => padding.left + (cleaned.length === 1 ? chartWidth / 2 : (index / (cleaned.length - 1)) * chartWidth);
  const yForPrice = (price) => padding.top + chartHeight - ((price - paddedMin) / yRange) * chartHeight;

  const points = cleaned.map((point, index) => ({
    ...point,
    x: xForIndex(index),
    y: yForPrice(Number(point.price)),
    index,
  }));

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const areaPath = `${path} L ${points.at(-1).x.toFixed(2)} ${height - padding.bottom} L ${points[0].x.toFixed(2)} ${height - padding.bottom} Z`;

  const tickValues = [];
  for (let tick = paddedMin; tick <= paddedMax + step / 2; tick += step) {
    tickValues.push(tick);
  }
  const yTicks = tickValues.slice(-6).map((value) => ({ value, y: yForPrice(value) })).reverse();

  const tickCount = cleaned.length <= 10 ? cleaned.length : cleaned.length <= 35 ? 6 : 7;
  const tickIndexes = [...new Set(
    Array.from({ length: tickCount }, (_, index) => Math.round(index * (cleaned.length - 1) / Math.max(tickCount - 1, 1)))
  )];

  const dotEvery = cleaned.length > 45 ? Math.ceil(cleaned.length / 26) : 1;
  const lastPoint = points.at(-1);
  const activePoint = hoveredPoint;
  const averageY = yForPrice(averagePrice);
  const tooltipX = activePoint ? Math.max(88, Math.min(activePoint.x, width - 98)) : 0;
  const tooltipY = activePoint ? Math.max(12, activePoint.y - 72) : 0;

  return (
    <div className="chart-box" onMouseLeave={() => setHoveredPoint(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="농산물 가격 추이 그래프">
        <defs>
          <linearGradient id="priceAreaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2f8b43" stopOpacity="0.17" />
            <stop offset="100%" stopColor="#2f8b43" stopOpacity="0.025" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick.value} className="grid-row">
            <line x1={padding.left} x2={width - padding.right} y1={tick.y} y2={tick.y} />
            <text x={padding.left - 12} y={tick.y + 4} textAnchor="end">{tick.value.toLocaleString('ko-KR')}</text>
          </g>
        ))}

        <line className="average-line" x1={padding.left} x2={width - padding.right} y1={averageY} y2={averageY} />
        <g className="average-label">
          <rect x={width - padding.right + 10} y={averageY - 13} width="50" height="24" rx="8" />
          <text x={width - padding.right + 35} y={averageY + 4} textAnchor="middle">평균</text>
        </g>

        {activePoint ? (
          <line className="hover-guide" x1={activePoint.x} x2={activePoint.x} y1={padding.top} y2={height - padding.bottom} />
        ) : null}

        <path d={areaPath} className="line-area" />
        <path d={path} className="line-path" />

        {points.map((point, index) => {
          const isLast = index === points.length - 1;
          const isActive = activePoint && point.date === activePoint.date && point.price === activePoint.price;
          const showDot = cleaned.length <= 45 || index % dotEvery === 0 || isLast || isActive;

          return (
            <g
              key={`${point.date}-${point.price}-${index}`}
              className={`line-point ${isActive ? 'active' : ''} ${showDot ? 'visible' : 'hidden-dot'}`}
              onMouseEnter={() => setHoveredPoint(point)}
            >
              {showDot ? <circle cx={point.x} cy={point.y} r={isActive ? '5.5' : isLast ? '4.8' : '3.2'} /> : null}
              <circle className="line-hit" cx={point.x} cy={point.y} r="16" />
            </g>
          );
        })}

        {tickIndexes.map((index) => {
          const point = points[index];
          return (
            <text key={`${point.date}-label`} className="x-tick" x={point.x} y={height - 16} textAnchor="middle">
              {formatDate(point.date)}
            </text>
          );
        })}

        {lastPoint ? (
          <g className="value-tag">
            <rect x={Math.min(lastPoint.x + 14, width - 86)} y={lastPoint.y - 18} width="76" height="32" rx="10" />
            <text x={Math.min(lastPoint.x + 52, width - 48)} y={lastPoint.y + 2} textAnchor="middle">{latestPrice ? latestPrice.toLocaleString('ko-KR') : '-'}</text>
          </g>
        ) : null}

        {activePoint ? (
          <g className="chart-tooltip-group">
            <rect x={tooltipX - 78} y={tooltipY} width="156" height="54" rx="13" />
            <text x={tooltipX} y={tooltipY + 22} textAnchor="middle">{formatFullDate(activePoint.date)}</text>
            <text x={tooltipX} y={tooltipY + 40} textAnchor="middle">{formatWon(activePoint.price)}</text>
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

function buildAiBullets(itemName, stats, range) {
  const diffFromAverage = stats.latest !== null && stats.average !== null ? stats.latest - stats.average : null;
  const avgRate = stats.average ? ((diffFromAverage / stats.average) * 100) : null;
  const trend = getTrendLabel(stats.diff);
  const recommendation = stats.diff === null
    ? '데이터가 충분하지 않아 추세 해석이 어렵습니다.'
    : Math.abs(stats.rate ?? 0) >= 5
      ? '변동 폭이 큰 구간이므로 며칠간의 추가 흐름을 함께 확인하는 편이 좋습니다.'
      : trend === '상승세'
        ? '완만한 상승 흐름으로 해석할 수 있습니다.'
        : trend === '하락세'
          ? '단기 조정 흐름으로 볼 수 있습니다.'
          : '큰 변동 없는 보합권 흐름입니다.';

  return [
    {
      title: `최근 ${range}일 흐름`,
      text: `${itemName}는 최근 ${range}일 기준 ${trend}입니다. 현재가는 ${formatWon(stats.latest)}입니다.`,
    },
    {
      title: '전일 비교',
      text: `전일 대비 ${formatSignedWon(stats.diff)} (${formatPercent(stats.rate)}) 변동했습니다.`,
    },
    {
      title: '평균 비교',
      text: `최근 ${range}일 평균 ${formatWon(stats.average)} 대비 ${formatSignedWon(diffFromAverage)} (${formatPercent(avgRate)}) 수준입니다.`,
    },
    {
      title: '구간 정보',
      text: `최고가 ${formatWon(stats.max)}, 최저가 ${formatWon(stats.min)} 구간이 확인됩니다.`,
    },
    {
      title: '단기 체크',
      text: recommendation,
    },
  ];
}

function createReportBullets({ itemName, stats, range, report }) {
  if (report?.summary?.length) {
    const titles = ['핵심 요약', '가격 흐름', '평균 비교', '관찰 포인트'];
    const summary = report.summary.slice(0, 4).map((line, index) => ({
      title: titles[index] || '요약',
      text: String(line),
    }));

    if (report.recommendation && summary.length < 5) {
      summary.push({ title: '단기 체크', text: report.recommendation });
    }

    return summary;
  }

  return buildAiBullets(itemName, stats, range);
}

function AiReportCard({ itemName, stats, range, report, source }) {
  const bullets = createReportBullets({ itemName, stats, range, report });
  const sourceLabel = source === 'Gemini API'
    ? 'AI 리포트는 Gemini API 분석 결과를 바탕으로 생성됩니다.'
    : 'AI 리포트는 가격 데이터 분석 결과를 바탕으로 생성됩니다.';

  return (
    <aside className="side-card ai-card">
      <div className="side-title">
        <h2>AI 리포트</h2>
        <span className="sparkle">✦</span>
      </div>
      <ul className="report-list compact">
        {bullets.map((bullet) => (
          <li key={`${bullet.title}-${bullet.text}`}>
            <strong>{bullet.title}</strong>
            <p>{bullet.text}</p>
          </li>
        ))}
      </ul>
      <div className="side-note">{sourceLabel}</div>
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
          <CropIcon id={itemId} className="season-crop-icon" />
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
  const cleaned = (series || []).filter((point) => getValidPrice(point.price) !== null);
  if (!cleaned.length) return <div className="mini-empty">데이터 없음</div>;

  const width = 120;
  const height = 34;
  const pad = 3;
  const values = cleaned.map((point) => Number(point.price));
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
          const hasData = stats.latest !== null;
          return (
            <article key={item.id} className={`compare-item ${selectedId === item.id ? 'active' : ''}`}>
              <div className="compare-head">
                <CropIcon id={item.id} className="compare-crop-icon" />
                <div>
                  <strong>{item.name}</strong>
                  <span>{hasData ? formatWon(stats.latest) : '데이터 없음'}</span>
                </div>
                <b className={hasData ? trendClass : 'flat'}>{hasData ? formatPercent(stats.rate) : '-'}</b>
              </div>
              <MiniSparkline series={(item.series || []).slice(-14)} positive={(stats.diff ?? 0) >= 0} />
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
      <p>데이터 출처: KAMIS 농산물유통정보 Open API · 차트 기준: 날짜별 평균 가격</p>
      <p>본 화면은 개인 포트폴리오용 데모입니다.</p>
      <p>© 2026 Farm Price Note. 무단 복제 및 상업적 이용을 금합니다.</p>
    </footer>
  );
}

function EmptyState({ message }) {
  return (
    <main className="app-shell">
      <AppHeader generatedAt={null} />
      <section className="empty-state-card">
        <h2>데이터를 불러오지 못했습니다.</h2>
        <p>{message}</p>
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
  const selectedAiReport = selectedItem?.id ? aiReports?.reports?.[selectedItem.id]?.[String(range)] : null;

  const downloadPriceData = () => {
    if (!selectedItem || !visibleSeries.length) return;

    const rows = [
      ['품목', '날짜', '가격', '단위'],
      ...visibleSeries.map((point) => [selectedItem.name, point.date, point.price, selectedItem.unit || '']),
    ];
    const csv = `\ufeff${rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('\"', '\"\"')}"`).join(',')).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `farm-price-${selectedItem.id}-${range}days.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return <EmptyState message={error} />;
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
    return <EmptyState message="표시할 농산물 데이터가 없습니다." />;
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
        <section className="chart-card">
          <div className="chart-head">
            <div className="chart-title-wrap">
              <div className="chart-title-line">
                <CropIcon id={selectedItem?.id} className="chart-title-icon" />
                <h2>{selectedItem?.name} 가격 추이</h2>
              </div>
              <p>단위: {selectedItem?.unit || '-'} · 날짜별 평균 가격</p>
              <span className="chart-guide">그래프 점에 마우스를 올리면 날짜와 가격을 확인할 수 있습니다.</span>
            </div>
            <button type="button" className="outline-button" onClick={downloadPriceData}>데이터 다운로드</button>
          </div>
          <LineChart series={visibleSeries} latestPrice={stats.latest} />
          <SummaryCards stats={stats} range={range} />
        </section>

        <div className="side-panel">
          <AiReportCard itemName={selectedItem?.name} stats={stats} range={range} report={selectedAiReport} source={aiReports?.source} />
          <SeasonCard itemId={selectedItem?.id} itemName={selectedItem?.name} />
        </div>
      </section>

      <ComparisonSection items={items} selectedId={selectedItem?.id} />
      <Footer />
    </main>
  );
}

export default App;
