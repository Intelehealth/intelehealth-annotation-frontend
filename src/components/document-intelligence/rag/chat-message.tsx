'use client';

import { cn } from '@/lib/utils';
import { ChatMessage } from '../context/document-view-context';
import { CitationChip } from './citation-chip';
import { ConfidenceIndicator } from './confidence-indicator';

interface ChatMessageProps {
  message: ChatMessage;
  onOpenCitation?: (fileName?: string, page?: number) => void;
}

export function ChatMessageView({ message, onOpenCitation }: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="max-w-[92%] rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-800">
        {message.content}
      </div>
      {message.citations && message.citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-0.5">
          {message.citations.map((c, i) => (
            <CitationChip
              key={i}
              fileName={c.fileName}
              page={c.page}
              onClick={() => onOpenCitation?.(c.fileName, c.page)}
            />
          ))}
        </div>
      )}
      {typeof message.confidence === 'number' && (
        <div className="px-0.5">
          <ConfidenceIndicator confidence={message.confidence} low={message.lowConfidence} />
        </div>
      )}
    </div>
  );
}