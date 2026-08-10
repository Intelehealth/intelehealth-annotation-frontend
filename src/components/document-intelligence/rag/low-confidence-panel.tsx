'use client';

import { AlertTriangle, RotateCcw, X, FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LowConfidencePanelProps {
  onRetry: () => void;
  onDismiss: () => void;
  onDraft?: () => void;
}

export function LowConfidencePanel({ onRetry, onDismiss, onDraft }: LowConfidencePanelProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
        <AlertTriangle className="h-3.5 w-3.5" /> Low confidence
      </div>
      <p className="mt-1 text-[11px] text-amber-700">
        I couldn't confidently verify this from the indexed documents.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onRetry}>
          <RotateCcw className="mr-1 h-3 w-3" /> Retry
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={onDismiss}>
          <X className="mr-1 h-3 w-3" /> Don't use
        </Button>
        {onDraft && (
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={onDraft}>
            <FilePlus2 className="mr-1 h-3 w-3" /> Draft Question
          </Button>
        )}
      </div>
    </div>
  );
}