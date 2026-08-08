'use client';

import { CornerDownRight, FilePlus2 } from 'lucide-react';
import { useDocumentView } from '../context/document-view-context';
import { CitationChip } from '../rag/citation-chip';

interface RelatedQuestionCardProps {
  question: string;
  confidence?: number;
  coverage?: { coveredDocs?: number; totalDocs?: number };
  citations?: Array<{ fileName?: string; page?: number }>;
}

export function RelatedQuestionCard({
  question,
  confidence,
  coverage,
  citations,
}: RelatedQuestionCardProps) {
  const { documents, openCitation, requestAddQuestion } = useDocumentView();
  const covered = coverage?.coveredDocs ?? 0;
  const total = coverage?.totalDocs ?? 0;
  const confPct = Math.round(((confidence ?? 0) / 1) * 100);

  const openSource = (fileName?: string, page?: number, rowIndex?: number) => {
    if (!fileName) return;
    const doc = documents.find((d) => d.fileName === fileName);
    openCitation({
      documentId: doc?.id ?? null,
      documentName: fileName,
      page,
      rowIndex,
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
      <div className="flex items-start gap-2">
        <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-800">{question}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {typeof confidence === 'number' && (
              <span className="text-[11px] text-gray-500">conf {confPct}%</span>
            )}
            {total > 0 && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                cov {covered}/{total}
              </span>
            )}
          </div>
          {citations && citations.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {citations.map((c, i) => (
                <CitationChip
                  key={i}
                  fileName={c.fileName}
                  page={c.page}
                  onClick={() => openSource(c.fileName, c.page, (c as any).rowIndex)}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => requestAddQuestion(question)}
            className="mt-2 flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline"
          >
            <FilePlus2 className="h-3 w-3" /> Add as Annotation Question
          </button>
        </div>
      </div>
    </div>
  );
}