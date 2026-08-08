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
import { RagDocumentInfo, RagIndexHealth } from '@/lib/api/rag';

export interface CitationFocus {
  documentId: string | null;
  documentName?: string;
  page?: number;
  rowIndex?: number;
  column?: number;
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

  const selectedDocument =
    documents.find((d) => d.id === selectedDocumentId) || null;

  const openCitation = useCallback((c: CitationFocus) => {
    setFocusedCitation(c);
    if (c.documentId) setSelectedDocumentId(c.documentId);
    if (c.page) setCurrentPage(c.page);
    setCitationPulse(Date.now());
  }, []);

  const clearCitation = useCallback(() => setFocusedCitation(null), []);

  const requestAddQuestion = useCallback(
    (text: string) => setPendingQuestion(text || null),
    [],
  );
  const clearPendingQuestion = useCallback(() => setPendingQuestion(null), []);

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