import { useEffect, useState } from 'react';
import { SORT_OPTIONS } from '../../lib/dashboardFilters.js';
import { formatNumber } from '../../lib/format.js';

const control = 'h-10 rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-[14px] font-semibold text-slate-900 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100';
const mobileControl = 'h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-[14px] font-semibold text-slate-900 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100';
const resetButton = 'rounded-xl border border-slate-300 bg-white font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45';
const mobileAction = 'h-11 shrink-0 rounded-xl px-3 text-[13px] font-extrabold transition';
function Field({ label, children }) { return <label className="grid gap-1.5 text-[12px] font-semibold text-slate-600 md:text-[12px]">{label}{children}</label>; }

export default function Toolbar({ filters, setFilter, itemOptions, regionOptions, resultCount, reset, canReset, dataSourceLabel }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const detailId = 'farm-mobile-bottom-sheet';
  const queryLabel = filters.query.trim();

  useEffect(() => {
    if (!filtersOpen || typeof window === 'undefined') return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [filtersOpen]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4" aria-label="농산물 검색 조건">
      <div className="hidden gap-3 md:grid md:grid-cols-[1.05fr_0.95fr_0.95fr_1.35fr_1fr_92px]">
        <Field label="품목 선택"><select aria-label="품목 선택" value={filters.item} onChange={(event) => setFilter('item', event.target.value)} className={control}><option>전체 품목</option>{itemOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="지역 선택"><select aria-label="지역 선택" value={filters.region} onChange={(event) => setFilter('region', event.target.value)} className={control}><option>전국</option>{regionOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="기간 선택"><select aria-label="기간 선택" value={filters.period} onChange={(event) => setFilter('period', event.target.value)} className={control}><option>최근 7일</option><option>최근 30일</option><option>최근 90일</option></select></Field>
        <Field label="품목명 검색"><input aria-label="품목명 검색" value={filters.query} onChange={(event) => setFilter('query', event.target.value)} placeholder="품목명 검색" className={control} /></Field>
        <Field label="정렬 선택"><select aria-label="정렬 선택" value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)} className={control}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <button type="button" onClick={reset} disabled={!canReset} aria-label="농산물 검색 조건 초기화" className={`mt-auto h-10 px-3 text-[13px] ${resetButton}`}>초기화</button>
      </div>
      <div className="md:hidden">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="farm-mobile-query">품목명 검색</label>
          <input id="farm-mobile-query" aria-label="품목명 검색" value={filters.query} onChange={(event) => setFilter('query', event.target.value)} placeholder="품목명 검색" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-[14px] font-semibold text-slate-900 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
          <button type="button" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" aria-expanded={filtersOpen} aria-controls={detailId} className={`${mobileAction} border border-emerald-200 bg-emerald-50 text-emerald-800`}>필터</button>
          <button type="button" onClick={reset} disabled={!canReset} aria-label="농산물 검색 조건 초기화" className={`${mobileAction} ${resetButton}`}>초기화</button>
        </div>
        {canReset && <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-extrabold text-emerald-800" aria-label="적용된 농산물 필터">
          {queryLabel && <span title={queryLabel} className="max-w-[170px] shrink-0 truncate rounded-full bg-emerald-50 px-2.5 py-1 ring-1 ring-emerald-100">검색: {queryLabel}</span>}
          {filters.item !== '전체 품목' && <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 ring-1 ring-emerald-100">{filters.item}</span>}
          {filters.region !== '전국' && <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 ring-1 ring-emerald-100">{filters.region}</span>}
          {filters.period !== '최근 7일' && <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 ring-1 ring-emerald-100">{filters.period}</span>}
          {filters.sort !== 'change-desc' && <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 ring-1 ring-emerald-100">정렬 변경</span>}
        </div>}
        {filtersOpen && (
          <div className="fixed inset-0 z-[120] md:hidden" role="dialog" aria-modal="true" aria-labelledby="farm-mobile-filter-title">
            <button type="button" className="absolute inset-0 bg-slate-950/35" aria-label="상세 필터 닫기" onClick={() => setFiltersOpen(false)} />
            <div id={detailId} className="absolute inset-x-0 bottom-0 max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-t-[28px] bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="farm-mobile-filter-title" className="text-base font-black text-slate-950">상세 필터</h2>
                <button type="button" onClick={() => setFiltersOpen(false)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">닫기</button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select aria-label="품목 선택" value={filters.item} onChange={(event) => setFilter('item', event.target.value)} className={mobileControl}><option>전체 품목</option>{itemOptions.map((item) => <option key={item}>{item}</option>)}</select>
                <select aria-label="지역 선택" value={filters.region} onChange={(event) => setFilter('region', event.target.value)} className={mobileControl}><option>전국</option>{regionOptions.map((item) => <option key={item}>{item}</option>)}</select>
                <select aria-label="기간 선택" value={filters.period} onChange={(event) => setFilter('period', event.target.value)} className={mobileControl}><option>최근 7일</option><option>최근 30일</option><option>최근 90일</option></select>
                <select aria-label="정렬 선택" value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)} className={mobileControl}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              </div>
              <button type="button" onClick={() => setFiltersOpen(false)} className="mt-3 h-11 w-full rounded-xl bg-emerald-800 text-sm font-extrabold text-white">적용</button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs font-bold text-slate-500 md:mt-3" aria-live="polite">현재 조건 결과 {formatNumber(resultCount)}건 · {dataSourceLabel}</p>
    </section>
  );
}
