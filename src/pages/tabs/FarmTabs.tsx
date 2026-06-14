import { useState, type ReactNode } from 'react';
import { Database, ExternalLink, FileSpreadsheet, FileText, MapPin, Newspaper, RefreshCw, Star } from 'lucide-react';
import { HorizontalBarChart } from '../../components/charts/HorizontalBarChart';
import { DownloadStep, FavoriteItem, ItemCard } from '../../components/feature/farm';
import { AxisLineChart, Button, Card, DataTable, EmptyState, FilterChips, MiniTrend, PriceBadge, RankBadge, SearchField, SectionHeader, StatsStrip } from '../../components/common/ui';
import { ADMIN_REGION_NAMES, REGION_CROP_OPTIONS, type RegionCropKey } from '../../data/model';
import type { FarmData } from '../../data/normalize';

interface PageProps { data: FarmData; onTabChange: (tab: string) => void; onAction: (text: string) => void; favoriteCropIds?: string[]; onFavoriteToggle?: (id: string) => void; selectedRegion?: string; onRegionChange?: (region: string) => void; selectedCropKey?: RegionCropKey; onCropChange?: (key: RegionCropKey) => void; onUseLocation?: () => void; locating?: boolean; }

function Shell({ title, children }: { title: string; children: ReactNode; data: FarmData; onAction: (text: string) => void; compact?: boolean }) {
  return <div className="mx-auto max-w-content space-y-ds-3"><SectionHeader title={title} />{children}</div>;
}
function regionPriceValue(region: FarmData['regions'][number], key: RegionCropKey): number { return Number(region[key] ?? 0); }
function orderedRegions(regions: FarmData['regions'], selectedRegion = '전국'): FarmData['regions'] { if (selectedRegion === '전국') return regions; const selected = regions.find((region) => region.name === selectedRegion); return selected ? [selected, ...regions.filter((region) => region.name !== selectedRegion)] : regions; }
function cropKeyByName(name: string): RegionCropKey | null { return REGION_CROP_OPTIONS.find((item) => item.label === name)?.key ?? null; }
function FormatCard({ icon: Icon, title, rows, onClick }: { icon: typeof FileText; title: string; rows: string; onClick: () => void }) { return <Card padding="normal"><div className="flex items-start justify-between gap-ds-2"><div><h3 className="font-bold text-ink-900">{title}</h3><strong className="mt-ds-2 block text-xl font-bold text-primary-600 tabular">{rows}</strong></div><span className="rounded-lg bg-primary-50 p-2 text-primary-600"><Icon size={18} /></span></div><Button variant="secondary" onClick={onClick} className="mt-ds-2 w-full">다운로드</Button></Card>; }
function MarketPill({ label, value, tone }: { label: string; value: string; tone: 'up' | 'down' | 'flat' }) { const cls = tone === 'up' ? 'bg-up-bg text-up' : tone === 'down' ? 'bg-down-bg text-down' : 'bg-ink-100 text-ink-600'; return <span className={`inline-flex items-center justify-between rounded-md px-ds-2 py-ds-1 text-sm font-bold ${cls}`}><span>{label}</span><span className="ml-ds-2 tabular">{value}</span></span>; }
function PriceText({ value, unit = '원', className = '' }: { value: number; unit?: string; className?: string }) { return <span className={`inline-flex items-baseline tabular ${className}`}><span>{value.toLocaleString()}</span><span className="v6-unit">{unit}</span></span>; }
function TwoMetricGrid({ children }: { children: ReactNode }) { return <div className="grid gap-ds-2 md:grid-cols-2">{children}</div>; }

export function ItemsPage({ data, onAction, favoriteCropIds = [], onFavoriteToggle, selectedCropKey = 'cabbage', onCropChange }: PageProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('전체');
  const directionFilter = filter === '상승' ? 'up' : filter === '하락' ? 'down' : filter === '보합' ? 'flat' : '전체';
  const selectedLabel = REGION_CROP_OPTIONS.find((item) => item.key === selectedCropKey)?.label ?? '배추';
  const rows = data.crops.filter((crop) => directionFilter === '전체' || crop.direction === directionFilter).filter((crop) => crop.name.includes(query) || crop.market.includes(query) || crop.region.includes(query) || query === '');
  const upTop = rows.filter((crop) => crop.direction === 'up').sort((a, b) => b.changePct - a.changePct)[0];
  const downTop = rows.filter((crop) => crop.direction === 'down').sort((a, b) => a.changePct - b.changePct)[0];
  const comparisonStats = [
    upTop ? { label: '상승 TOP', value: `${upTop.name} +${upTop.changePct}%`, sub: upTop.market } : null,
    downTop ? { label: '하락 TOP', value: `${downTop.name} ${downTop.changePct}%`, sub: downTop.market } : null,
  ].filter(Boolean) as { label: string; value: string; sub: string }[];
  const selected = data.crops.find((crop) => crop.name === selectedLabel) ?? rows[0] ?? data.crops[0];
  const handleCropSelect = (cropName: string) => { const key = cropKeyByName(cropName); if (key) onCropChange?.(key); onAction(`${cropName} 선택`); };
  return <Shell title="품목비교" data={data} onAction={onAction}>
    <Card padding="normal" interactive={false}><SectionHeader title="품목 선택" /><FilterChips items={REGION_CROP_OPTIONS.map((item) => item.label)} active={selectedLabel} onChange={(label) => handleCropSelect(label)} ariaLabel="품목 선택" /></Card>
    <div className="grid gap-ds-2 lg:grid-cols-search-action v6-block v6-delay-1"><SearchField value={query} onChange={setQuery} placeholder="품목·지역·시장 검색" /><FilterChips items={['전체', '상승', '하락', '보합']} active={filter} onChange={setFilter} /></div>
    {comparisonStats.length ? <StatsStrip stats={comparisonStats} compact columns={2} /> : null}
    <div className="grid grid-cols-1 gap-ds-2 md:grid-cols-2 xl:grid-cols-3">{rows.slice(0, 12).map((crop) => <ItemCard key={crop.id} crop={crop} selected={crop.name === selected.name} favorite={favoriteCropIds.includes(crop.id)} onSelect={() => handleCropSelect(crop.name)} onFavoriteToggle={onFavoriteToggle ? () => onFavoriteToggle(crop.id) : undefined} />)}</div>
    <div className="grid gap-ds-2 xl:grid-cols-main-360">
      <DataTable caption="품목별 시세 상세 표" columns={[{ key: 'rank', label: '순위' }, { key: 'name', label: '품목' }, { key: 'market', label: '기준' }, { key: 'price', label: '가격', align: 'right' }, { key: 'change', label: '변동' }, { key: 'trend', label: '흐름' }]} rows={rows.slice(0, 12).map((crop, index) => ({ id: crop.id, cells: { rank: <RankBadge value={index + 1} />, name: <b>{crop.name}</b>, market: `${crop.market} · ${crop.region}`, price: <PriceText value={crop.price} className="font-bold" />, change: <PriceBadge direction={crop.direction} text={`${crop.change > 0 ? '+' : ''}${crop.change.toLocaleString()}원`} />, trend: <MiniTrend values={crop.series} direction={crop.direction} /> } }))} />
      <Card padding="normal"><SectionHeader title={`${selected.name} 가격 흐름`} action="지역·도매" onAction={() => onAction('지역·도매')} /><AxisLineChart values={selected.series} direction={selected.direction} unit="원" height={180} /><div className="mt-ds-3 grid gap-ds-1">{rows.slice(0, 4).map((crop) => <button type="button" key={crop.id} onClick={() => handleCropSelect(crop.name)} className="flex items-center justify-between rounded-md bg-ink-50 px-ds-2 py-ds-1 text-left hover:bg-primary-50"><span className="text-sm font-bold text-ink-900">{crop.name}</span><PriceBadge direction={crop.direction} text={`${crop.changePct > 0 ? '+' : ''}${crop.changePct}%`} /></button>)}</div></Card>
    </div>
  </Shell>;
}

export function MarketsPage({ data, onAction }: PageProps) {
  const marketRows = [
    { market: '가락시장', region: '서울', crop: '배추', value: data.regions.find((row) => row.name === '서울')?.cabbage ?? 0 },
    { market: '구리시장', region: '경기', crop: '무', value: data.regions.find((row) => row.name === '경기')?.radish ?? 0 },
    { market: '대전오정', region: '대전', crop: '양파', value: data.regions.find((row) => row.name === '대전')?.onion ?? 0 },
    { market: '부산엄궁', region: '부산', crop: '감자', value: data.regions.find((row) => row.name === '부산')?.potato ?? 0 },
    { market: '강서시장', region: '서울', crop: '대파', value: data.regions.find((row) => row.name === '서울')?.greenonion ?? 0 },
  ].filter((row) => row.value > 0);
  return <Shell title="지역·도매" data={data} onAction={onAction}>
    <div className="grid gap-ds-2 xl:grid-cols-main-420">
      <DataTable caption="도매시장 참고 표" columns={[{ key: 'market', label: '도매시장' }, { key: 'region', label: '지역' }, { key: 'crop', label: '대표 품목' }, { key: 'avg', label: '참고가', align: 'right' }]} rows={marketRows.map((row) => ({ id: row.market, cells: { market: <b>{row.market}</b>, region: row.region, crop: row.crop, avg: <PriceText value={row.value} /> } }))} />
      <Card padding="normal"><SectionHeader title="시장별 가격 축" /><HorizontalBarChart data={marketRows.map((row) => ({ name: row.market, value: row.value, tone: 'primary' }))} unit="원" /></Card>
    </div>
    <StatsStrip stats={data.metrics} compact />
  </Shell>;
}

export function TrendPage({ data, onTabChange, onAction, favoriteCropIds = [], onFavoriteToggle }: PageProps) {
  const movers = [...data.crops].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  const favorites = data.crops.filter((crop) => favoriteCropIds.includes(crop.id));
  const boardItems = (favorites.length ? favorites : movers).slice(0, 6);
  const upTop = boardItems.filter((crop) => crop.direction === 'up').sort((a, b) => b.changePct - a.changePct)[0];
  const downTop = [...data.crops].filter((crop) => crop.direction === 'down').sort((a, b) => a.changePct - b.changePct)[0];
  const alertRows = boardItems.slice(0, 4);
  const toggleOrSelect = (cropId: string, cropName: string) => {
    if (onFavoriteToggle) onFavoriteToggle(cropId);
    else onAction(`${cropName} 관심`);
  };
  return <Shell title="관심품목" data={data} onAction={onAction}>
    <TwoMetricGrid>
      {upTop ? <Card padding="normal" className="v6-card-hover"><p className="text-caption text-ink-500">상승 관심</p><strong className="mt-ds-1 block text-2xl font-bold text-up tabular">{upTop.name} +{upTop.changePct}%</strong><span className="mt-ds-0.5 block text-caption text-ink-500">{upTop.market}</span></Card> : null}
      {downTop ? <Card padding="normal" className="v6-card-hover"><p className="text-caption text-ink-500">하락 관심</p><strong className="mt-ds-1 block text-2xl font-bold text-down tabular">{downTop.name} {downTop.changePct}%</strong><span className="mt-ds-0.5 block text-caption text-ink-500">{downTop.market}</span></Card> : null}
    </TwoMetricGrid>
    <div className="grid gap-ds-3 xl:grid-cols-main-360">
      <Card padding="normal">
        <SectionHeader title={favorites.length ? '관심 시세 보드' : '관심 추천 시세'} action="품목비교" onAction={() => onTabChange('items')} />
        <div className="grid gap-ds-2 md:grid-cols-2">{boardItems.map((crop) => {
          const favorite = favoriteCropIds.includes(crop.id);
          return <article key={`watch-${crop.id}`} className="v6-card-hover rounded-lg border border-ink-200 bg-white p-ds-2.5 shadow-card">
            <div className="flex items-start justify-between gap-ds-2"><div className="min-w-0"><span className="text-[28px] leading-none">{crop.icon}</span><h3 className="mt-ds-1 truncate text-body-1 font-bold text-ink-900">{crop.name}</h3><p className="mt-ds-0.5 truncate text-caption text-ink-500">{crop.market} · {crop.region}</p></div><button type="button" aria-pressed={favorite} onClick={() => toggleOrSelect(crop.id, crop.name)} className={`v6-fav-button rounded-full p-ds-0.5 ${favorite ? 'bg-primary-100 text-primary-600' : 'bg-ink-100 text-ink-400 hover:text-primary-600'}`}><Star size={16} fill={favorite ? 'currentColor' : 'none'} /></button></div>
            <div className="mt-ds-2 grid grid-cols-trend-120 items-center gap-ds-2"><div><strong className="inline-flex items-baseline text-[20px] font-bold leading-[1.1] text-ink-900 tabular"><PriceText value={crop.price} /></strong><div className="mt-ds-1"><PriceBadge direction={crop.direction} text={`${crop.changePct > 0 ? '+' : ''}${crop.changePct}%`} /></div></div><MiniTrend values={crop.series} direction={crop.direction} /></div>
          </article>;
        })}</div>
      </Card>
      <Card padding="normal">
        <SectionHeader title="가격 알림 기준" action="전국으로 보기" onAction={() => onAction('전국으로 보기')} />
        <div className="space-y-ds-1.5">{alertRows.map((crop) => <button type="button" key={`alert-${crop.id}`} onClick={() => onAction(`${crop.name} 알림 기준`)} className="v6-list-row flex w-full items-center justify-between rounded-md bg-ink-50 px-ds-2 py-ds-1.5 text-left hover:bg-primary-50"><span className="min-w-0"><b className="block truncate text-sm text-ink-900">{crop.name}</b><span className="block truncate text-caption text-ink-500">{crop.spec} · {crop.region}</span></span><span className="text-right"><strong className="block text-sm font-bold text-ink-900 tabular"><PriceText value={crop.price} /></strong><PriceBadge direction={crop.direction} text={`${crop.change > 0 ? '+' : ''}${crop.change.toLocaleString()}원`} /></span></button>)}</div>
      </Card>
    </div>
  </Shell>;
}

export function RegionsPage({ data, onAction, selectedRegion = '전국', onRegionChange, selectedCropKey = 'cabbage', onCropChange, onUseLocation, locating = false }: PageProps) {
  const selectedLabel = REGION_CROP_OPTIONS.find((item) => item.key === selectedCropKey)?.label ?? '배추';
  const rows = orderedRegions(data.regions, selectedRegion);
  const values = rows.map((row) => regionPriceValue(row, selectedCropKey)).filter((value) => value > 0);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const selectedRegionRow = selectedRegion === '전국' ? null : data.regions.find((row) => row.name === selectedRegion);
  const handleCropSelect = (label: string) => onCropChange?.(REGION_CROP_OPTIONS.find((item) => item.label === label)?.key ?? 'cabbage');
  return <Shell title="지역·도매" data={data} onAction={onAction}>
    <Card padding="normal" interactive={false}><SectionHeader title="비교 기준" /><div className="space-y-ds-2"><FilterChips items={REGION_CROP_OPTIONS.map((item) => item.label)} active={selectedLabel} onChange={handleCropSelect} ariaLabel="지역 비교 품목 선택" /><div className="grid gap-ds-2 lg:grid-cols-[minmax(0,1fr)_auto]"><label className="block text-caption font-bold text-ink-500">지역 선택<select aria-label="지역 선택" value={selectedRegion} onChange={(event) => onRegionChange?.(event.target.value)} className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"><option value="전국">전국</option>{ADMIN_REGION_NAMES.map((region) => <option key={region} value={region}>{region}</option>)}</select></label><Button variant="secondary" onClick={onUseLocation} loading={locating} className="self-end"><MapPin size={16} />내 위치 기준</Button></div></div></Card>
    <div className="grid grid-cols-1 gap-ds-2 xl:grid-cols-main-420">
      <DataTable caption="지역별 대표 가격 매트릭스" columns={[{ key: 'name', label: '지역' }, { key: 'selected', label: `${selectedLabel} 가격`, align: 'right' }, { key: 'radish', label: '무', align: 'right' }, { key: 'onion', label: '양파', align: 'right' }, { key: 'potato', label: '감자', align: 'right' }, { key: 'greenonion', label: '대파', align: 'right' }]} rows={rows.map((region) => ({ id: region.name, cells: { name: <b className={region.name === selectedRegion ? 'text-primary-600' : ''}>{region.name}</b>, selected: <span className="font-bold tabular">{regionPriceValue(region, selectedCropKey).toLocaleString()}원</span>, radish: <span className="tabular">{region.radish.toLocaleString()}원</span>, onion: <span className="tabular">{region.onion.toLocaleString()}원</span>, potato: <span className="tabular">{region.potato.toLocaleString()}원</span>, greenonion: <span className="tabular">{region.greenonion.toLocaleString()}원</span> } }))} />
      <Card padding="normal"><SectionHeader title={`${selectedLabel} 지역 가격 축`} /><HorizontalBarChart data={rows.map((region) => ({ name: region.name, value: regionPriceValue(region, selectedCropKey), tone: 'primary' }))} height={420} limit={17} unit="원" axisLabel="지역 평균가" /></Card>
    </div>
    <TwoMetricGrid><Card padding="normal"><p className="text-caption text-ink-500">선택 품목</p><strong className="mt-ds-1 block text-2xl font-bold text-primary-600 tabular">{selectedLabel}</strong></Card><Card padding="normal"><p className="text-caption text-ink-500">지역 차이</p><strong className="mt-ds-1 block text-2xl font-bold text-primary-600 tabular"><PriceText value={Math.max(0, max - min)} /></strong></Card></TwoMetricGrid>
  </Shell>;
}

export function StatsPage({ data, onAction }: PageProps) { return <Shell title="전국 통계" data={data} onAction={onAction}><StatsStrip stats={data.metrics} compact /><div className="grid gap-ds-2 xl:grid-cols-2"><Card padding="normal"><SectionHeader title="상승·하락 분포" /><HorizontalBarChart data={data.reportBars} /></Card><DataTable caption="통계 상세" columns={[{ key: 'name', label: '품목' }, { key: 'min', label: '최저', align: 'right' }, { key: 'max', label: '최고', align: 'right' }, { key: 'avg', label: '평균', align: 'right' }]} rows={data.crops.slice(0, 12).map((crop) => ({ id: crop.id, cells: { name: crop.name, min: <span className="tabular">{Math.min(...crop.series).toLocaleString()}</span>, max: <span className="tabular">{Math.max(...crop.series).toLocaleString()}</span>, avg: <span className="tabular">{Math.round(crop.series.reduce((a, b) => a + b, 0) / crop.series.length).toLocaleString()}</span> } }))} /></div></Shell>; }

export function MarketNewsPage({ data, onAction }: PageProps) {
  const [keyword, setKeyword] = useState('전체');
  const keywords = ['전체', ...Array.from(new Set(data.marketNews.map((item) => item.keyword))).slice(0, 6)];
  const rows = data.marketNews.filter((item) => keyword === '전체' || item.keyword === keyword).slice(0, 10);
  return <Shell title="수급뉴스" data={data} onAction={onAction} compact>
    <div className="flex flex-wrap gap-ds-1">{keywords.map((item) => <button type="button" key={item} onClick={() => setKeyword(item)} aria-pressed={keyword === item} className={`rounded-full border px-ds-2 py-ds-0.5 text-sm ${keyword === item ? 'border-primary-600 bg-primary-600 text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-primary-500'}`}>{item}</button>)}</div>
    {rows.length ? <div className="grid gap-ds-2 xl:grid-cols-main-340"><div className="space-y-3">{rows.slice(0, 7).map((item) => { const href = item.link || item.originallink; return <article key={item.id} className="v6-card-hover rounded-md border border-ink-200 bg-white p-ds-2 shadow-card"><div className="flex flex-wrap items-center justify-between gap-ds-1 text-caption text-ink-500"><span className="rounded-full bg-primary-50 px-2 py-1 font-bold text-primary-600">{item.keyword}</span><span>{item.source} · {item.publishedAt}</span></div><h3 className="mt-ds-2 text-base font-bold text-ink-900">{item.title}</h3>{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="mt-ds-2 inline-flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:underline"><ExternalLink size={15} />원문 열기</a> : null}</article>; })}</div><Card padding="normal"><SectionHeader title="키워드" action="관심품목" onAction={() => onAction('관심품목')} /><div className="space-y-2">{keywords.filter((item) => item !== '전체').slice(0, 5).map((item) => <div key={item} className="flex items-center justify-between rounded-md bg-ink-50 px-ds-2 py-ds-1"><span className="text-sm font-bold text-ink-900">{item}</span><span className="text-caption text-ink-500">{data.marketNews.filter((news) => news.keyword === item).length}건</span></div>)}</div></Card></div> : <EmptyState title="시장 동향 항목 확인 필요" icon={Newspaper} />}
  </Shell>;
}

export function AlertsPage({ data, onTabChange, onAction }: PageProps) { return <Shell title="알림" data={data} onAction={onAction}><EmptyState title="설정 알림 없음" actionLabel="관심품목" onAction={() => onTabChange('trend')} icon={Star} /></Shell>; }
export function DownloadPage({ data, onAction }: PageProps) { const previewRows = data.crops.slice(0, 8); return <Shell title="데이터 다운로드" data={data} onAction={onAction}><div className="grid gap-ds-2 md:grid-cols-2 xl:grid-cols-3"><FormatCard icon={FileText} title="CSV" rows={`${previewRows.length}행`} onClick={() => onAction('CSV 다운로드')} /><FormatCard icon={FileSpreadsheet} title="XLSX" rows={`${data.regions.length}행`} onClick={() => onAction('XLSX 다운로드')} /><FormatCard icon={Database} title="원천 데이터" rows={`${data.crops.length}품목`} onClick={() => onAction('원천 데이터 다운로드')} /><FormatCard icon={RefreshCw} title="리포트" rows={`${data.reportBars.length}개`} onClick={() => onAction('리포트 다운로드')} /></div><div className="grid gap-ds-2 xl:grid-cols-main-360"><DataTable caption="데이터 미리보기" columns={[{ key: 'name', label: '품목' }, { key: 'market', label: '시장' }, { key: 'region', label: '지역' }, { key: 'price', label: '가격', align: 'right' }, { key: 'change', label: '변동' }]} rows={previewRows.map((crop) => ({ id: `preview-${crop.id}`, cells: { name: <b>{crop.name}</b>, market: crop.market, region: crop.region, price: <span className="tabular">{crop.price.toLocaleString()}원</span>, change: <PriceBadge direction={crop.direction} text={`${crop.change > 0 ? '+' : ''}${crop.change.toLocaleString()}원`} /> } }))} /><div className="grid gap-ds-2"><DownloadStep number={1} label="품목 선택" onClick={() => onAction('품목 선택')} /><DownloadStep number={2} label="기간 확인" onClick={() => onAction('기간 선택')} /><DownloadStep number={3} label="파일 저장" onClick={() => onAction('파일 저장')} /></div></div></Shell>; }
export function FavoritesPage(props: PageProps) { return <TrendPage {...props} />; }
export function GuidePage({ data, onAction }: PageProps) { return <Shell title="이용 안내" data={data} onAction={onAction} compact><DataTable caption="데이터 기준 표" columns={[{ key: 'name', label: '구분' }, { key: 'value', label: '기준' }, { key: 'note', label: '확인' }]} rows={[{ id: 'source', cells: { name: '가격', value: '도매 평균', note: '품목별' } }, { id: 'region', cells: { name: '지역', value: `${data.regions.length}개`, note: '시도' } }, { id: 'crop', cells: { name: '품목', value: `${data.crops.length}개`, note: '대표값' } }]} /><div className="grid gap-ds-2 md:grid-cols-3"><Button variant="secondary" onClick={() => onAction('품목비교')}>품목비교</Button><Button variant="secondary" onClick={() => onAction('지역·도매')}>지역·도매</Button><Button variant="secondary" onClick={() => onAction('수급뉴스')}>수급뉴스</Button></div></Shell>; }
