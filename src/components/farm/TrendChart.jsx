import { useState } from 'react';
import { formatNumber } from '../../lib/format.js';

function EmptyTrend({ title, unit, period, onReset }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5" aria-labelledby="trend-title">
      <div className="mb-3 flex items-start justify-between md:mb-4">
        <div>
          <h2 id="trend-title" className="text-[16px] font-black text-slate-950 md:text-lg">
            {title} <span className="text-sm font-bold text-slate-400">(전국 평균)</span>
          </h2>
          <p className="mt-3 text-xs font-bold text-slate-500 md:mt-4">단위: {unit}</p>
        </div>
        <div className="rounded-full border border-slate-200 p-1 text-xs font-extrabold text-slate-500">
          {['최근 7일', '최근 30일'].map((option) => (
            <span key={option} className={`inline-flex rounded-full px-3 py-2 ${period === option ? 'bg-emerald-50 text-emerald-700' : ''}`}>{option.replace('최근 ', '')}</span>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center text-sm font-bold text-slate-500">
        <svg viewBox="0 0 320 120" className="mx-auto mb-4 h-28 w-full max-w-[320px] text-slate-300" aria-hidden="true">
          <line x1="24" y1="24" x2="300" y2="24" stroke="currentColor" opacity="0.35" />
          <line x1="24" y1="58" x2="300" y2="58" stroke="currentColor" opacity="0.35" />
          <line x1="24" y1="92" x2="300" y2="92" stroke="currentColor" opacity="0.35" />
          <polyline points="26,88 70,70 114,74 158,44 204,52 248,32 296,38" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
          <circle cx="248" cy="32" r="8" fill="white" stroke="currentColor" strokeWidth="5" />
        </svg>
        가격 그래프 데이터 수집 대기 중입니다.
        {onReset && <button type="button" onClick={onReset} aria-label="그래프 조건 초기화" className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow-sm shadow-emerald-900/10">조건 초기화</button>}
      </div>
    </section>
  );
}

export default function TrendChart({ values = [], labels = [], title = '가격 그래프', unit = '원/kg', period = '최근 7일', featured = false, onReset }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const safeLabels = labels.length ? labels : values.map((_, index) => `지점 ${index + 1}`);
  const axisLabels = new Set([0, Math.floor((safeLabels.length - 1) / 2), safeLabels.length - 1]);
  if (!values.length) return <EmptyTrend title={title} unit={unit} period={period} onReset={onReset} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const latest = values.at(-1) || 0;
  const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const pointData = values.map((value, index) => {
    const step = values.length > 1 ? 330 / (values.length - 1) : 0;
    const x = Math.round(42 + index * step);
    const y = Math.round(180 - ((value - min) / range) * 130);
    return { value, label: safeLabels[index] || `지점 ${index + 1}`, x, y };
  });
  const selectedIndex = activeIndex ?? pointData.length - 1;
  const selected = pointData[selectedIndex] || pointData.at(-1);
  const points = pointData.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `42,180 ${points} 372,180`;
  const averageY = Math.round(180 - ((average - min) / range) * 130);
  const tooltipX = selected.x > 270 ? selected.x - 132 : selected.x + 12;
  const tooltipY = selected.y > 82 ? selected.y - 58 : selected.y + 18;

  return (
    <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 ${featured ? 'ring-1 ring-emerald-100' : ''}`} aria-labelledby="trend-title">
      <div className="mb-3 flex items-start justify-between md:mb-4">
        <div>
          <h2 id="trend-title" className="text-[16px] font-black text-slate-950 md:text-lg">
            {title} <span className="text-sm font-bold text-slate-400">(전국 평균)</span>
          </h2>
          <p className="mt-3 text-xs font-bold text-slate-500 md:mt-4">단위: {unit}</p>
        </div>
        <div className="rounded-full border border-slate-200 p-1 text-xs font-extrabold text-slate-500">
          {['최근 7일', '최근 30일'].map((option) => (
            <span key={option} className={`inline-flex rounded-full px-3 py-2 ${period === option ? 'bg-emerald-50 text-emerald-700' : ''}`}>{option.replace('최근 ', '')}</span>
          ))}
        </div>
      </div>
      <div className="mb-3 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 px-3 py-2 text-center text-[11px] font-extrabold text-slate-500">
        <span>현재 <strong className="ml-1 text-emerald-700">{formatNumber(latest)}</strong></span>
        <span>평균 <strong className="ml-1 text-slate-700">{formatNumber(average)}</strong></span>
        <span>최저 <strong className="ml-1 text-slate-700">{formatNumber(min)}</strong></span>
        <span>최고 <strong className="ml-1 text-slate-700">{formatNumber(max)}</strong></span>
      </div>
      <svg viewBox="0 0 410 240" role="img" aria-label={`${title}: ${selected.label} ${formatNumber(selected.value)}${unit}`} className="h-[200px] w-full md:h-[208px]" onMouseLeave={() => setActiveIndex(null)}>
        <text x="8" y="54" fontSize="11" fill="#64748b" fontWeight="800">{formatNumber(max)}</text>
        <line x1="42" y1="50" x2="392" y2="50" stroke="#e5e7eb" />
        <text x="8" y={averageY + 4} fontSize="11" fill="#047857" fontWeight="800">{formatNumber(average)}</text>
        <line x1="42" y1={averageY} x2="392" y2={averageY} stroke="#a7f3d0" strokeDasharray="6 6" />
        <text x="322" y={Math.max(averageY - 8, 24)} fontSize="11" fill="#047857" fontWeight="800">평균선</text>
        <text x="8" y="164" fontSize="11" fill="#64748b" fontWeight="800">{formatNumber(min)}</text>
        <line x1="42" y1="160" x2="392" y2="160" stroke="#e5e7eb" />
        <line x1="42" y1="184" x2="392" y2="184" stroke="#cbd5e1" strokeWidth="1.2" />
        <polygon points={area} fill="#10b981" opacity="0.09" />
        <polyline points={points} fill="none" stroke="#047857" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1={selected.x} y1="42" x2={selected.x} y2="182" stroke="#047857" strokeDasharray="4 5" opacity="0.32" />
        {pointData.map((point, index) => (
          <circle
            key={`${point.value}-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === selectedIndex ? '6' : '5'}
            fill="#047857"
            stroke="white"
            strokeWidth="3"
            tabIndex="0"
            aria-label={`${point.label} ${formatNumber(point.value)}${unit}`}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
            onMouseEnter={() => setActiveIndex(index)}
          />
        ))}
        <g aria-hidden="true">
          <rect x={tooltipX} y={tooltipY} width="128" height="48" rx="14" fill="#0f172a" opacity="0.94" />
          <text x={tooltipX + 14} y={tooltipY + 20} fontSize="11" fill="#bbf7d0" fontWeight="800">{selected.label}</text>
          <text x={tooltipX + 14} y={tooltipY + 37} fontSize="13" fill="white" fontWeight="900">{formatNumber(selected.value)}{unit}</text>
        </g>
        <rect x="304" y="62" width="82" height="28" rx="14" fill="#ecfdf5" stroke="#bbf7d0" />
        <text x="316" y="81" fontSize="12" fill="#047857" fontWeight="900">현재 {formatNumber(latest)}</text>
        {safeLabels.map((label, index) => axisLabels.has(index) ? (
          <text key={`${label}-${index}`} x={30 + index * (safeLabels.length > 1 ? 330 / (safeLabels.length - 1) : 1)} y="218" fontSize="12" fill="#64748b" fontWeight="700">{label}</text>
        ) : null)}
      </svg>
      <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800" aria-live="polite">
        선택 지점: {selected.label} · {formatNumber(selected.value)}{unit}
      </p>
    </section>
  );
}
