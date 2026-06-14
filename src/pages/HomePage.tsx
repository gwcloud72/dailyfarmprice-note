import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, BarChart3, Leaf, MapPin } from 'lucide-react';
import { AxisLineChart } from '../components/charts/AxisLineChart';
import { Button, Card, FilterChips, PriceBadge, SectionHeader } from '../components/common/ui';
import { ItemCard } from '../components/feature/farm';
import { ADMIN_REGION_NAMES, REGION_CROP_OPTIONS, type RegionCropKey } from '../data/model';
import type { FarmData } from '../data/normalize';

interface PageProps {
  data: FarmData;
  onTabChange: (tab: string) => void;
  onAction: (text: string) => void;
  favoriteCropIds?: string[];
  onFavoriteToggle?: (id: string) => void;
  selectedRegion?: string;
  onRegionChange?: (region: string) => void;
  selectedCropKey?: RegionCropKey;
  onCropChange?: (key: RegionCropKey) => void;
  onUseLocation?: () => void;
  locating?: boolean;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

function useCountUp(target: number, duration = 800) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const animated = useRef(false);
  useEffect(() => {
    if (reduced || animated.current) {
      setValue(target);
      return;
    }
    animated.current = true;
    let frame = 0;
    const started = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);
  return value;
}

function regionPriceValue(region: FarmData['regions'][number], key: RegionCropKey): number {
  return Number(region[key] ?? 0);
}

function orderedRegions(regions: FarmData['regions'], selectedRegion: string): FarmData['regions'] {
  if (selectedRegion === '전국') return regions;
  const selected = regions.find((region) => region.name === selectedRegion);
  return selected ? [selected, ...regions.filter((region) => region.name !== selectedRegion)] : regions;
}

function cropKeyByName(name: string): RegionCropKey | null {
  return REGION_CROP_OPTIONS.find((item) => item.label === name)?.key ?? null;
}

function MarketTile({ label, value, sub, tone = 'default' }: { label: string; value: ReactNode; sub: string; tone?: 'default' | 'green' | 'up' | 'down' }) {
  const cls = tone === 'green' ? 'border-primary-100 bg-primary-50 text-primary-700' : tone === 'up' ? 'border-up bg-up-bg text-up' : tone === 'down' ? 'border-down bg-down-bg text-down' : 'border-ink-200 bg-white text-ink-900';
  return <div className={`v6-card-hover rounded-lg border p-ds-3 shadow-card ${cls}`}><p className="text-[11px] text-current opacity-70">{label}</p><strong className="mt-ds-1 block text-[20px] leading-[1.1] text-current tabular">{value}</strong><span className="mt-ds-1 block truncate text-[13px] text-current opacity-70">{sub}</span></div>;
}

function Unit({ children = '원' }: { children?: string }) {
  return <span className="v6-unit">{children}</span>;
}

function PercentValue({ name, percent, positive }: { name: string; percent: number; positive?: boolean }) {
  return <span className="inline-flex items-baseline gap-[2px] tabular"><span>{name}</span><span>{positive ? '+' : ''}{percent}%</span></span>;
}

function priceUnit() {
  return <Unit />;
}

function barWidthClass(percent: number) {
  const rounded = Math.max(8, Math.min(100, Math.round(percent / 5) * 5));
  return `v6-bar-w-${rounded}`;
}

function RegionBarList({ rows, selectedCropKey, onSelect }: { rows: FarmData['regions']; selectedCropKey: RegionCropKey; onSelect: (region: string) => void }) {
  const values = rows.map((region) => regionPriceValue(region, selectedCropKey)).filter((value) => value > 0);
  const max = values.length ? Math.max(...values) : 1;
  return <div className="space-y-ds-2">
    {rows.slice(0, 9).map((region, index) => {
      const value = regionPriceValue(region, selectedCropKey);
      if (!value) return null;
      const percent = Math.max(8, (value / max) * 100);
      return <button type="button" key={region.name} onClick={() => onSelect(region.name)} className="v6-list-row w-full rounded-md px-ds-2 py-ds-1.5 text-left">
        <div className="grid grid-cols-[72px_minmax(0,1fr)_92px] items-center gap-ds-2">
          <span className="truncate text-[13px] text-ink-700">{region.name}</span>
          <span className="h-ds-1 overflow-hidden rounded-xs bg-ink-200"><span className={`v6-bar-fill ${barWidthClass(percent)} v6-bar-delay-${index}`} /></span>
          <strong className="inline-flex items-baseline justify-end text-right text-[13px] text-ink-900 tabular"><span>{value.toLocaleString()}</span><Unit /></strong>
        </div>
      </button>;
    })}
  </div>;
}

function MarketSkeleton() {
  return <div className="space-y-ds-2" aria-label="시세 로딩">
    {Array.from({ length: 4 }).map((_, index) => <div key={`market-skeleton-${index}`} className="rounded-lg border border-ink-200 bg-white p-ds-3"><div className="h-ds-2 w-2/5 rounded-md ds-skeleton" /><div className="mt-ds-2 h-ds-4 w-3/5 rounded-md ds-skeleton" /></div>)}
  </div>;
}

function MarketNotice({ type, onAction }: { type: 'empty' | 'error'; onAction?: () => void }) {
  const Icon = type === 'empty' ? Leaf : AlertCircle;
  const title = type === 'empty' ? '표시할 품목이 없어요' : '시세를 불러오지 못했어요';
  const action = type === 'empty' ? '전국으로 보기' : '다시 시도';
  return <div className="rounded-lg border border-ink-200 bg-white p-ds-3 shadow-card">
    <div className="flex items-center gap-ds-2"><Icon className="h-ds-5 w-ds-5 text-ink-300" strokeWidth={1.7} /><div className="min-w-0 flex-1"><h3 className="text-[15px] leading-[1.3] text-ink-900">{title}</h3><p className="mt-ds-0.5 text-[13px] leading-[1.5] text-ink-500">12분 전 저장 기준</p></div><Button variant="secondary" size="sm" onClick={onAction}>{action}</Button></div>
  </div>;
}

export function HomePage({ data, onTabChange, onAction, favoriteCropIds = [], onFavoriteToggle, selectedRegion = '전국', onRegionChange, selectedCropKey = 'cabbage', onCropChange, onUseLocation, locating = false }: PageProps) {
  const reducedMotion = usePrefersReducedMotion();
  const selectedCropOption = REGION_CROP_OPTIONS.find((item) => item.key === selectedCropKey) ?? REGION_CROP_OPTIONS[0];
  const selected = data.crops.find((crop) => crop.name === selectedCropOption.label) ?? data.crops[0];
  const regionRows = useMemo(() => orderedRegions(data.regions, selectedRegion), [data.regions, selectedRegion]);
  const selectedRegionRow = selectedRegion === '전국' ? null : data.regions.find((region) => region.name === selectedRegion);
  const regionPrices = data.regions.map((region) => regionPriceValue(region, selectedCropKey)).filter((value) => value > 0);
  const regionSpread = regionPrices.length ? Math.max(...regionPrices) - Math.min(...regionPrices) : 0;
  const selectedRegionPrice = selectedRegionRow ? regionPriceValue(selectedRegionRow, selectedCropKey) : selected?.price ?? 0;
  const displayPrice = useCountUp(selectedRegionPrice);
  const focusedItems = useMemo(() => {
    const picked = data.crops.filter((crop) => crop.name === selectedCropOption.label);
    const rest = data.crops.filter((crop) => crop.name !== selectedCropOption.label);
    return [...picked, ...rest].slice(0, 6);
  }, [data.crops, selectedCropOption.label]);
  const upItems = [...data.crops].filter((crop) => crop.direction === 'up').sort((a, b) => b.changePct - a.changePct).slice(0, 4);
  const downItems = [...data.crops].filter((crop) => crop.direction === 'down').sort((a, b) => a.changePct - b.changePct).slice(0, 4);
  const chartLabels = selected?.series.map((_, index) => `${index + 1}일`) ?? [];

  const handleCropSelect = (key: RegionCropKey) => {
    onCropChange?.(key);
    onAction(`${REGION_CROP_OPTIONS.find((item) => item.key === key)?.label ?? '품목'} · 12분 전 업데이트`);
  };

  if (!selected) {
    return <div className="mx-auto max-w-[1280px]"><MarketNotice type="empty" onAction={() => onRegionChange?.('전국')} /></div>;
  }

  return <div className={`v6-page mx-auto max-w-[1280px] space-y-ds-4 px-0 ${reducedMotion ? 'v6-reduce-motion' : ''}`}>
    <section className="v6-block v6-delay-0 rounded-lg border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-lime-50 p-ds-4 shadow-popover">
      <div className="grid gap-ds-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-center">
        <div>
          <span className="inline-flex rounded-full bg-primary-600 px-ds-2 py-ds-0.5 text-[11px] text-white">MARKET BOARD</span>
          <h1 className="mt-ds-2 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900">오늘시세</h1>
          <p className="mt-ds-1 text-[15px] leading-[1.5] text-ink-700">{selectedRegion} · {selectedCropOption.label} · 12분 전 업데이트</p>
          <div className="mt-ds-3 flex flex-wrap gap-ds-1"><Button onClick={() => onTabChange('regions')} rightIcon={<BarChart3 size={16} />}>지역·도매 보기</Button><Button variant="secondary" onClick={() => onTabChange('items')}>품목비교</Button></div>
        </div>
        <div className="v6-card-hover rounded-lg border border-white bg-white p-ds-3 shadow-card">
          <div className="flex items-start justify-between gap-ds-2"><div><p className="text-[11px] text-primary-600">선택 품목</p><h2 className="mt-ds-0.5 text-[20px] font-bold leading-[1.3] text-ink-900">{selectedCropOption.label}</h2><p className="mt-ds-0.5 text-[13px] text-ink-500">{selected.spec}</p></div><span className="text-[28px] leading-none">{selected.icon}</span></div>
          {selectedRegionPrice > 0 ? <strong className="mt-ds-2 flex items-baseline text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-ink-900 tabular"><span>{displayPrice.toLocaleString()}</span>{priceUnit()}</strong> : null}
          <div className="mt-ds-2 flex flex-wrap gap-ds-1"><PriceBadge direction={selected.direction} text={`${selected.change > 0 ? '+' : ''}${selected.change.toLocaleString()}원 (${selected.changePct > 0 ? '+' : ''}${selected.changePct}%)`} />{regionSpread > 0 ? <span className="inline-flex items-baseline rounded-full bg-ink-100 px-ds-2 py-ds-0.5 text-[13px] text-ink-700">지역차&nbsp;<span className="tabular">{regionSpread.toLocaleString()}</span><Unit /></span> : null}</div>
        </div>
      </div>
    </section>

    <div className="v6-block v6-delay-1 grid gap-ds-2 md:grid-cols-2">
      {upItems[0] ? <MarketTile label="상승 TOP" value={<PercentValue name={upItems[0].name} percent={upItems[0].changePct} positive />} sub="가락시장" tone="up" /> : null}
      {downItems[0] ? <MarketTile label="하락 TOP" value={<PercentValue name={downItems[0].name} percent={downItems[0].changePct} />} sub="구리시장" tone="down" /> : null}
    </div>

    <Card padding="normal" interactive={false} className="v6-block v6-delay-2 rounded-lg">
      <SectionHeader title="조회 기준" />
      <div className="space-y-ds-2">
        <FilterChips items={REGION_CROP_OPTIONS.map((item) => item.label)} active={selectedCropOption.label} onChange={(label) => handleCropSelect(REGION_CROP_OPTIONS.find((item) => item.label === label)?.key ?? 'cabbage')} ariaLabel="농산물 품목 선택" />
        <div className="grid gap-ds-2 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="block text-[13px] text-ink-500">지역 선택<select aria-label="지역 선택" value={selectedRegion} onChange={(event) => onRegionChange?.(event.target.value)} className="mt-ds-0.5 h-10 w-full rounded-md border border-ink-200 bg-white px-ds-2 text-[15px] text-ink-900 focus-visible:outline-none focus-visible:shadow-focus"><option value="전국">전국</option>{ADMIN_REGION_NAMES.map((region) => <option key={region} value={region}>{region}</option>)}</select></label>
          <Button variant="secondary" onClick={onUseLocation} loading={locating} className="self-end"><MapPin size={16} />내 위치 기준</Button>
        </div>
      </div>
    </Card>

    <div className="v6-block v6-delay-3 grid gap-ds-3 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card padding="normal" className="rounded-lg">
        <SectionHeader title={`${selectedCropOption.label} 지역별 도매가`} action="지역·도매" onAction={() => onTabChange('regions')} />
        {regionRows.length ? <RegionBarList rows={regionRows} selectedCropKey={selectedCropKey} onSelect={(region) => onRegionChange?.(region)} /> : <MarketSkeleton />}
      </Card>
      <Card padding="normal" className="rounded-lg">
        <SectionHeader title={`${selectedCropOption.label} 7일 흐름`} action="품목비교" onAction={() => onTabChange('items')} />
        <AxisLineChart values={selected.series} labels={chartLabels} direction={selected.direction} unit="원" height={220} />
        <div className="mt-ds-2 grid gap-ds-1.5">
          {upItems.slice(0, 3).map((crop) => <button type="button" key={`up-${crop.id}`} onClick={() => cropKeyByName(crop.name) ? handleCropSelect(cropKeyByName(crop.name) as RegionCropKey) : onAction(crop.name)} className="v6-list-row flex items-center justify-between rounded-md bg-up-bg px-ds-2 py-ds-1 text-left text-up"><span className="text-[15px]">{crop.name}</span><span className="text-[13px] tabular">+{crop.changePct}%</span></button>)}
          {downItems.slice(0, 2).map((crop) => <button type="button" key={`down-${crop.id}`} onClick={() => cropKeyByName(crop.name) ? handleCropSelect(cropKeyByName(crop.name) as RegionCropKey) : onAction(crop.name)} className="v6-list-row flex items-center justify-between rounded-md bg-down-bg px-ds-2 py-ds-1 text-left text-down"><span className="text-[15px]">{crop.name}</span><span className="text-[13px] tabular">{crop.changePct}%</span></button>)}
        </div>
      </Card>
    </div>

    <section className="v6-block v6-delay-4">
      <SectionHeader title="대표 품목" action="품목비교" onAction={() => onTabChange('items')} />
      <div className="grid grid-cols-1 gap-ds-2 md:grid-cols-2 xl:grid-cols-3">
        {focusedItems.length ? focusedItems.map((crop) => {
          const key = cropKeyByName(crop.name);
          return <ItemCard key={crop.id} crop={crop} selected={crop.name === selectedCropOption.label} favorite={favoriteCropIds.includes(crop.id)} onSelect={() => key ? handleCropSelect(key) : onAction(`${crop.name} 선택`)} onFavoriteToggle={onFavoriteToggle ? () => onFavoriteToggle(crop.id) : undefined} />;
        }) : <MarketNotice type="empty" onAction={() => onRegionChange?.('전국')} />}
      </div>
    </section>
  </div>;
}
