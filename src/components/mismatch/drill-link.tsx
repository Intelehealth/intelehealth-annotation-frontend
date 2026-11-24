'use client';

/**
 * #20 / #29 Makes an AI Dashboard number open the visits behind it (src/lib/drill.ts). The dashboard provides
 * the link maker for workspace members only; for everyone else <Drill> renders the number as plain text.
 */
import Link from 'next/link';
import { createContext, useContext, type ReactNode } from 'react';
import type { DrillSpec } from '@/lib/drill';
import { cn } from '@/lib/utils';

export type DrillMaker = (spec: DrillSpec, label: string) => string;
const DrillContext = createContext<DrillMaker | null>(null);
export const DrillProvider = DrillContext.Provider;
export const useDrill = () => useContext(DrillContext);

export function Drill({ spec, label, children, className }: { spec: DrillSpec; label: string; children: ReactNode; className?: string }) {
  const make = useContext(DrillContext);
  if (!make) return <>{children}</>;
  return (
    <Link href={make(spec, label)} className={cn('underline decoration-dotted decoration-1 underline-offset-2 hover:decoration-solid', className)}>
      {children}
    </Link>
  );
}
