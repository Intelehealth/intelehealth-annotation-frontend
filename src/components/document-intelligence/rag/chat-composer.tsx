'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

const QUICK_REPLIES = [
  'Summarize these documents',
  'What key values are extracted?',
  'Which values appear across documents?',
];

interface ChatComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [text, setText] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {QUICK_REPLIES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSend(q)}
            className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-600 hover:bg-blue-50 hover:text-blue-700"
          >
            {q}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="/query — ask about these documents…"
          disabled={disabled}
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none disabled:opacity-50"
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="bg-blue-600 px-3 hover:bg-blue-700"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}