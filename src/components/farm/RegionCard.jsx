import { useEffect, useState } from 'react';
import { formatNumber } from '../../lib/format.js';

const widthClasses = ['w-[92%]', 'w-[80%]', 'w-[70%]', 'w-[62%]', 'w-[52%]', 'w-[45%]', 'w-[38%]', 'w-[32%]'];

function MapSkeleton() {
  return (
    <div className="rounded-2xl border border-dashed border-emerald-100 bg-emerald-50/50 p-5" aria-hidden="true">
      <div className="mx-auto grid h-44 max-w-[420px] grid-cols-5 gap-2">
        <span className="col-span-2 row-span-2 rounded-2xl bg-emerald-100/70" />
        <span className="col-span-2 rounded-2xl bg-emerald-200/50" />
        <span className="rounded-2xl bg-emerald-100/70" />
        <span className="col-span-3 rounded-2xl bg-emerald-100/80" />
        <span className="col-span-2 row-span-2 rounded-2xl bg-emerald-200/60" />
        <span className="col-span-2 rounded-2xl bg-emerald-100/70" />
        <span className="rounded-2xl bg-emerald-100/90" />
      </div>
    </div>
  );
}

function EmptyRegion({ wide, onReset }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
      {wide && <MapSkeleton />}
      <p className={wide ? 'mt-4' : ''}>지역별 가격 데이터 수집 대기 중입니다.</p>
      {onReset && <button type="button" onClick={onReset} aria-label="지역 비교 조건 초기화" className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow-sm shadow-emerald-900/10">조건 초기화</button>}
    </div>
  );
}

function RegionBars({ rows, activeName, setActiveName }) {
  return (
    <div className="space-y-2.5">
      {rows.map((row, index) => (
        <button
          type="button"
          key={row.name}
          className="grid w-full grid-cols-[78px_1fr_82px] items-center gap-3 rounded-lg text-left text-xs outline-none transition hover:bg-emerald-50/50 focus-visible:ring-2 focus-visible:ring-emerald-600 md:grid-cols-[82px_1fr_86px] md:gap-3 md:text-[13px]"
          aria-label={`${row.name} ${formatNumber(row.price)}원/kg`}
          onClick={() => setActiveName(row.name)}
          onMouseEnter={() => setActiveName(row.name)}
          onFocus={() => setActiveName(row.name)}
        >
          <span className="font-bold text-slate-700">{row.name}</span>
          <span className="h-2 rounded-full bg-slate-100"><span className={`block h-2 rounded-full ${row.name === activeName ? 'bg-emerald-700' : 'bg-emerald-500/65'} ${widthClasses[index] || 'w-[30%]'}`} /></span>
          <span className="text-right font-black text-slate-950">{formatNumber(row.price)}</span>
        </button>
      ))}
    </div>
  );
}

export default function RegionCard({ rows, variant = 'default', compact = false, onReset }) {
  const [activeName, setActiveName] = useState(rows[0]?.name || '');
  useEffect(() => { setActiveName(rows[0]?.name || ''); }, [rows]);
  const activeRegion = rows.find((row) => row.name === activeName) || rows[0] || null;
  const isWide = variant === 'wide';
  return (
    <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-4 md:p-5'}`} aria-labelledby="region-title">
      <div className="mb-3 flex items-start justify-between gap-3 md:mb-4">
        <div>
          <h2 id="region-title" className="text-[16px] font-black text-slate-950 md:text-lg">
            {isWide ? '지역별 가격 지도' : '주요 지역 비교'} <span className="text-sm font-bold text-slate-400">(원/kg)</span>
          </h2>
          {isWide && <p className="mt-1 text-xs font-bold text-slate-500">지역별 평균가 차이를 크게 비교합니다.</p>}
        </div>
        {activeRegion && <p className="text-right text-xs font-extrabold text-emerald-700" aria-live="polite">{activeRegion.name} · {formatNumber(activeRegion.price)}원/kg</p>}
      </div>
      {!rows.length ? <EmptyRegion wide={isWide} onReset={onReset} /> : (
        <>
          {isWide ? (
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
                <div className="grid h-full min-h-[260px] grid-cols-6 gap-2" aria-hidden="true">
                  {rows.slice(0, 8).map((row, index) => (
                    <button
                      type="button"
                      key={row.name}
                      onClick={() => setActiveName(row.name)}
                      onMouseEnter={() => setActiveName(row.name)}
                      onFocus={() => setActiveName(row.name)}
                      className={`rounded-2xl border px-3 py-3 text-left transition focus-visible:ring-2 focus-visible:ring-emerald-700 ${index === 0 ? 'col-span-3 row-span-2' : index === 1 ? 'col-span-3' : index === 2 ? 'col-span-2' : index === 3 ? 'col-span-2' : 'col-span-3'} ${row.name === activeName ? 'border-emerald-600 bg-white shadow-sm' : 'border-emerald-100 bg-white/70'}`}
                    >
                      <span className="block text-xs font-extrabold text-slate-600">{row.name}</span>
                      <span className="mt-1 block text-sm font-black text-emerald-800">{formatNumber(row.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <RegionBars rows={rows} activeName={activeName} setActiveName={setActiveName} />
            </div>
          ) : <RegionBars rows={rows} activeName={activeName} setActiveName={setActiveName} />}
          <table className="sr-only"><caption>지역별 평균 가격 비교 표</caption><tbody>{rows.map((row) => <tr key={row.name}><th scope="row">{row.name}</th><td>{row.price}</td></tr>)}</tbody></table>
        </>
      )}
    </section>
  );
}
