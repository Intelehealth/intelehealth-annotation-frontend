'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ragAPI } from '@/lib/api/rag';
import { useDocumentView } from '../context/document-view-context';
import { RelatedQuestionCard } from './related-question-card';

export function RelatedQuestions() {
  const { datasetId } = useDocumentView();
  const [questions, setQuestions] = useState<any[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [generating, setGenerating] = useState(false);

  const load = () => {
    ragAPI
      .relatedQuestions(datasetId)
      .then((data) => {
        setQuestions(Array.isArray(data) ? data : []);
        setState('ready');
      })
      .catch(() => setState('unavailable'));
  };

  useEffect(() => {
    load();
  }, [datasetId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await ragAPI.generateRelatedQuestions(datasetId);
      setQuestions(Array.isArray(data) ? data : []);
      setState('ready');
    } catch {
      setState('unavailable');
    } finally {
      setGenerating(false);
    }
  };

  if (state === 'loading') {
    return <p className="text-xs text-gray-400">Loading related questions…</p>;
  }

  if (state === 'unavailable') {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500">
          Related questions are not available for this dataset yet.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
          Generate
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {questions.length > 0 ? (
        questions.map((q, i) => (
          <RelatedQuestionCard
            key={q._id || i}
            question={q.question}
            confidence={q.confidence}
            coverage={q.coverage}
            citations={q.citations || []}
          />
        ))
      ) : (
        <p className="text-xs text-gray-500">No related questions generated yet.</p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
          {generating ? 'Generating…' : 'Generate from documents'}
        </Button>
      </div>
    </div>
  );
}