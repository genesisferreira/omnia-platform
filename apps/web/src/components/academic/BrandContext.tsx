import { schoolBrand } from '@omnia/intelligent-learning';
import { cn } from '@omnia/ui';

export function BrandMark(props: {
  schoolKey?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const brand = schoolBrand(props.schoolKey);
  if (!brand) {
    return <span className={cn('font-heading font-bold', props.className)}>Omnia LMS</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-2', props.className)}>
      <span
        className={cn(
          'inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-xs font-bold uppercase tracking-wide text-white',
          brand.theme === 'fred' ? 'bg-emerald-600' : 'bg-sky-700',
        )}
        aria-hidden
      >
        {brand.logoLabel}
      </span>
      <span className="min-w-0">
        <span className="block font-heading text-sm font-bold leading-tight">{brand.name}</span>
        {brand.placeholder && !props.compact ? (
          <span className="block text-[10px] uppercase tracking-wide text-white/70">
            staging brand placeholder
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function BrandBanner(props: { schoolKey?: string | null; area: string }) {
  const brand = schoolBrand(props.schoolKey);
  if (!brand) return null;
  return (
    <div
      className={cn(
        'mb-4 rounded-md px-4 py-3 text-sm text-white',
        brand.theme === 'fred' ? 'bg-emerald-800' : 'bg-slate-800',
      )}
      data-school-key={brand.theme}
      data-brand-placeholder={brand.placeholder ? 'true' : 'false'}
    >
      <p className="font-medium">
        {brand.name} · {props.area}
      </p>
      {brand.placeholder ? (
        <p className="mt-1 text-xs text-white/80">
          CTE STAGING BRAND PLACEHOLDER — identidade visual temporária, distinta do Fred do Frio.
          placeholder=true
        </p>
      ) : null}
    </div>
  );
}
