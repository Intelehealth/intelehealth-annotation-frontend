'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BrainCircuit, RefreshCw, Loader2, FileText, X } from 'lucide-react';
import { ragAPI, RagPresetInfo } from '@/lib/api/rag';
import { useDocumentView } from '../context/document-view-context';
import { CollapsibleSection } from '../layout/collapsible-section';
import { ChatThread } from './chat-thread';
import { ChatComposer } from './chat-composer';
import { LowConfidencePanel } from './low-confidence-panel';
import { cn } from '@/lib/utils';

export function RagAssistant() {
  const {
    datasetId,
    ragStatus,
    setRagStatus,
    documents,
    setDocuments,
    chatMessages,
    setChatMessages,
    selectedModel,
    setSelectedModel,
    selectedDocumentId,
    selectedDocument,
    setSelectedDocumentId,
    openCitation,
    clearCitation,
    requestAddQuestion,
  } = useDocumentView();

  const [models, setModels] = useState<RagPresetInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [lastUser, setLastUser] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const autoIndexedRef = useRef(false);

  const loadStatus = useCallback(async () => {
    try {
      setRagStatus(await ragAPI.status(datasetId));
    } catch {
      setRagStatus(null);
    }
  }, [datasetId, setRagStatus]);

  useEffect(() => {
    loadStatus();
    ragAPI
      .models()
      .then((list) => {
        setModels(list);
        const available = list.filter((m) => m.available);
        if (available.length) {
          setSelectedModel((prev) =>
            available.some((m) => m.key === prev) ? prev : (available[0].key as string),
          );
        }
      })
      .catch(() => setModels([]));
    ragAPI
      .getConversation(datasetId)
      .then((conv) => setChatMessages(conv.messages || []))
      .catch(() => setChatMessages([]));
  }, [datasetId, loadStatus, setSelectedModel, setChatMessages]);

  // Auto-build the index once when it is not ready but documents exist (real
  // extraction; no fake results — chat/related require an actual index).
  useEffect(() => {
    if (autoIndexedRef.current) return;
    if (!ragStatus || ragStatus.ready) return;
    if (!documents.length) return;
    autoIndexedRef.current = true;
    handleIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ragStatus, documents]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setNotice(null);
      clearCitation();
      setLastUser(trimmed);
      setChatMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', content: trimmed },
      ]);
      setBusy(true);
      try {
        const res = await ragAPI.orchestrate({
          datasetId,
          question: trimmed,
          model: selectedModel,
          documentId: selectedDocumentId ?? undefined,
        });
        const answer =
          res?.answer?.trim() ||
          "I couldn't find that information in the indexed documents.";
        setChatMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: answer,
            citations: res?.citations || [],
            confidence: res?.confidence,
            lowConfidence: res?.lowConfidence,
          },
        ]);
      } catch {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: "I couldn't reach the RAG service to answer that.",
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [datasetId, selectedModel, selectedDocumentId, busy, setChatMessages, clearCitation],
  );

  const retry = useCallback(() => {
    if (lastUser) send(lastUser);
  }, [lastUser, send]);

  const dismissLast = useCallback(() => {
    setChatMessages((prev) => prev.slice(0, -1));
  }, [setChatMessages]);

  const handleIndex = async () => {
    setIndexing(true);
    try {
      await ragAPI.index(datasetId);
      const [s, d] = await Promise.allSettled([
        ragAPI.status(datasetId),
        ragAPI.documents(datasetId),
      ]);
      if (s.status === 'fulfilled') setRagStatus(s.value);
      if (d.status === 'fulfilled') setDocuments(d.value);
    } catch {
      // keep prior state; honest status reflects reality
    } finally {
      setIndexing(false);
    }
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    ragAPI.saveDatasetSettings(datasetId, { model }).catch(() => {});
  };

  const openCitationFromName = (fileName?: string, page?: number) => {
    if (!fileName) return;
    const doc = documents.find((d) => d.fileName === fileName);
    if (doc) {
      openCitation({ documentId: doc.id, documentName: doc.fileName, page });
    } else {
      setNotice(`"${fileName}" is not present in the current document list.`);
    }
  };

  const ready = !!ragStatus?.ready;
  const lastMessage = chatMessages[chatMessages.length - 1];

  return (
    <CollapsibleSection
      title="RAG Assistant"
      icon={<BrainCircuit className="h-4 w-4 text-emerald-600" />}
      right={
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-medium',
            ready ? 'text-emerald-600' : 'text-amber-600',
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', ready ? 'bg-emerald-500' : 'bg-amber-400')} />
          RAG: {ragStatus ? (ready ? 'READY' : 'NOT READY') : '…'}
        </span>
      }
    >
      <div className="space-y-3">
        {/* Status rail */}
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span>
            Indexed: <b className="text-gray-700">{ragStatus?.documents ?? 0}</b> docs ·{' '}
            <b className="text-gray-700">{ragStatus?.chunks ?? 0}</b> chunks
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] focus:border-emerald-500 focus:outline-none"
            >
              {models.map((m) => (
                <option key={m.key} value={m.key} disabled={!m.available}>
                  {m.key}
                  {!m.available ? ' (unavailable)' : ''}
                </option>
              ))}
              {models.length === 0 && <option value="GEMINI">GEMINI</option>}
            </select>
            <button
              onClick={handleIndex}
              disabled={indexing}
              title="Build / re-index dataset"
              className={cn(
                'flex items-center gap-1 rounded border px-1.5 py-0.5',
                indexing
                  ? 'border-gray-200 text-gray-400'
                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
              )}
            >
              {indexing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {indexing ? 'Indexing…' : 'Build index'}
            </button>
          </span>
        </div>

        {/* Selected-file scope */}
        {selectedDocumentId && selectedDocument && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-800">
            <FileText className="h-3 w-3" />
            <span className="min-w-0 flex-1 truncate">Chatting in: {selectedDocument.fileName}</span>
            <button onClick={() => setSelectedDocumentId(null)} title="Clear scope" className="rounded p-0.5 hover:bg-emerald-100">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <ChatThread messages={chatMessages} onOpenCitation={openCitationFromName} />

        {lastMessage?.role === 'assistant' && lastMessage.lowConfidence && (
          <LowConfidencePanel
            onRetry={retry}
            onDismiss={dismissLast}
            onDraft={() => {
              if (lastUser) requestAddQuestion(lastUser);
            }}
          />
        )}

        {notice && (
          <p className="rounded bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700">{notice}</p>
        )}

        <ChatComposer onSend={send} disabled={busy} />
      </div>
    </CollapsibleSection>
  );
}