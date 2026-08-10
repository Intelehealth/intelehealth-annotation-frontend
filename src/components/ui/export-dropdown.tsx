'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ExportOption {
  id: string;
  label: string;
  description: string;
  action: () => void;
}

interface ExportDropdownProps {
  options: ExportOption[];
  disabled?: boolean;
}

export function ExportDropdown({ options, disabled = false }: ExportDropdownProps) {
  const [selectedValue, setSelectedValue] = useState<string>('');

  const handleValueChange = (value: string) => {
    const option = options.find(opt => opt.id === value);
    if (option) {
      option.action();
      setSelectedValue(''); // Reset selection after action
    }
  };

  return (
    <Select value={selectedValue} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className="w-full h-[44px] bg-[#16a34a] hover:bg-[#16a34a] text-white border-[#16a34a] font-medium px-2 [&>svg]:!text-white [&>svg]:!fill-white [&>svg]:stroke-white [&>svg]:!stroke-white md:h-9 md:px-4 md:py-2 md:bg-green-600 md:hover:bg-green-700 md:border-green-600">
        <span className="flex flex-1 min-w-0 items-center justify-center text-white">
          <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-white" />
          <span className="truncate"><SelectValue placeholder="Export CSV" /></span>
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            <div className="flex flex-col items-start">
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-gray-500 mt-1">{option.description}</div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
