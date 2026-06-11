import { useMemo, useState, type ReactNode } from 'react';
import { Database, ExternalLink, FileSpreadsheet, FileText, Newspaper, RefreshCw } from 'lucide-react';
import { HorizontalBarChart } from '../../components/charts/HorizontalBarChart';
import { AlertCard, DownloadStep, FavoriteItem, ItemCard } from '../../components/feature/farm';
import { BottomWidgetPanel, Button, Card, DataTable, EmptyState, FilterChips, MiniTrend, PriceBadge, RankBadge, SearchField, SectionHeader, StatsStrip } from '../../components/common/ui';
import type { FarmData } from '../../data/normalize';
import { ADMIN_REGION_NAMES } from '../../data/sample';

interface PageProps { data: FarmData; onTabChange: (tab: string) => void; onAction: (text: string) => void; }

function Shell({ title, children, data, onAction, compact = false }: { title: string; children: ReactNode; data: FarmData; onAction: (text: string) => void; compact?: boolean }) {
  return <div className="mx-auto max-w-content space-y-ds-3"><SectionHeader title={title} />{children}<BottomWidgetPanel widgets={data.widgets} onAction={onAction} compact={compact} /></div>;
}

function FormatCard({ icon: Icon, title, desc, rows, onClick }: { icon: typeof FileText; title: string; desc: string; rows: string; onClick: () => void }) {
  return <Card padding="normal"><div className="flex items-start justify-between gap-ds-2"><div><h3 className="font-bold text-ink-900">{title}</h3><p className="mt-ds-0.5 text-sm text-ink-500">{desc}</p><strong className="mt-ds-2 block text-xl font-extrabold text-primary-600 tabular">{rows}</strong></div><span className="rounded-lg bg-primary-50 p-2 text-primary-600"><Icon size={18} /></span></div><Button variant="secondary" onClick={onClick} className="mt-ds-2 w-full">받기</Button></Card>;
}

export function ItemsPage({ data, onAction }: PageProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('전체');
  const rows = data.crops.filter((crop) => filter === '전체' || crop.direction === filter).filter((crop) => crop.name.includes(query) || crop.market.includes(query) || crop.region.includes(query) || query === '');
  const selected = rows[0] ?? data.crops[0];
  return <Shell title="품목별 가격 정보" data={data} onAction={onAction}>
    <div className="grid gap-ds-2 lg:grid-cols-search-action"><SearchField value={query} onChange={setQuery} placeholder="품목·시장·지역 검색" /><FilterChips items={['전체', 'up', 'down', 'flat']} active={filter} onChange={setFilter} /></div>
    <StatsStrip stats={[{ label: '검색 결과', value: `${rows.length}개`, sub: '필터 기준' }, { label: '상승', value: `${rows.filter((crop) => crop.direction === 'up').length}개`, sub: '전일 대비' }, { label: '하락', value: `${rows.filter((crop) => crop.direction === 'down').length}개`, sub: '전일 대비' }, { label: '보합', value: `${rows.filter((crop) => crop.direction === 'flat').length}개`, sub: '변동 없음' }]} compact />
    <div className="grid grid-cols-1 gap-ds-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{rows.slice(0, 8).map((crop) => <ItemCard key={crop.id} crop={crop} selected={crop.id === selected.id} onSelect={() => onAction(`${crop.name} 선택`)} />)}</div>
    <div className="grid gap-ds-2 xl:grid-cols-main-360">
      <DataTable caption="품목별 시세 상세 표" columns={[{ key: 'rank', label: '순위' }, { key: 'name', label: '품목' }, { key: 'market', label: '시장' }, { key: 'price', label: '가격', align: 'right' }, { key: 'change', label: '변동' }, { key: 'trend', label: '흐름' }]} rows={rows.slice(0, 12).map((crop, index) => ({ id: crop.id, cells: { rank: <RankBadge value={index + 1} />, name: <b>{crop.name}</b>, market: `${crop.market} · ${crop.region}`, price: <span className="font-bold tabular">{crop.price.toLocaleString()}원</span>, change: <PriceBadge direction={crop.direction} text={`${crop.change > 0 ? '+' : ''}${crop.change.toLocaleString()}원`} />, trend: <MiniTrend values={crop.series} direction={crop.direction} /> } }))} />
      <Card padding="normal"><SectionHeader title="7일 가격 흐름" action="통계" onAction={() => onAction('통계 보기')} /><MiniTrend values={selected.series} direction={selected.direction} /><div className="mt-ds-3 grid gap-ds-1">{rows.slice(0, 4).map((crop) => <div key={crop.id} className="flex items-center justify-between rounded-md bg-ink-50 px-ds-2 py-ds-1"><span className="text-sm font-semibold text-ink-900">{crop.name}</span><PriceBadge direction={crop.direction} text={`${crop.changePct > 0 ? '+' : ''}${crop.changePct}%`} /></div>)}</div></Card>
    </div>
  </Shell>;
}

export function MarketsPage({ data, onAction }: PageProps) { return <Shell title="시장별 가격 정보" data={data} onAction={onAction}><div className="grid gap-ds-2 xl:grid-cols-main-420"><DataTable caption="시장별 가격 비교" columns={[{ key: 'market', label: '시장' }, { key: 'items', label: '대표 품목' }, { key: 'avg', label: '평균가', align: 'right' }, { key: 'state', label: '상태' }]} rows={data.crops.slice(0, 10).map((crop) => ({ id: crop.market + crop.id, cells: { market: <b>{crop.market}</b>, items: crop.name, avg: <span className="tabular">{crop.price.toLocaleString()}원</span>, state: <PriceBadge direction={crop.direction} text={`${crop.changePct > 0 ? '+' : ''}${crop.changePct}%`} /> } }))} /><Card padding="normal"><SectionHeader title="시장 요약" action="새로 보기" onAction={() => onAction('시장 요약 갱신')} /><HorizontalBarChart data={data.reportBars} /></Card></div><StatsStrip stats={data.metrics} compact /></Shell>; }

export function TrendPage({ data, onAction }: PageProps) { return <Shell title="가격 동향 분석" data={data} onAction={onAction}><div className="grid gap-ds-2 xl:grid-cols-main-420"><Card padding="normal"><SectionHeader title="변동률 상위 품목" /><HorizontalBarChart data={data.reportBars} /></Card><Card padding="normal" className="overflow-hidden"><SectionHeader title="체크포인트" /><div className="rounded-lg bg-ink-900 p-ds-3 text-white"><p className="text-sm text-white/70">큰 변동 품목을 먼저 보고 지역 차이를 이어서 확인합니다.</p><div className="mt-ds-2 grid gap-ds-1">{data.crops.slice(0, 4).map((crop) => <div key={crop.id} className="flex items-center justify-between rounded-md bg-white/10 px-ds-2 py-ds-1"><span>{crop.name}</span><PriceBadge direction={crop.direction} text={`${crop.changePct > 0 ? '+' : ''}${crop.changePct}%`} /></div>)}</div></div></Card></div></Shell>; }

export function RegionsPage({ data, onAction }: PageProps) {
  const quickRegions = data.regions.slice(0, 5);
  const maxCabbage = quickRegions.length ? Math.max(...quickRegions.map((region) => region.cabbage)) : 0;
  const widthClass = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12'];
  return <Shell title="지역별 비교" data={data} onAction={onAction}>
    <div className="grid grid-cols-1 gap-ds-2 xl:grid-cols-main-380">
      <DataTable caption="지역별 대표 가격 매트릭스" columns={[{ key: 'name', label: '지역' }, { key: 'cabbage', label: '배추', align: 'right' }, { key: 'radish', label: '무', align: 'right' }, { key: 'onion', label: '양파', align: 'right' }, { key: 'potato', label: '감자', align: 'right' }]} rows={data.regions.slice(0, 12).map((region) => ({ id: region.name, cells: { name: <b>{region.name}</b>, cabbage: <span className="tabular">{region.cabbage.toLocaleString()}</span>, radish: <span className="tabular">{region.radish.toLocaleString()}</span>, onion: <span className="tabular">{region.onion.toLocaleString()}</span>, potato: <span className="tabular">{region.potato.toLocaleString()}</span> } }))} />
      <Card padding="normal">
        <SectionHeader title="빠른 지역" action="상위 5개" onAction={() => onAction('지역 상위')} />
        <div className="flex flex-wrap gap-ds-1">{ADMIN_REGION_NAMES.slice(0, 8).map((region) => <button type="button" key={region} onClick={() => onAction(`${region} 선택`)} className="rounded-full border border-ink-200 px-ds-2 py-ds-0.5 text-sm hover:border-primary-500 hover:text-primary-600">{region}</button>)}</div>
        <div className="mt-ds-3 space-y-3">
          {quickRegions.map((region, index) => <div key={region.name} className="rounded-md bg-ink-50 px-ds-2 py-ds-2">
            <div className="flex items-center justify-between"><b className="text-sm text-ink-900">{index + 1}. {region.name}</b><span className="text-xs text-ink-500">배추 기준</span></div>
            <div className="mt-ds-1 h-2.5 overflow-hidden rounded-full bg-white"><div className={`${widthClass[index] ?? 'w-7/12'} h-full rounded-full bg-primary-600`} /></div>
            <div className="mt-ds-1 grid grid-cols-2 gap-ds-1 text-caption"><span className="text-ink-500">배추 <b className="text-ink-900 tabular">{region.cabbage.toLocaleString()}</b></span><span className="text-ink-500">무 <b className="text-ink-900 tabular">{region.radish.toLocaleString()}</b></span></div>
          </div>)}
          <div className="rounded-md border border-primary-100 bg-primary-50 px-ds-2 py-ds-2 text-caption text-primary-700">최고 기준 {maxCabbage.toLocaleString()}원 대비 지역별 차이를 비교합니다.</div>
        </div>
      </Card>
    </div>
  </Shell>;
}

export function StatsPage({ data, onAction }: PageProps) { return <Shell title="통계 정보" data={data} onAction={onAction}><StatsStrip stats={data.metrics} compact /><div className="grid gap-ds-2 xl:grid-cols-2"><Card padding="normal"><SectionHeader title="상승·하락 분포" /><HorizontalBarChart data={data.reportBars} /></Card><DataTable caption="통계 상세" columns={[{ key: 'name', label: '품목' }, { key: 'min', label: '최저', align: 'right' }, { key: 'max', label: '최고', align: 'right' }, { key: 'avg', label: '평균', align: 'right' }]} rows={data.crops.slice(0, 12).map((crop) => ({ id: crop.id, cells: { name: crop.name, min: <span className="tabular">{Math.min(...crop.series).toLocaleString()}</span>, max: <span className="tabular">{Math.max(...crop.series).toLocaleString()}</span>, avg: <span className="tabular">{Math.round(crop.series.reduce((a, b) => a + b, 0) / crop.series.length).toLocaleString()}</span> } }))} /></div></Shell>; }


export function MarketNewsPage({ data, onAction }: PageProps) {
  const [keyword, setKeyword] = useState('전체');
  const keywords = ['전체', ...Array.from(new Set(data.marketNews.map((item) => item.keyword))).slice(0, 6)];
  const rows = data.marketNews.filter((item) => keyword === '전체' || item.keyword === keyword).slice(0, 10);
  const hasRows = rows.length > 0;
  return <Shell title="시장 동향" data={data} onAction={onAction} compact>
    <div className="flex flex-wrap gap-ds-1">{keywords.map((item) => <button type="button" key={item} onClick={() => setKeyword(item)} aria-pressed={keyword === item} className={`rounded-full border px-ds-2 py-ds-0.5 text-sm ${keyword === item ? 'border-primary-600 bg-primary-600 text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-primary-500'}`}>{item}</button>)}</div>
    {hasRows ? <div className="grid gap-ds-2 xl:grid-cols-main-340">
      <div className="space-y-3">{rows.slice(0, 7).map((item) => {
        const href = item.link || item.originallink;
        return <article key={item.id} className="rounded-md border border-ink-200 bg-white p-ds-2 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-ds-1 text-caption text-ink-500"><span className="rounded-full bg-primary-50 px-2 py-1 font-semibold text-primary-600">{item.keyword}</span><span>{item.source} · {item.publishedAt}</span></div>
          <h3 className="mt-ds-2 text-base font-bold text-ink-900">{item.title}</h3>
          <p className="mt-ds-1 line-clamp-2 text-sm text-ink-500">{item.summary}</p>
          {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="mt-ds-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline"><ExternalLink size={15} />원문 보기</a> : null}
        </article>;
      })}</div>
      <Card padding="normal"><SectionHeader title="키워드 흐름" action="가격 리포트" onAction={() => onAction('가격 리포트')} /><div className="space-y-2">{keywords.filter((item) => item !== '전체').slice(0, 5).map((item) => <div key={item} className="flex items-center justify-between rounded-md bg-ink-50 px-ds-2 py-ds-1"><span className="text-sm font-semibold text-ink-900">{item}</span><span className="text-caption text-ink-500">{data.marketNews.filter((news) => news.keyword === item).length}건</span></div>)}</div></Card>
    </div> : <EmptyState title="표시할 시장 동향이 없습니다" description="가격표와 지역 비교를 먼저 확인하세요." icon={Newspaper} />}
  </Shell>;
}

export function AlertsPage({ data, onAction }: PageProps) { const [active, setActive] = useState<string[]>(['cabbage', 'potato', 'apple']); return <Shell title="알림 서비스" data={data} onAction={onAction}><div className="grid grid-cols-1 gap-ds-2 lg:grid-cols-3 2xl:grid-cols-4">{data.crops.slice(0, 10).map((crop) => <AlertCard key={crop.id} crop={crop} active={active.includes(crop.id)} onToggle={() => setActive((list) => list.includes(crop.id) ? list.filter((id) => id !== crop.id) : [...list, crop.id])} />)}</div></Shell>; }

export function DownloadPage({ data, onAction }: PageProps) {
  const previewRows = data.crops.slice(0, 8);
  return <Shell title="데이터 받기" data={data} onAction={onAction}>
    <div className="grid gap-ds-2 md:grid-cols-2 xl:grid-cols-4">
      <FormatCard icon={FileText} title="CSV" desc="품목·지역 데이터" rows={`${previewRows.length * 18}행`} onClick={() => onAction('CSV 받기')} />
      <FormatCard icon={FileSpreadsheet} title="XLSX" desc="시장 비교용 표" rows="128행" onClick={() => onAction('XLSX 받기')} />
      <FormatCard icon={Database} title="원천 데이터" desc="연동용 구조" rows="10품목" onClick={() => onAction('원천 데이터 받기')} />
      <FormatCard icon={RefreshCw} title="리포트" desc="변동률 요약" rows="12쪽" onClick={() => onAction('리포트 받기')} />
    </div>
    <div className="grid gap-ds-2 xl:grid-cols-main-360">
      <DataTable caption="데이터 미리보기" columns={[{ key: 'name', label: '품목' }, { key: 'market', label: '시장' }, { key: 'region', label: '지역' }, { key: 'price', label: '가격', align: 'right' }, { key: 'change', label: '변동' }]} rows={previewRows.map((crop) => ({ id: `preview-${crop.id}`, cells: { name: <b>{crop.name}</b>, market: crop.market, region: crop.region, price: <span className="tabular">{crop.price.toLocaleString()}원</span>, change: <PriceBadge direction={crop.direction} text={`${crop.change > 0 ? '+' : ''}${crop.change.toLocaleString()}원`} /> } }))} />
      <div className="grid gap-ds-2"><DownloadStep number={1} label="품목 선택" desc="필요한 품목과 지역을 먼저 고릅니다." onClick={() => onAction('품목 선택')} /><DownloadStep number={2} label="기간 확인" desc="최근 흐름 기준으로 범위를 정합니다." onClick={() => onAction('기간 선택')} /><DownloadStep number={3} label="파일 저장" desc="표 형태 데이터를 내려받아 비교합니다." onClick={() => onAction('파일 저장')} /></div>
    </div>
  </Shell>;
}

export function FavoritesPage({ data, onAction }: PageProps) { return <Shell title="즐겨찾는 품목" data={data} onAction={onAction}><div className="grid gap-ds-2 lg:grid-cols-2 xl:grid-cols-3">{data.crops.slice(0, 6).map((crop) => <FavoriteItem key={crop.id} crop={crop} onToggle={() => onAction(`${crop.name} 관심 해제`)} />)}</div></Shell>; }

export function GuidePage({ data, onAction }: PageProps) { return <Shell title="이용 안내" data={data} onAction={onAction} compact>
  <div className="grid gap-ds-2 xl:grid-cols-main-360">
    <DataTable caption="데이터 기준 표" columns={[{ key: 'name', label: '구분' }, { key: 'value', label: '기준' }, { key: 'note', label: '확인' }]} rows={[{ id: 'source', cells: { name: '가격', value: '도매 평균', note: '품목별' } }, { id: 'region', cells: { name: '지역', value: `${data.regions.length}개`, note: '시도' } }, { id: 'crop', cells: { name: '품목', value: `${data.crops.length}개`, note: '대표값' } }, { id: 'series', cells: { name: '추이', value: '최근 7일', note: '품목별' } }, { id: 'change', cells: { name: '변동', value: '전일 대비', note: '상승·하락' } }, { id: 'unit', cells: { name: '단위', value: '원/규격', note: '카드 표시' } }]} />
    <div className="space-y-ds-2"><Card padding="normal"><h3 className="font-bold">갱신 기준</h3><p className="mt-ds-1 text-sm text-ink-500">가격, 지역, 변동률을 순서대로 확인합니다.</p></Card><Card padding="normal"><h3 className="font-bold">색상 기준</h3><p className="mt-ds-1 text-sm text-ink-500">상승은 빨강, 하락은 파랑입니다.</p></Card><Card padding="normal"><h3 className="font-bold">빠른 이동</h3><Button variant="secondary" onClick={() => onAction('품목별 시세')} className="mt-ds-2 w-full">품목 보기</Button></Card></div>
  </div>
</Shell>; }
