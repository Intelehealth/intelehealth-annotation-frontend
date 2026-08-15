'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BrainCircuit,
  RefreshCw,
  Loader2,
  FileText,
  X,
  Cloud,
  HardDrive,
} from 'lucide-react';
import {
  ragAPI,
  RagEmbeddingCatalog,
  RagEmbeddingProvider,
  RagPresetInfo,
} from '@/lib/api/rag';
import { useDocumentView } from '../context/document-view-context';
import { CollapsibleSection } from '../layout/collapsible-section';
import { ChatThread } from './chat-thread';
import { ChatComposer } from './chat-composer';
import { LowConfidencePanel } from './low-confidence-panel';
import { cn } from '@/lib/utils';

function apiErrorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { data?: { message?: string } } })
    ?.response;
  return response?.data?.message || fallback;
}

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
    expandedChat,
    setExpandedChat,
  } = useDocumentView();

  const [models, setModels] = useState<RagPresetInfo[]>([]);
  const [embeddingCatalog, setEmbeddingCatalog] =
    useState<RagEmbeddingCatalog | null>(null);
  const [embedProvider, setEmbedProvider] =
    useState<RagEmbeddingProvider>('local');
  const [embedModel, setEmbedModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [savingEmbedding, setSavingEmbedding] = useState(false);
  const [lastUser, setLastUser] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const providerInfo = embeddingCatalog?.providers.find(
    (provider) => provider.key === embedProvider,
  );
  const embeddingReady = Boolean(providerInfo?.available && embedModel);

  const loadStatus = useCallback(async () => {
    try {
      setRagStatus(await ragAPI.status(datasetId));
    } catch {
      setRagStatus(null);
    }
  }, [datasetId, setRagStatus]);

  useEffect(() => {
    Promise.allSettled([
      ragAPI.status(datasetId),
      ragAPI.embeddingProviders(),
    ]).then(([statusResult, catalogResult]) => {
      const status =
        statusResult.status === 'fulfilled' ? statusResult.value : null;
      const catalog =
        catalogResult.status === 'fulfilled' ? catalogResult.value : null;
      setRagStatus(status);
      setEmbeddingCatalog(catalog);
      if (catalog) {
        const provider =
          status?.configuredEmbeddingProvider || catalog.defaultProvider;
        const providerDetails = catalog.providers.find(
          (item) => item.key === provider,
        );
        const configuredModel = status?.configuredEmbeddingModel || '';
        const model =
          providerDetails?.models.find((item) => item.id === configuredModel)?.id ||
          configuredModel ||
          providerDetails?.models[0]?.id ||
          '';
        setEmbedProvider(provider);
        setEmbedModel(model);
      }
    });
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
  }, [datasetId, setRagStatus, setSelectedModel, setChatMessages]);

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

  async function handleIndex() {
    if (!embeddingReady) {
      setNotice(
        providerInfo?.message ||
          'Select an available embedding provider and model before building the index.',
      );
      return;
    }
    setNotice(null);
    setIndexing(true);
    try {
      await ragAPI.index(datasetId);
      const [s, d] = await Promise.allSettled([
        ragAPI.status(datasetId),
        ragAPI.documents(datasetId),
      ]);
      if (s.status === 'fulfilled') setRagStatus(s.value);
      if (d.status === 'fulfilled') setDocuments(d.value);
    } catch (error) {
      setNotice(apiErrorMessage(error, 'The index build failed. Check the embedding service.'));
    } finally {
      setIndexing(false);
    }
  }

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    ragAPI.saveDatasetSettings(datasetId, { model }).catch(() => {});
  };

  const handleEmbeddingProviderChange = async (
    provider: RagEmbeddingProvider,
  ) => {
    const nextProvider = embeddingCatalog?.providers.find(
      (item) => item.key === provider,
    );
    const nextModel = nextProvider?.models[0]?.id || '';
    setEmbedProvider(provider);
    setEmbedModel(nextModel);
    setNotice(null);
    setSavingEmbedding(true);
    try {
      await ragAPI.saveDatasetSettings(datasetId, {
        embedProvider: provider,
        ...(nextModel ? { embedModel: nextModel } : {}),
      });
      await loadStatus();
    } catch (error) {
      setNotice(apiErrorMessage(error, 'Could not save the embedding provider.'));
    } finally {
      setSavingEmbedding(false);
    }
  };

  const handleEmbeddingModelChange = async (model: string) => {
    setEmbedModel(model);
    setNotice(null);
    setSavingEmbedding(true);
    try {
      await ragAPI.saveDatasetSettings(datasetId, {
        embedProvider,
        embedModel: model,
      });
      await loadStatus();
    } catch (error) {
      setNotice(apiErrorMessage(error, 'Could not save the embedding model.'));
    } finally {
      setSavingEmbedding(false);
    }
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
  const ragLabel = ready
    ? 'READY'
    : ragStatus?.stale
      ? 'REBUILD REQUIRED'
      : 'NOT READY';
  const lastMessage = chatMessages[chatMessages.length - 1];

  return (
    <CollapsibleSection
      title="RAG Assistant"
      icon={<BrainCircuit className="h-4 w-4 text-blue-600" />}
      open={expandedChat}
      onOpenChange={setExpandedChat}
      right={
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-medium',
            ready ? 'text-blue-600' : 'text-amber-600',
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', ready ? 'bg-blue-500' : 'bg-amber-400')} />
          RAG: {ragStatus ? ragLabel : '…'}
        </span>
      }
    >
      <div className="space-y-3">
        {/* Index configuration rail */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-[11px]">
          <div className="flex flex-wrap items-center gap-2 text-slate-500">
            <span>
              Indexed: <b className="text-slate-700">{ragStatus?.documents ?? 0}</b> docs ·{' '}
              <b className="text-slate-700">{ragStatus?.chunks ?? 0}</b> chunks
            </span>
            <button
              type="button"
              onClick={handleIndex}
              disabled={indexing || savingEmbedding || !embeddingReady}
              title={
                embeddingReady
                  ? 'Build or rebuild this dataset index'
                  : providerInfo?.message || 'Choose an available embedding model'
              }
              className={cn(
                'ml-auto flex items-center gap-1 rounded-md border px-2 py-1 font-medium transition-colors',
                indexing || savingEmbedding || !embeddingReady
                  ? 'cursor-not-allowed border-slate-200 bg-white text-slate-400'
                  : 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50',
              )}
            >
              {indexing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {indexing
                ? 'Indexing…'
                : ragStatus?.chunks
                  ? 'Rebuild index'
                  : 'Build index'}
            </button>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-[auto_minmax(180px,1fr)_minmax(130px,0.65fr)]">
            <div>
              <span className="mb-1 block font-medium text-slate-600">Embedding source</span>
              <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                {(embeddingCatalog?.providers || []).map((provider) => {
                  const Icon = provider.key === 'local' ? HardDrive : Cloud;
                  return (
                    <button
                      key={provider.key}
                      type="button"
                      onClick={() => handleEmbeddingProviderChange(provider.key)}
                      disabled={savingEmbedding}
                      aria-pressed={embedProvider === provider.key}
                      className={cn(
                        'flex items-center gap-1 rounded px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                        embedProvider === provider.key
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100',
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {provider.key === 'local' ? 'Local' : 'OpenRouter'}
                    </button>
                  );
                })}
                {!embeddingCatalog && (
                  <span className="px-2 py-1 text-slate-400">Loading…</span>
                )}
              </div>
            </div>

            <label className="min-w-0">
              <span className="mb-1 block font-medium text-slate-600">Embedding model</span>
              <select
                value={embedModel}
                onChange={(event) => handleEmbeddingModelChange(event.target.value)}
                disabled={savingEmbedding || !providerInfo?.models.length}
                className="h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:text-slate-400"
              >
                {providerInfo?.models.map((model) => (
                  <option key={model.id} value={model.id} disabled={model.loaded === false}>
                    {model.label}
                    {model.loaded === false ? ' (not loaded)' : ''}
                  </option>
                ))}
                {!providerInfo?.models.length && (
                  <option value="">No embedding models configured</option>
                )}
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block font-medium text-slate-600">Answer model</span>
              <select
                value={selectedModel}
                onChange={(event) => handleModelChange(event.target.value)}
                className="h-7 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {models.map((model) => (
                  <option key={model.key} value={model.key} disabled={!model.available}>
                    {model.key}
                    {!model.available ? ' (unavailable)' : ''}
                  </option>
                ))}
                {models.length === 0 && (
                  <option value="" disabled>
                    No answer models available
                  </option>
                )}
              </select>
            </label>
          </div>

          <p
            className={cn(
              'mt-2 flex items-center gap-1.5',
              providerInfo?.available ? 'text-emerald-700' : 'text-amber-700',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                providerInfo?.available ? 'bg-emerald-500' : 'bg-amber-400',
              )}
            />
            {providerInfo?.available
              ? `${providerInfo.label} is ready${embedModel ? ` · ${embedModel}` : ''}`
              : providerInfo?.message || 'Checking embedding service…'}
          </p>
        </div>

        {/* Selected-file scope */}
        {selectedDocumentId && selectedDocument && (
          <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-[11px] text-blue-800">
            <FileText className="h-3 w-3" />
            <span className="min-w-0 flex-1 truncate">Chatting in: {selectedDocument.fileName}</span>
            <button onClick={() => setSelectedDocumentId(null)} title="Clear scope" className="rounded p-0.5 hover:bg-blue-100">
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
