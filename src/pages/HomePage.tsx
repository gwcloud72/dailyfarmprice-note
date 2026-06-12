import { useMemo, useState } from 'react';
import { BarChart2, Search } from 'lucide-react';
import { HeroBanner } from '../components/common/HeroBanner';
import { BottomWidgetPanel, Button, Card, FilterChips, MiniTrend, PriceBadge, SearchField, SectionHeader, StatsStrip } from '../components/common/ui';
import { ItemCard } from '../components/feature/farm';
import type { FarmData } from '../data/normalize';
import brandMark from '../assets/home-brand-mark.webp';

interface PageProps { data: FarmData; onTabChange: (tab: string) => void; onAction: (text: string) => void; }

export function HomePage({ data, onTabChange, onAction }: PageProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('');
  const selected = data.crops.find((crop) => crop.name === active) ?? data.crops[0];
  const chipItems = ['전체', 'up', 'down', 'flat', ...data.crops.slice(0, 3).map((crop) => crop.name)];
  const visibleItems = useMemo(() => data.crops.filter((crop) => crop.name.includes(query) || crop.region.includes(query) || crop.market.includes(query) || query.length === 0).slice(0, 6), [data.crops, query]);
  const counts = {
    up: data.crops.filter((crop) => crop.direction === 'up').length,
    down: data.crops.filter((crop) => crop.direction === 'down').length,
    flat: data.crops.filter((crop) => crop.direction === 'flat').length,
  };

  return (
    <div className="mx-auto max-w-shell space-y-ds-4">
      <HeroBanner
        kind="farm"
        badge="오늘의 시세"
        title="오늘 가격 흐름을 빠르게 확인하세요"
        subtitle="자주 보는 품목만 먼저 보고, 상세 비교는 품목별 시세에서 이어갑니다."
        chips={data.crops.slice(0, 6).map((crop) => crop.name)}
        metric={{ label:'선택 품목', title:selected.name, price:`${selected.price.toLocaleString()}원`, sub:selected.spec, change:`${selected.change > 0 ? '+' : ''}${selected.change.toLocaleString()}원 (${selected.changePct > 0 ? '+' : ''}${selected.changePct}%)`, direction:selected.direction, helper:`${selected.market} · ${selected.region}` }}
        primaryLabel="품목별 시세"
        secondaryLabel="지역 비교"
        onPrimary={() => onTabChange('items')}
        onSecondary={() => onTabChange('regions')}
      brandMarkSrc={brandMark}
      brandMarkAlt="농산물 가격정보 브랜드 로고"
      />
      <div className="grid gap-ds-2 lg:grid-cols-search-action">
        <SearchField value={query} onChange={setQuery} placeholder="품목명·시장·지역 검색" />
        <Button variant="secondary" onClick={() => onAction('전국 기준으로 전환')}>전국</Button>
      </div>

      <FilterChips items={chipItems} active={active || data.crops[0].name} onChange={(next) => setActive(next === '전체' ? data.crops[0].name : next)} />
      <StatsStrip stats={data.metrics} compact />

      <section>
        <SectionHeader title="오늘의 주요 품목 시세" action="더보기" onAction={() => onTabChange('items')} />
        <div className="grid grid-cols-1 gap-ds-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((crop) => <ItemCard key={crop.id} crop={crop} selected={crop.name === active} onSelect={() => setActive(crop.name)} />)}
        </div>
      </section>

      <div className="grid gap-ds-2 xl:grid-cols-main-360">
        <Card padding="normal">
          <div className="mb-ds-2 flex items-center justify-between">
            <div>
              <h2 className="text-heading-2 font-bold text-ink-900">가격 변동 요약</h2>
              <p className="mt-ds-0.5 text-caption text-ink-500">상승·하락·보합 비중만 빠르게 확인합니다.</p>
            </div>
            <BarChart2 size={19} className="text-primary-600" />
          </div>
          <div className="grid gap-ds-2 md:grid-cols-3">
            <div className="rounded-md bg-up-bg p-ds-2"><p className="text-caption font-medium text-up">상승</p><strong className="mt-ds-1 block text-price-lg font-bold text-up tabular">{counts.up}개</strong></div>
            <div className="rounded-md bg-down-bg p-ds-2"><p className="text-caption font-medium text-down">하락</p><strong className="mt-ds-1 block text-price-lg font-bold text-down tabular">{counts.down}개</strong></div>
            <div className="rounded-md bg-flat-bg p-ds-2"><p className="text-caption font-medium text-flat">보합</p><strong className="mt-ds-1 block text-price-lg font-bold text-flat tabular">{counts.flat}개</strong></div>
          </div>
        </Card>

        <Card padding="normal">
          <SectionHeader title="선택 품목 가격 흐름" action="통계" onAction={() => onTabChange('stats')} />
          <div className="mt-ds-2 flex items-end justify-between gap-ds-2">
            <div>
              <p className="text-sm font-semibold text-ink-900">{selected.name}</p>
              <p className="mt-ds-0.5 text-caption text-ink-500">{selected.market} · {selected.spec}</p>
              <div className="mt-ds-2"><PriceBadge direction={selected.direction} text={`${selected.changePct > 0 ? '+' : ''}${selected.changePct}%`} /></div>
            </div>
            <div className="w-36"><MiniTrend values={selected.series} direction={selected.direction} /></div>
          </div>
        </Card>
      </div>


      {data.marketNews.length > 0 ? (
        <Card padding="normal">
          <SectionHeader title="시장 동향" action="전체 보기" onAction={() => onTabChange('market-news')} />
          <div className="grid gap-ds-2 md:grid-cols-3">
            {data.marketNews.slice(0, 3).map((item) => (
              <article key={item.id} className="rounded-md border border-ink-200 bg-white px-ds-2 py-ds-1.5">
                <div className="mb-2 flex items-center justify-between gap-ds-2 text-xs text-ink-400"><span>{item.keyword}</span><span>{item.publishedAt}</span></div>
                <h3 className="line-clamp-1 text-sm font-bold text-ink-900">{item.title}</h3>
                <p className="mt-ds-0.5 line-clamp-1 text-caption text-ink-500">{item.summary}</p>
              </article>
            ))}
          </div>
        </Card>
      ) : null}

      <BottomWidgetPanel widgets={data.widgets} onAction={(label) => onAction(label)} compact />
    </div>
  );
}
