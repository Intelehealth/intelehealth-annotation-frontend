'use client';

/** Light / Dark / System (default: follow the device). Stored by next-themes in this browser. */
import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const;

const noop = () => () => {};

export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  // The stored choice is only known in the browser; render neutral until then (no hydration mismatch).
  const ready = useSyncExternalStore(noop, () => true, () => false);
  const current = ready ? theme ?? 'system' : null;
  return (
    <div role="radiogroup" aria-label="Theme" className={cn('flex gap-0.5 rounded-lg bg-muted p-0.5', compact && 'flex-col')}>
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            'inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground',
            current === value && 'bg-card text-foreground shadow-sm',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {!compact && label}
        </button>
      ))}
    </div>
  );
}
