import { TABS } from '../../data/dashboardData.js';

function LeafIcon({ className = 'size-7 text-emerald-700' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M19.5 4.5C12.8 4.7 7.1 8.4 5.1 14.1c-.8 2.4.4 4.6 2.7 5.1 5.3 1.2 9.7-4.7 11.7-14.7Z" fill="currentColor" opacity="0.16" />
      <path d="M18.8 5.2C12.2 6 7.7 9.4 5.8 14.6c-.7 2 .2 3.6 2.1 4.1 4.5 1.1 8.3-3.7 10.9-13.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.9 18.6c2.8-4.5 6.1-7.7 10.1-9.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Header({ tab, setTab, updatedAt }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="hidden h-[64px] items-center justify-between px-7 md:flex">
        <a href="#home" onClick={(event) => { event.preventDefault(); setTab('home'); }} aria-label="농산물 가격정보 홈" className="flex items-center gap-3">
          <LeafIcon />
          <span className="text-[22px] font-black tracking-tight text-slate-950">농산물 가격정보</span>
        </a>
        <nav aria-label="주요 메뉴" className="flex h-full items-center gap-9 text-[14px] font-extrabold text-slate-800">
          {TABS.map((item) => (
            <a key={item.id} href={`#${item.id}`} onClick={(event) => { event.preventDefault(); setTab(item.id); }} aria-current={tab === item.id ? 'page' : undefined} className={`flex h-full items-center border-b-[3px] px-1 transition ${tab === item.id ? 'border-emerald-700 text-slate-950' : 'border-transparent hover:text-emerald-700'}`}>{item.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-[13px] font-semibold text-slate-500">
          <span>기준일&nbsp; {updatedAt}</span>
          <button type="button" onClick={() => window.location.reload()} aria-label="데이터 새로고침" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-600 shadow-sm transition hover:text-slate-950">↻ 새로고침</button>
        </div>
      </div>
      <div className="grid h-[60px] grid-cols-[40px_1fr_40px] items-center px-4 md:hidden">
        <span aria-hidden="true" />
        <a href="#home" onClick={(event) => { event.preventDefault(); setTab('home'); }} aria-label="농산물 가격정보 홈" className="mx-auto flex items-center gap-2 text-[17px] font-black tracking-tight text-slate-950"><LeafIcon className="size-6 text-emerald-700" /><span>농산물 가격정보</span></a>
        <button type="button" onClick={() => window.location.reload()} aria-label="새로고침" className="grid size-9 place-items-center rounded-xl text-lg text-slate-700">↻</button>
      </div>
      <nav aria-label="모바일 주요 메뉴" className="fixed inset-x-0 bottom-0 z-[100] flex gap-2 overflow-x-auto border-t border-slate-200 bg-white/95 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-14px_32px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
        {TABS.map((item) => (
          <a
            key={`mobile-${item.id}`}
            href={`#${item.id}`}
            onClick={(event) => {
              event.preventDefault();
              setTab(item.id);
            }}
            aria-current={tab === item.id ? 'page' : undefined}
            className={`shrink-0 rounded-full border px-3 py-2 text-[12px] font-extrabold transition ${tab === item.id ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
