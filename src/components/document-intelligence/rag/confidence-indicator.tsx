'use client';

import { cn } from '@/lib/utils';

interface ConfidenceIndicatorProps {
  confidence: number;
  low?: boolean;
}

export function ConfidenceIndicator({ confidence, low }: ConfidenceIndicatorProps) {
  const pct = Math.max(0, Math.min(1, confidence)) * 100;
  return (
    <div className="flex items-center gap-2" title={`Confidence ${pct.toFixed(0)}%`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn('h-full rounded-full', low ? 'bg-amber-400' : 'bg-blue-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('text-[11px] font-medium tabular-nums', low ? 'text-amber-600' : 'text-blue-700')}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}