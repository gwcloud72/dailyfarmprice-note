import { card, compactInput, crops, regions, shell, trend } from './showcaseData.js';

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 4C12 4 6 9 6 17c0 2 1 3 3 3 8 0 13-8 11-16Z" />
          <path d="M6 18c4-5 8-8 14-14" />
        </svg>
      </span>
      <div>
        <p className="text-[15px] font-black tracking-tight text-slate-950">농산물 가격정보</p>
        
      </div>
    </div>
  );
}

function Header() {
  const tabs = ['홈', '품목별 시세', '지역별 비교', '가격 리포트', '관심 품목'];
  return (
    <header className="flex h-[58px] items-center justify-between border-b border-slate-100 px-6">
      <Logo />
      <nav className="flex items-center gap-5" aria-label="쇼케이스 주요 메뉴">
        {tabs.map((tab, index) => (
          <a key={tab} href="#/showcase" aria-current={index === 0 ? 'page' : undefined} className={index === 0 ? 'text-[12px] font-extrabold text-slate-950' : 'text-[12px] font-semibold text-slate-500'}>{tab}</a>
        ))}
      </nav>
      <span className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-bold text-white">기준일 05.24</span>
    </header>
  );
}

function Toolbar() {
  return (
    <section className="mx-6 mt-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-[1fr_1fr_1fr_2fr_1fr_auto] gap-3">
        <span className={compactInput}>배추</span>
        <span className={compactInput}>전국</span>
        <span className={compactInput}>7일</span>
        <span className={compactInput}>품목·시장 검색</span>
        <span className={compactInput}>변동 큰 순</span>
        <span className="grid h-9 place-items-center rounded-xl bg-slate-950 px-5 text-[12px] font-black text-white">조회</span>
      </div>
    </section>
  );
}

function Summary() {
  return (
    <section className="mx-6 mt-4 grid grid-cols-[1.15fr_1fr_1fr] gap-3">
      <article className="rounded-[22px] bg-emerald-600 p-4 text-white shadow-sm">
        <p className="text-[11px] font-bold opacity-80">오늘 가장 눈에 띄는 변화</p>
        <p className="mt-2 text-[31px] font-black tracking-tight">배추 1,280원</p>
        <p className="mt-1 text-[12px] font-bold opacity-90">전일 대비 +40원 · 서울 평균 기준</p>
      </article>
      <article className={`${card} p-4`}>
        <p className="text-[11px] font-bold text-slate-400">오른 품목</p>
        <p className="mt-2 text-[25px] font-black text-slate-950">3개</p>
        <p className="mt-1 text-[11px] font-bold text-emerald-700">대파·배추 중심</p>
      </article>
      <article className={`${card} p-4`}>
        <p className="text-[11px] font-bold text-slate-400">내린 품목</p>
        <p className="mt-2 text-[25px] font-black text-slate-950">2개</p>
        <p className="mt-1 text-[11px] font-bold text-blue-600">양파·오이 하락</p>
      </article>
    </section>
  );
}

function CropTable() {
  return (
    <article className={`${card} min-w-0 p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-black tracking-tight">주요 품목 시세</h2>
        <span className="text-[11px] font-semibold text-slate-400">kg 단위</span>
      </div>
      <table className="w-full table-fixed text-left">
        <caption className="sr-only">쇼케이스 농산물 가격표</caption>
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-400">
            <th className="w-[18%] px-3 py-2">품목</th><th className="w-[18%] px-3 py-2 text-right">평균가</th><th className="w-[18%] px-3 py-2 text-right">전일 대비</th><th className="w-[16%] px-3 py-2 text-right">등락률</th><th className="w-[15%] px-3 py-2 text-right">최고</th><th className="w-[15%] px-3 py-2 text-right">최저</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {crops.map(([name, price, diff, rate, high, low], index) => (
            <tr key={name} className={index === 0 ? 'bg-emerald-50/50' : ''}>
              <td className="px-3 py-3 text-[12px] font-black text-slate-900">{name}</td>
              <td className="px-3 py-3 text-right text-[13px] font-black tabular-nums text-slate-950">{price}</td>
              <td className={diff.startsWith('-') ? 'px-3 py-3 text-right text-[11px] font-bold text-blue-600' : 'px-3 py-3 text-right text-[11px] font-bold text-rose-600'}>{diff}</td>
              <td className={rate.startsWith('-') ? 'px-3 py-3 text-right text-[11px] font-bold text-blue-600' : 'px-3 py-3 text-right text-[11px] font-bold text-rose-600'}>{rate}</td>
              <td className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500">{high}</td>
              <td className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500">{low}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function TrendChart() {
  return (
    <article className={`${card} min-w-0 p-4`}>
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-black tracking-tight">가격 변동 추이</h2>
        <span className="text-[11px] font-bold text-emerald-700">05.24 · 1,280원</span>
      </div>
      <div className="mt-3 rounded-2xl bg-emerald-50/50 p-3">
        <svg viewBox="0 0 344 150" className="h-[154px] w-full" role="img" aria-label="7일 농산물 가격 추이">
          <line x1="10" x2="334" y1="104" y2="104" stroke="#d1fae5" strokeWidth="1" />
          <line x1="10" x2="334" y1="72" y2="72" stroke="#bbf7d0" strokeDasharray="5 5" strokeWidth="1" />
          <path d="M12 116 C50 102 67 110 98 94 C126 80 151 93 180 72 C213 48 237 66 267 52 C296 38 315 40 332 32" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" />
          <circle cx="332" cy="32" r="5" fill="#059669" />
          <text x="244" y="24" fill="#047857" fontSize="12" fontWeight="800">현재 1,280원</text>
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-slate-500">
        <span className="rounded-xl bg-slate-50 py-2">평균 1,212원</span><span className="rounded-xl bg-slate-50 py-2">최고 1,280원</span><span className="rounded-xl bg-slate-50 py-2">최저 1,120원</span>
      </div>
    </article>
  );
}

function AiReport() {
  const lines = ['배추는 이번 주 평균보다 높게 형성됐습니다.', '대파는 상승폭이 줄었고 양파는 안정권입니다.', '지역별 가격 차이는 제주·서울에서 크게 보입니다.'];
  return (
    <article className={`${card} min-w-0 p-4`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">AI REPORT</p>
      <h2 className="mt-1 text-[15px] font-black tracking-tight">AI 가격 리포트</h2>
      <div className="mt-3 space-y-2">
        {lines.map((line) => <p key={line} className="rounded-xl bg-emerald-50/60 px-3 py-2 text-[11px] font-bold leading-5 text-slate-700">{line}</p>)}
      </div>
    </article>
  );
}

function RegionCards() {
  return (
    <section className="mx-6 mt-3 grid grid-cols-4 gap-3">
      {regions.map(([region, price, rate]) => (
        <article key={region} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-black text-slate-500">{region}</p><p className="mt-1 text-[18px] font-black text-slate-950">{price}</p><p className={rate.startsWith('-') ? 'mt-1 text-[10px] font-bold text-blue-600' : 'mt-1 text-[10px] font-bold text-rose-600'}>{rate}</p>
        </article>
      ))}
    </section>
  );
}

function DesktopFrame() {
  return (
    <div className={shell.desktop}>
      <Header />
      <Toolbar />
      <Summary />
      <main id="main-content" className="mx-6 mt-4 grid grid-cols-[1.45fr_1fr] gap-4"><CropTable /><div className="min-w-0 space-y-3"><TrendChart /><AiReport /></div></main>
      <RegionCards />
    </div>
  );
}

function MobileFrame() {
  return (
    <div className={shell.mobile}><div className={shell.mobileScreen}>
      <div className="border-b border-slate-100 px-4 py-3"><Logo /></div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-2"><span className={compactInput}>배추</span><span className={compactInput}>전국</span><span className={compactInput}>7일</span></div>
        <div className="grid grid-cols-[1fr_78px] gap-2"><span className={compactInput}>검색</span><span className={compactInput}>정렬</span></div>
        <span className="grid h-9 place-items-center rounded-xl bg-slate-950 text-[12px] font-black text-white">조회</span>
        <article className="rounded-2xl bg-emerald-600 p-4 text-white"><p className="text-[11px] font-bold opacity-80">오늘 변화</p><p className="mt-1 text-[28px] font-black">배추 1,280원</p><p className="text-[11px] font-bold opacity-90">+40원 · +3.23%</p></article><article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-[10px] font-black text-emerald-700">AI 리포트</p><p className="mt-1 text-[11px] font-bold leading-5 text-slate-700">배추와 대파가 오늘 가격 흐름을 이끌고 있습니다.</p></article>
        <div className="space-y-2">{crops.slice(0, 4).map(([name, price, diff, rate]) => (<article key={name} className="rounded-2xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><p className="text-[12px] font-black">{name}</p><p className="text-[14px] font-black text-slate-950">{price}</p></div><div className="mt-1 flex items-center justify-between text-[10px] font-bold"><span className="text-slate-400">kg 단위</span><span className={diff.startsWith('-') ? 'text-blue-600' : 'text-rose-600'}>{diff} · {rate}</span></div></article>))}</div>
      </div>
    </div></div>
  );
}

export default function FarmShowcase() {
  return <div className={shell.canvas}><a href="#main-content" className="sr-only focus:not-sr-only">본문 바로가기</a><section className={shell.frame} aria-label="농산물 가격정보 쇼케이스"><DesktopFrame /><MobileFrame /></section></div>;
}
