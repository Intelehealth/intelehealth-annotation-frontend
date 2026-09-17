'use client';

import { HelpCircle, Sparkles, BrainCircuit } from 'lucide-react';
import { CollapsibleSection } from './collapsible-section';
import { AnnotationQuestions } from '../annotation/annotation-questions';
import { RelatedQuestions } from '../related/related-questions';
import { RagAssistant } from '../rag/rag-assistant';

export function RightIntelligencePanel() {
  return (
    <div className="flex h-full flex-col gap-2.5 overflow-auto p-3">
      <CollapsibleSection
        title="Annotation Questions"
        icon={<HelpCircle className="h-4 w-4 text-blue-600" />}
      >
        <AnnotationQuestions />
      </CollapsibleSection>

      <CollapsibleSection
        title="Related Questions"
        icon={<Sparkles className="h-4 w-4 text-blue-600" />}
      >
        <RelatedQuestions />
      </CollapsibleSection>

      {/* RAG Assistant is the last section (Model + Coverage live inside it). */}
      <RagAssistant />
    </div>
  );
}