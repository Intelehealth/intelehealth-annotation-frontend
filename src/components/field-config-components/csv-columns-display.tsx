'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Database, FileText, Plus, File, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Matching ignores case, underscores, hyphens and spaces, so "visit id" finds
// "Visit_id" — the shapes column names actually come in.
const normalise = (v: string) => v.toLowerCase().replace(/[\s_-]+/g, '');

interface CSVColumn {
  name: string;
  sampleData?: string;
  source?: 'CSV' | 'MANUAL' | 'DOCUMENT';
  csvImportId?: string;
}

interface CSVColumnsDisplayProps {
  csvColumns: CSVColumn[];
  manualColumns?: CSVColumn[];
  documentColumns?: CSVColumn[];
  selectedColumns: Set<string>;
  onColumnClick: (columnName: string) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  onInvertSelection?: () => void;
  title?: string;
  description?: string;
}

export function CSVColumnsDisplay({
  csvColumns,
  manualColumns = [],
  documentColumns = [],
  selectedColumns,
  onColumnClick,
  onSelectAll,
  onClearAll,
  onInvertSelection,
  title = 'Available Columns',
  description = 'Columns available for annotation configuration',
}: CSVColumnsDisplayProps) {
  const [query, setQuery] = useState('');
  const q = normalise(query.trim());

  const match = (c: CSVColumn) => !q || normalise(c.name).includes(q);
  const shownCsv = useMemo(() => csvColumns.filter(match), [csvColumns, q]);
  const shownManual = useMemo(() => manualColumns.filter(match), [manualColumns, q]);
  const shownDocument = useMemo(() => documentColumns.filter(match), [documentColumns, q]);

  const total = csvColumns.length + manualColumns.length + documentColumns.length;
  const shownTotal = shownCsv.length + shownManual.length + shownDocument.length;
  const matched = [...shownCsv, ...shownManual, ...shownDocument];
  const unselectedMatches = matched.filter((c) => !selectedColumns.has(c.name));

  // With a search active, "select all" means the matches, not the whole sheet —
  // the point of searching 100 columns is to act on the handful you found.
  const selectMatches = () => unselectedMatches.forEach((c) => onColumnClick(c.name));

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 border-b border-gray-100/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-blue-600" />
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-xs text-gray-600 mt-1">{description}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search columns"
                aria-label="Search columns"
                className="h-8 w-48 pl-7 pr-7 text-xs"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear column search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center space-x-1.5">
              {q && (
                <button
                  type="button"
                  onClick={selectMatches}
                  disabled={unselectedMatches.length === 0}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50 transition-all active:scale-95 cursor-pointer shadow-3xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add {unselectedMatches.length} match{unselectedMatches.length === 1 ? '' : 'es'}
                </button>
              )}
              {!q && onSelectAll && (
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50 transition-all active:scale-95 cursor-pointer shadow-3xs"
                >
                  Select All
                </button>
              )}
              {onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-200 text-gray-700 bg-gray-50/50 hover:bg-gray-50 transition-all active:scale-95 cursor-pointer shadow-3xs"
                >
                  Clear All
                </button>
              )}
              {onInvertSelection && (
                <button
                  type="button"
                  onClick={onInvertSelection}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50 transition-all active:scale-95 cursor-pointer shadow-3xs"
                >
                  Invert Selection
                </button>
              )}
            </div>
            <Badge variant="outline" className="text-xs py-0.5 px-2 bg-gray-50 border-gray-200 font-medium">
              {q ? `${shownTotal} of ${total}` : `${total} columns`}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* CSV Columns */}
          {shownCsv.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                CSV Columns ({shownCsv.length})
              </h4>
              <div className="w-full">
                <div className="flex flex-wrap gap-2 gap-y-2 items-start w-full">
                  {shownCsv.map((column) => {
                    const isSelected = selectedColumns.has(column.name);
                    return (
                      <span
                        key={column.name}
                        onClick={() => onColumnClick(column.name)}
                        className={cn(
                          "px-3 py-1 text-sm border text-center truncate rounded-sm cursor-pointer transition-all duration-200 hover:scale-105",
                          isSelected
                            ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
                            : "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
                        )}
                        title={`${column.name} - Click to ${isSelected ? 'remove' : 'add'} to annotation fields`}
                      >
                        {column.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Manual Columns (merged columns land here, and are clickable) */}
          {shownManual.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Plus className="h-4 w-4 mr-2 text-green-600" />
                Manual Columns ({shownManual.length})
              </h4>
              <div className="w-full">
                <div className="flex flex-wrap gap-2 gap-y-2 items-start w-full">
                  {shownManual.map((column) => {
                    const isSelected = selectedColumns.has(column.name);
                    return (
                      <span
                        key={column.name}
                        onClick={() => onColumnClick(column.name)}
                        className={cn(
                          "px-3 py-1 text-sm border text-center truncate rounded-sm cursor-pointer transition-all duration-200 hover:scale-105",
                          isSelected
                            ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
                            : "bg-white text-green-800 border-green-200 hover:bg-green-50"
                        )}
                        title={`${column.name} - Click to ${isSelected ? 'remove' : 'add'} to annotation fields`}
                      >
                        {column.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Document Columns */}
          {shownDocument.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <File className="h-4 w-4 mr-2 text-purple-600" />
                Document Columns ({shownDocument.length})
              </h4>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-10 gap-2 min-w-max">
                  {shownDocument.map((column) => {
                    const isSelected = selectedColumns.has(column.name);
                    return (
                      <span
                        key={column.name}
                        onClick={() => onColumnClick(column.name)}
                        className={cn(
                          "px-3 py-1 text-sm border text-center truncate rounded-sm cursor-pointer transition-all duration-200 hover:scale-105",
                          isSelected
                            ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
                            : "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200"
                        )}
                        title={`${column.name} - Click to ${isSelected ? 'remove' : 'add'} to annotation fields`}
                      >
                        {column.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* No Columns State */}
          {shownTotal === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">
                {total === 0 ? 'No columns available' : `No column matches "${query.trim()}"`}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
