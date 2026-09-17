'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react';
import type { RagDocumentInfo, RagIndexHealth } from '@/lib/api/rag';
import { ragAPI } from '@/lib/api/rag';

export interface CitationFocus {
  documentId: string | null;
  documentName?: string;
  page?: number;
  rowIndex?: number;
  column?: number;
}

/** Real source-location contract for previews: drives exact page/row/sheet focus. */
export type SourceLocation =
  | { type: 'PDF'; page?: number }
  | { type: 'IMAGE'; page?: number }
  | { type: 'CSV'; row?: number; column?: number }
  | { type: 'XLSX'; sheet?: string; row?: number; column?: number }
  | { type: 'SVG' }
  | { type: 'ZIP'; path?: string };

export type CurrentDocumentType =
  | 'pdf'
  | 'image'
  | 'svg'
  | 'csv'
  | 'xls'
  | 'xlsx'
  | 'zip'
  | 'other';

/** Deterministic document type from real file name/extension. */
export function documentTypeFor(d: RagDocumentInfo | null): CurrentDocumentType {
  const f = (d?.fileName || '').toLowerCase();
  if (f.endsWith('.pdf')) return 'pdf';
  if (f.endsWith('.svg')) return 'svg';
  if (f.endsWith('.csv')) return 'csv';
  if (f.endsWith('.xls')) return 'xls';
  if (f.endsWith('.xlsx')) return 'xlsx';
  if (f.endsWith('.zip')) return 'zip';
  if (
    f.endsWith('.png') ||
    f.endsWith('.jpg') ||
    f.endsWith('.jpeg') ||
    f.endsWith('.webp') ||
    f.endsWith('.tif') ||
    f.endsWith('.tiff') ||
    f.endsWith('.bmp') ||
    (d?.mimeType || '').startsWith('image/')
  ) {
    return 'image';
  }
  return 'other';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ fileName?: string; page?: number }>;
  confidence?: number;
  lowConfidence?: boolean;
}

interface DocumentViewState {
  datasetId: string;
  documents: RagDocumentInfo[];
  setDocuments: Dispatch<SetStateAction<RagDocumentInfo[]>>;
  ragStatus: RagIndexHealth | null;
  setRagStatus: Dispatch<SetStateAction<RagIndexHealth | null>>;
  selectedDocumentId: string | null;
  setSelectedDocumentId: (id: string | null) => void;
  selectedDocument: RagDocumentInfo | null;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  focusedCitation: CitationFocus | null;
  openCitation: (c: CitationFocus) => void;
  clearCitation: () => void;
  citationPulse: number;
  selectedModel: string;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  chatMessages: ChatMessage[];
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  pendingQuestion: string | null;
  requestAddQuestion: (text: string) => void;
  clearPendingQuestion: () => void;
  // ── Phase 4: source-location + view synchronisation state ──
  currentView: string;
  setCurrentView: Dispatch<SetStateAction<string>>;
  currentDocumentType: CurrentDocumentType;
  selectedRow: number | null;
  setSelectedRow: (row: number | null) => void;
  selectedSheet: string | null;
  setSelectedSheet: (sheet: string | null) => void;
  selectedSourceLocation: SourceLocation | null;
  setSelectedSourceLocation: (loc: SourceLocation | null) => void;
  annotationQuestions: unknown[];
  setAnnotationQuestions: Dispatch<SetStateAction<unknown[]>>;
  relatedQuestions: unknown[];
  setRelatedQuestions: Dispatch<SetStateAction<unknown[]>>;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  expandedChat: boolean;
  setExpandedChat: Dispatch<SetStateAction<boolean>>;
  /** Send a real question to the orchestrator; appends real chat messages. */
  askQuestion: (text: string) => Promise<void>;
}

const Ctx = createContext<DocumentViewState | null>(null);

export function DocumentViewProvider({
  datasetId,
  children,
}: {
  datasetId: string;
  children: ReactNode;
}) {
  const [documents, setDocuments] = useState<RagDocumentInfo[]>([]);
  const [ragStatus, setRagStatus] = useState<RagIndexHealth | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [focusedCitation, setFocusedCitation] = useState<CitationFocus | null>(null);
  const [citationPulse, setCitationPulse] = useState<number>(0);
  const [selectedModel, setSelectedModel] = useState('GEMINI');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState('document');
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [selectedSourceLocation, setSelectedSourceLocation] =
    useState<SourceLocation | null>(null);
  const [annotationQuestions, setAnnotationQuestions] = useState<unknown[]>([]);
  const [relatedQuestions, setRelatedQuestions] = useState<unknown[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [expandedChat, setExpandedChat] = useState<boolean>(false);

  const selectedDocument =
    documents.find((d) => d.id === selectedDocumentId) || null;
  const currentDocumentType = documentTypeFor(selectedDocument);

  const openCitation = useCallback((c: CitationFocus) => {
    setFocusedCitation(c);
    if (c.documentId) setSelectedDocumentId(c.documentId);
    if (c.page) setCurrentPage(c.page);
    if (c.rowIndex !== undefined && c.rowIndex !== null) setSelectedRow(c.rowIndex);
    setCitationPulse(Date.now());
  }, []);

  const clearCitation = useCallback(() => setFocusedCitation(null), []);

  const requestAddQuestion = useCallback(
    (text: string) => setPendingQuestion(text || null),
    [],
  );
  const clearPendingQuestion = useCallback(() => setPendingQuestion(null), []);

  const askQuestion = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
      setChatMessages((prev) => [...prev, userMsg]);
      setExpandedChat(true);
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
      }
    },
    [datasetId, selectedModel, selectedDocumentId, setChatMessages],
  );

  return (
    <Ctx.Provider
      value={{
        datasetId,
        documents,
        setDocuments,
        ragStatus,
        setRagStatus,
        selectedDocumentId,
        setSelectedDocumentId: (id) => {
          setSelectedDocumentId(id);
          setCurrentPage(1);
        },
        selectedDocument,
        currentPage,
        setCurrentPage,
        zoom,
        setZoom,
        focusedCitation,
        openCitation,
        clearCitation,
        citationPulse,
        selectedModel,
        setSelectedModel,
        chatMessages,
        setChatMessages,
        pendingQuestion,
        requestAddQuestion,
        clearPendingQuestion,
        currentView,
        setCurrentView,
        currentDocumentType,
        selectedRow,
        setSelectedRow,
        selectedSheet,
        setSelectedSheet,
        selectedSourceLocation,
        setSelectedSourceLocation,
        annotationQuestions,
        setAnnotationQuestions,
        relatedQuestions,
        setRelatedQuestions,
        conversationId,
        setConversationId,
        expandedChat,
        setExpandedChat,
        askQuestion,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useDocumentView(): DocumentViewState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDocumentView must be used within DocumentViewProvider');
  return v;
}