'use client';

import { useRef, useEffect } from 'react';
import { ChatMessage } from '../context/document-view-context';
import { ChatMessageView } from './chat-message';

interface ChatThreadProps {
  messages: ChatMessage[];
  onOpenCitation?: (fileName?: string, page?: number) => void;
}

export function ChatThread({ messages, onOpenCitation }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <p className="px-1 py-3 text-center text-xs text-gray-400">
        Ask about these documents to get a grounded answer.
      </p>
    );
  }

  return (
    <div className="max-h-64 space-y-3 overflow-auto pr-1">
      {messages.map((m) => (
        <ChatMessageView key={m.id} message={m} onOpenCitation={onOpenCitation} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}