'use client';

import { Search } from 'lucide-react';

interface DocumentSearchProps {
  value: string;
  onChange: (v: string) => void;
}

export function DocumentSearch({ value, onChange }: DocumentSearchProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5">
      <Search className="h-3.5 w-3.5 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search documents…"
        className="w-full bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
      />
    </div>
  );
}