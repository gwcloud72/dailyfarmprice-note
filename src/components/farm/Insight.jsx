import { formatNumber, signed } from '../../lib/format.js';

function Summary({ label, value, unit, sub, accent, down }) {
  return (
    <div className="px-3 py-2 md:border-l md:border-slate-200 md:py-0 md:pl-8">
      <p className="text-[11px] font-bold text-slate-500 md:text-xs">{label}</p>
      <strong className="mt-1.5 block text-[20px] font-black leading-none text-slate-950 md:mt-2 md:text-[27px]">{value}<span className="ml-1 text-[11px] font-bold text-slate-600 md:text-sm">{unit}</span></strong>
      <p className="mt-1.5 text-[11px] font-semibold text-slate-500 md:mt-2 md:text-xs">{sub} <span className={down ? 'text-blue-600' : 'text-red-500'}>{accent}</span></p>
    </div>
  );
}

export default function Insight({ rows, updatedAt, headline }) {
  const risers = rows.filter((row) => row.change > 0).length;
  const fallers = rows.filter((row) => row.change < 0).length;
  const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.price, 0) / rows.length) : null;
  const diffAverage = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.change, 0) / rows.length) : 0;
  return (
    <section className="rounded-2xl border border-emerald-100 bg-[#fbfbf4] p-4 shadow-sm md:p-5" aria-label="오늘 농산물 가격 요약">
      <div className="grid gap-3 md:grid-cols-[1.45fr_0.78fr_0.78fr_0.78fr] md:items-center">
        <div className="flex gap-3 md:gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lime-200 to-emerald-700 text-xl text-white shadow-lg shadow-emerald-800/15 md:size-14 md:text-xl" aria-hidden="true">☘</span>
          <div>
            <h1 className="text-[18px] font-black leading-snug tracking-tight text-slate-950 md:text-[21px]">{headline}</h1>
            <p className="mt-1.5 text-xs font-semibold text-slate-500 md:mt-2 md:text-[13px]">전국 평균 기준 {updatedAt}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white/70 md:contents md:border-0 md:bg-transparent">
          <Summary label="평균가 (전체)" value={average === null ? '-' : formatNumber(average)} unit="원/kg" sub="평균 변동" accent={signed(diffAverage, '원')} down={diffAverage < 0} />
          <Summary label="상승 품목" value={formatNumber(risers)} unit="품목" sub="현재 조건" accent="상승" />
          <Summary label="하락 품목" value={formatNumber(fallers)} unit="품목" sub="현재 조건" accent="하락" down />
        </div>
      </div>
    </section>
  );
}
