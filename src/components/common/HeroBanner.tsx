import { ExternalLink } from 'lucide-react';
import { Button } from './Button';
import type { ChangeDirection, HeroKind } from './types';
import { PriceBadge } from './PriceBadge';

interface HeroMetric {
  label: string;
  title: string;
  price: string;
  sub: string;
  change?: string;
  direction?: ChangeDirection;
  helper?: string;
}

export interface HeroBannerProps {
  kind: HeroKind;
  badge: string;
  title: string;
  subtitle: string;
  chips?: string[];
  metric?: HeroMetric;
  onPrimary: () => void;
  onSecondary: () => void;
  primaryLabel: string;
  secondaryLabel: string;
  dense?: boolean;
  metricActionLabel?: string;
  onMetricAction?: () => void;
}

const heroClasses: Record<HeroKind, string> = {
  farm: 'bg-hero-farm min-h-hero',
  liter: 'bg-hero-liter min-h-hero',
  sang: 'bg-hero-sang min-h-hero-sang',
  solid: 'bg-hero-solid min-h-hero-sub',
};

export function HeroBanner({ kind, badge, title, subtitle, chips = [], metric, onPrimary, onSecondary, primaryLabel, secondaryLabel, dense = false, metricActionLabel = '바로 확인', onMetricAction }: HeroBannerProps) {
  return (
    <section className={`relative overflow-hidden rounded-lg ${dense ? 'p-ds-3' : 'p-ds-4'} text-white shadow-card ${heroClasses[kind]}`}>
      <div className="absolute -right-ds-10 -top-ds-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="relative grid gap-ds-3 lg:grid-cols-hero-metric lg:items-center">
        <div>
          <span className="inline-flex rounded-full bg-white/10 px-ds-2 py-ds-0.5 text-caption font-semibold text-white/90 ring-1 ring-white/20">{badge}</span>
          <h1 className="mt-ds-2 text-display text-white">{title}</h1>
          <p className="mt-ds-1 max-w-readable text-body-1 text-white/75">{subtitle}</p>
          {chips.length ? <div className="mt-ds-3 flex flex-wrap gap-ds-1">{chips.slice(0, 6).map((chip) => <span key={chip} className="rounded-full bg-white/10 px-ds-2 py-ds-0.5 text-caption text-white/80 ring-1 ring-white/10">{chip}</span>)}</div> : null}
          <div className="mt-ds-3 flex flex-wrap gap-ds-1"><Button variant={kind === 'sang' ? 'primary' : 'white'} onClick={onPrimary}>{primaryLabel}</Button><Button variant="white" onClick={onSecondary}>{secondaryLabel}</Button></div>
        </div>
        {metric ? (
          <div className="rounded-lg bg-white p-ds-3 text-ink-900 shadow-card-hover">
            <div className="flex items-center justify-between gap-ds-2"><p className="text-caption font-medium text-ink-500">{metric.label}</p><span className="rounded-full bg-ink-100 px-ds-1 py-ds-0.5 text-micro text-ink-500">{metric.sub}</span></div>
            <strong className={`mt-ds-2 block text-price-xl tabular ${kind === 'liter' ? 'text-primary-500' : 'text-ink-900'}`}>{metric.price}</strong>
            <div className="mt-ds-2 flex items-center justify-between gap-ds-1"><p className="text-body-1 font-semibold text-ink-700">{metric.title}</p>{metric.change ? <PriceBadge direction={metric.direction ?? 'flat'} text={metric.change} /> : null}</div>
            {metric.helper ? <p className="mt-ds-1 text-caption text-ink-500">{metric.helper}</p> : null}
            <Button variant="primary" onClick={onMetricAction ?? onSecondary} className="mt-ds-3 w-full" rightIcon={<ExternalLink className="h-4 w-4" strokeWidth={1.8} />}>{metricActionLabel}</Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
