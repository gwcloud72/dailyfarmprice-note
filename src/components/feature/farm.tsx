import { Star } from 'lucide-react';
import { Card, PriceBadge, Button, MiniTrend } from '../common/ui';
import type { CropItem } from '../../data/model';

export function ItemCard({ crop, selected = false, favorite = false, onSelect, onFavoriteToggle }: { crop: CropItem; selected?: boolean; favorite?: boolean; onSelect: () => void; onFavoriteToggle?: () => void }) {
  return <div className={`v6-card-hover rounded-lg border bg-white p-ds-3 text-left shadow-card ${selected ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-ink-200'}`}>
    <div className="flex items-start justify-between gap-ds-2">
      <button type="button" onClick={onSelect} aria-pressed={selected} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:shadow-focus"><span className="text-[28px] leading-none">{crop.icon}</span></button>
      <div className="flex shrink-0 items-center gap-ds-1"><span className="rounded-full bg-ink-100 px-ds-1 py-ds-0.5 text-[11px] text-ink-500">{crop.spec}</span>{onFavoriteToggle ? <button type="button" onClick={onFavoriteToggle} aria-pressed={favorite} aria-label={`${crop.name} 관심 품목`} className={`v6-fav-button rounded-full p-ds-0.5 ${favorite ? 'bg-primary-100 text-primary-600' : 'bg-ink-100 text-ink-400 hover:text-primary-600'}`}><Star size={16} fill={favorite ? 'currentColor' : 'none'} /></button> : null}</div>
    </div>
    <button type="button" onClick={onSelect} aria-pressed={selected} className="mt-ds-2 block w-full text-left focus-visible:outline-none focus-visible:shadow-focus"><h3 className="truncate text-[15px] font-bold text-ink-900">{crop.name}</h3><p className="mt-ds-0.5 truncate text-[13px] text-ink-500">{crop.market} · {crop.region}</p><strong className="mt-ds-1 flex items-baseline text-[20px] font-bold leading-[1.1] text-ink-900 tabular"><span>{crop.price.toLocaleString()}</span><span className="v6-unit">원</span></strong><div className="mt-ds-1.5"><PriceBadge direction={crop.direction} text={`${crop.change > 0 ? '+' : ''}${crop.change.toLocaleString()}원 (${crop.changePct > 0 ? '+' : ''}${crop.changePct}%)`} /></div></button>
  </div>;
}

export function AlertCard({ crop, active, onToggle }: { crop: CropItem; active: boolean; onToggle: () => void }) {
  return <Card className={`p-5 ${active ? 'border-primary-400 bg-primary-50' : ''}`}><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="text-price-xl">{crop.icon}</span><div><h3 className="font-bold text-ink-900">{crop.name}</h3><p className="text-xs text-ink-500">{crop.spec}</p></div></div><button type="button" onClick={onToggle} aria-pressed={active} className={`text-xs font-bold ${active ? 'text-primary-500' : 'text-ink-400'}`}>{active ? '켜짐' : '꺼짐'}</button></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-200 pt-4"><div><p className="text-xs text-ink-500">현재가</p><strong className="inline-flex items-baseline text-xl font-bold tabular"><span>{crop.price.toLocaleString()}</span><span className="v6-unit">원</span></strong></div><div><p className="text-xs text-ink-500">변동</p><PriceBadge direction={crop.direction} text={`${crop.changePct}%`} /></div></div></Card>;
}

export function FavoriteItem({ crop, onToggle }: { crop: CropItem; onToggle: () => void }) {
  return <Card padding="normal"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-price-xl">{crop.icon}</span><div><h3 className="font-bold text-ink-900">{crop.name}</h3><p className="text-sm text-ink-500">전국 평균 · {crop.spec}</p></div></div><button type="button" onClick={onToggle} aria-pressed="true" className="rounded-full bg-primary-100 p-2 text-primary-600"><Star size={18} fill="currentColor" /></button></div><div className="mt-4 grid grid-cols-trend-120 items-center gap-4"><strong className="inline-flex items-baseline text-2xl font-bold tabular"><span>{crop.price.toLocaleString()}</span><span className="v6-unit">원</span></strong><MiniTrend values={crop.series} direction={crop.direction} /></div></Card>;
}

export function DownloadStep({ number, label, onClick }: { number: number; label: string; onClick: () => void }) {
  return <Card className="p-6"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-sm font-bold text-white tabular">{number}</span><h3 className="mt-4 text-base font-bold text-ink-900">{label}</h3><Button variant="secondary" onClick={onClick} className="mt-4 w-full">선택</Button></Card>;
}
