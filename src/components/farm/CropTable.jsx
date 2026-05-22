import { useEffect, useState } from 'react';
import { formatNumber } from '../../lib/format.js';

const PAGE_SIZE = 8;

function LeafIcon() {
  return (
    <svg viewBox="0 0 48 48" className="mx-auto mb-3 size-12 text-emerald-300" aria-hidden="true">
      <path d="M39 9C24 10 11 18 10 32c0 7 5 11 12 11 13-1 20-15 21-32 0-1-1-2-4-2Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 38c7-9 13-14 25-23" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function changeMeta(row) {
  if (row.change > 0) return { mark: '▲', color: 'text-red-500', rate: row.rate > 0 ? `+${row.rate}%` : `${row.rate}%` };
  if (row.change < 0) return { mark: '▼', color: 'text-blue-600', rate: `${row.rate}%` };
  return { mark: '–', color: 'text-slate-400', rate: '0%' };
}

function EmptyState({ message = '조건에 맞는 결과가 없습니다.', onReset, actionLabel = '조건 초기화' }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-9 text-center text-sm font-bold text-slate-500">
      <LeafIcon />
      <p>{message}</p><p className="mt-1 text-xs font-semibold text-slate-400">조건을 바꾸거나 전체 목록으로 돌아가면 다시 탐색할 수 있습니다.</p>
      {onReset && <button type="button" onClick={onReset} aria-label={actionLabel} className="mt-4 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-900">{actionLabel}</button>}
    </div>
  );
}

function CropRow({ row, favorites }) {
  const isFavorite = favorites?.has(row.id);
  const change = changeMeta(row);
  return <tr className="transition hover:bg-emerald-50/35"><td className="min-w-0 px-3 py-[8px]"><div className="flex min-w-0 items-center gap-3"><span className="shrink-0 text-xl" aria-hidden="true">{row.icon}</span><span className="line-clamp-2 min-w-0 font-extrabold text-slate-950">{row.name}</span></div></td><td className="px-3 py-[8px] text-right text-[17px] font-black text-slate-950 tabular-nums">{formatNumber(row.price)}</td><td className="px-3 py-[8px] text-right"><span className={`block font-extrabold ${change.color}`}>{change.mark} {formatNumber(Math.abs(row.change))}</span><span className={`text-xs font-bold ${change.color}`}>{change.rate}</span></td><td className="px-3 py-[8px] font-semibold text-slate-600"><span className="line-clamp-2">{row.range}</span></td><td className="px-3 py-[8px] font-semibold text-slate-600"><span className="line-clamp-2">{row.region}</span></td><td className="whitespace-nowrap px-3 py-[8px] text-center"><button type="button" onClick={() => favorites?.toggle(row.id)} aria-label={`${row.name} 관심 품목 토글`} aria-pressed={isFavorite} className={`rounded-lg border px-3 py-2 text-xs font-extrabold ${isFavorite ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-slate-200 text-slate-700'}`}>{isFavorite ? '저장됨' : '관심'}</button></td></tr>;
}

function CropCard({ row, favorites }) {
  const isFavorite = favorites?.has(row.id);
  const change = changeMeta(row);
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="shrink-0 text-3xl" aria-hidden="true">{row.icon}</span><h3 className="line-clamp-2 min-w-0 font-black text-slate-950">{row.name}</h3></div><div className="shrink-0 text-right"><strong className="block text-[17px] font-black text-slate-950 tabular-nums">{formatNumber(row.price)}</strong><span className={`text-xs font-bold ${change.color}`}>{change.mark} {formatNumber(Math.abs(row.change))}</span></div></div><p className="mt-4 line-clamp-2 text-xs font-semibold text-slate-500">{row.range} · {row.region}</p><button type="button" onClick={() => favorites?.toggle(row.id)} aria-label={`${row.name} 관심 품목 토글`} aria-pressed={isFavorite} className={`mt-3 h-9 w-full rounded-xl text-xs font-extrabold ${isFavorite ? 'bg-emerald-800 text-white' : 'border border-slate-200 text-slate-700'}`}>{isFavorite ? '저장됨' : '관심 저장'}</button></article>;
}

function LoadMore({ visibleCount, totalCount, onClick }) {
  if (visibleCount >= totalCount) return null;
  return (
    <div className="mt-4 flex justify-center">
      <button type="button" onClick={onClick} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="품목 더 보기">
        더 보기 <span className="ml-1 text-slate-400">{visibleCount}/{totalCount}</span>
      </button>
    </div>
  );
}

export default function CropTable({ rows, title = '품목 시세', favorites, reset, canReset, emptyMessage, emptyAction, emptyActionLabel }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [rows.length, title]);
  const visibleRows = rows.filter((_, index) => index < visibleCount);
  const handleMore = () => setVisibleCount((count) => Math.min(count + PAGE_SIZE, rows.length));
  const emptyHandler = emptyAction || reset;
  const label = emptyActionLabel || (canReset ? '조건 초기화' : '전체 품목 보기');
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5" aria-labelledby="crop-table-title">
      <h2 id="crop-table-title" className="mb-3 text-[16px] font-black text-slate-950 md:mb-4 md:text-lg">{title} <span className="text-sm font-bold text-slate-400">(전국 평균)</span></h2>
      {!rows.length ? <EmptyState message={emptyMessage} onReset={emptyHandler} actionLabel={label} /> : <>
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
          <table className="w-full table-fixed border-collapse text-sm">
            <caption className="sr-only">전국 평균 농산물 품목별 가격표</caption>
            <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
              <tr><th className="w-[18%] px-3 py-2 text-left">품목</th><th className="w-[19%] px-3 py-2 text-right">평균 가격</th><th className="w-[15%] px-3 py-2 text-right">전일 대비</th><th className="w-[22%] px-3 py-2 text-left">가격 범위</th><th className="w-[18%] px-3 py-2 text-left">대표 지역</th><th className="w-[8%] px-3 py-2 text-center">관심</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((row) => <CropRow key={row.id} row={row} favorites={favorites} />)}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 md:hidden">{visibleRows.map((row) => <CropCard key={row.id} row={row} favorites={favorites} />)}</div>
        <LoadMore visibleCount={visibleRows.length} totalCount={rows.length} onClick={handleMore} />
      </>}
    </section>
  );
}
