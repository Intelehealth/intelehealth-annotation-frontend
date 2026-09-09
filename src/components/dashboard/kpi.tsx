import Link from 'next/link';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// A compact stat. Value first, label second, one optional line of context.
// Not a "hero metric" tile: no gradients, no icons, no colour unless the
// number itself is a warning.
export function Kpi({
  label, value, hint, href, tone = 'default', className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: 'default' | 'warn' | 'good';
  className?: string;
}) {
  const body = (
    <div className={cn('rounded-lg border bg-card px-4 py-3', href && 'transition-colors hover:bg-accent/40', className)}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums tracking-tight',
        tone === 'warn' && 'text-amber-600 dark:text-amber-400',
        tone === 'good' && 'text-emerald-600 dark:text-emerald-400')}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export function Section({ title, description, action, children, className }: {
  title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={cn('rounded-lg border bg-card', className)}>
      <header className="flex items-start justify-between gap-4 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Thin progress bar, 0-100. */
export function Bar({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width] duration-300', v >= 100 ? 'bg-emerald-500' : 'bg-foreground/70')} style={{ width: `${v}%` }} />
    </div>
  );
}
