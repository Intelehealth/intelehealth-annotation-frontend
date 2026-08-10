'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleProps {
  title: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  accent?: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function Collapsible({
  title,
  icon,
  defaultOpen = true,
  accent = '#1e2a45',
  className,
  contentClassName,
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-xl border bg-white overflow-hidden shadow-sm', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
          {icon}
          <span style={{ color: accent }}>{title}</span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className={cn('px-3 pb-3', contentClassName)}>{children}</div>}
    </div>
  );
}
