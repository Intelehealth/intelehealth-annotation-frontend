'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

// A single-choice dropdown with a type-to-filter box, for option lists too long
// to scan (drug names, dose values). Same contract as a native <select>: one
// string value, '' when nothing is chosen. Radix sets the trigger's aria state.

export function SearchableSelect({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Choose…',
  searchPlaceholder = 'Type to search…',
  className,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasValue = value !== '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-8 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-2 text-left text-sm',
            'focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50',
            !hasValue && 'text-gray-500',
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate">{hasValue ? value : placeholder}</span>
          {hasValue && !disabled ? (
            <span
              role="button"
              aria-label="Clear selection"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="size-3.5" />
            </span>
          ) : (
            <ChevronsUpDown className="size-3.5 shrink-0 text-gray-400" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o}
                  value={o}
                  onSelect={() => {
                    onChange(o === value ? '' : o);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check className={cn('size-4 shrink-0', o === value ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1 break-words">{o}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
