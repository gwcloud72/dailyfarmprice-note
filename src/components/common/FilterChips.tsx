export interface FilterChipsProps {
  items: string[];
  active: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
}

export function FilterChips({ items, active, onChange, ariaLabel = '필터' }: FilterChipsProps) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-ds-1">
      {items.map((item) => {
        const selected = active === item;
        return (
          <button
            type="button"
            key={item}
            aria-pressed={selected}
            onClick={() => onChange(item)}
            className={[
              'h-9 rounded-full border px-ds-2 text-body-2 transition-fast duration-fast ease-product',
              'focus-visible:outline-none focus-visible:shadow-focus',
              selected
                ? 'border-primary-600 bg-primary-600 font-semibold text-white'
                : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-100',
            ].join(' ')}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
