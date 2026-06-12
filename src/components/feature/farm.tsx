import { Bell, Star } from 'lucide-react';
import { Card, PriceBadge, Button, MiniTrend } from '../common/ui';
import type { CropItem } from '../../data/model';

export function ItemCard({ crop, selected = false, onSelect }: { crop: CropItem; selected?: boolean; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} aria-pressed={selected} className={`rounded-md border bg-white p-4 text-left shadow-card transition hover:shadow-lift ${selected ? 'border-primary-500 bg-primary-50 outline outline-2 outline-primary-500' : 'border-ink-200'}`}><div className="flex items-start justify-between"><span className="text-price-xl leading-none">{crop.icon}</span><span className="text-xs text-ink-500">{crop.spec}</span></div><div className="mt-4"><h3 className="truncate text-sm font-semibold text-ink-900">{crop.name}</h3><p className="mt-1 truncate text-xs text-ink-500">{crop.market} · {crop.region}</p><strong className="mt-2 block text-price-md font-bold text-ink-900 tabular">{crop.price.toLocaleString()}원</strong><div className="mt-ds-1.5"><PriceBadge direction={crop.direction} text={`${crop.change > 0 ? '+' : ''}${crop.change.toLocaleString()}원 (${crop.changePct > 0 ? '+' : ''}${crop.changePct}%)`} /></div></div></button>;
}

export function AlertCard({ crop, active, onToggle }: { crop: CropItem; active: boolean; onToggle: () => void }) {
  return <Card className={`p-5 ${active ? 'border-primary-400 bg-primary-50' : ''}`}><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="text-price-xl">{crop.icon}</span><div><h3 className="font-semibold text-ink-900">{crop.name}</h3><p className="text-xs text-ink-500">{crop.spec}</p></div></div><button type="button" onClick={onToggle} aria-pressed={active} className={`text-xs font-semibold ${active ? 'text-primary-500' : 'text-ink-400'}`}>{active ? '켜짐' : '꺼짐'}</button></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-200 pt-4"><div><p className="text-xs text-ink-500">현재가</p><strong className="text-xl font-bold tabular">{crop.price.toLocaleString()}원</strong></div><div><p className="text-xs text-ink-500">변동</p><PriceBadge direction={crop.direction} text={`${crop.changePct}%`} /></div></div></Card>;
}

export function FavoriteItem({ crop, onToggle }: { crop: CropItem; onToggle: () => void }) {
  return <Card padding="normal"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-price-xl">{crop.icon}</span><div><h3 className="font-bold text-ink-900">{crop.name}</h3><p className="text-sm text-ink-500">{crop.market} · {crop.spec}</p></div></div><button type="button" onClick={onToggle} aria-pressed="true" className="rounded-full bg-primary-100 p-2 text-primary-600"><Star size={18} fill="currentColor" /></button></div><div className="mt-4 grid grid-cols-trend-120 items-center gap-4"><strong className="text-2xl font-bold tabular">{crop.price.toLocaleString()}원</strong><MiniTrend values={crop.series} direction={crop.direction} /></div></Card>;
}

export function DownloadStep({ number, label, desc, onClick }: { number: number; label: string; desc: string; onClick: () => void }) {
  return <Card className="p-6"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-sm font-bold text-white tabular">{number}</span><h3 className="mt-4 text-base font-bold text-ink-900">{label}</h3><p className="mt-2 text-sm leading-6 text-ink-500">{desc}</p><Button variant="secondary" onClick={onClick} className="mt-4 w-full">선택</Button></Card>;
}
