'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state (optional) — when provided, drives the section open. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  right?: ReactNode;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  open,
  onOpenChange,
  right,
  children,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open !== undefined ? open : internalOpen;
  const toggle = () => {
    if (open !== undefined) onOpenChange?.(!open);
    else setInternalOpen((o) => !o);
  };
  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {icon}
        <span className="flex-1 text-sm font-semibold text-gray-800">{title}</span>
        {right}
        <ChevronDown
          className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')}
        />
      </button>
      {isOpen && <div className="border-t border-gray-100 p-3">{children}</div>}
    </section>
  );
}