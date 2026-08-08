import api from "@/lib/api";

export type ProcessingProfile = "GENERIC_DOCUMENT" | "INVOICE";

/** Upload category scope, mirrored by the backend (csv-excel | images | pdf | links | office | generic). */
export type UploadCategory =
  | "csv-excel"
  | "images"
  | "pdf"
  | "links"
  | "office"
  | "generic";

/** Job/existence statuses surfaced by the backend. */
export type ProcessingStatus =
  | "CREATED"
  | "QUEUED"
  | "PREPROCESSING"
  | "PROCESSING"
  | "COMPLETED"
  | "NEEDS_REVIEW"
  | "FAILED"
  | "BLOCKED"
  | "CANCELLED";

export interface ProcessingJob {
  jobId: string;
  status: ProcessingStatus;
  progress: number;
  queuedAt?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  errorMessage?: string;
}

/** Response of POST /processing/upload/:datasetId (HTTP 202). */
export interface UploadResponse extends DocumentAssetResponse {
  documentId: string;
  jobId: string;
  status: ProcessingStatus;
}

export interface DocumentAssetResponse {
  _id: string;
  datasetId: string;
  sourceType: string;
  fileType: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  pageCount?: number;
  processingProfile: ProcessingProfile;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingCapabilities {
  sourceTypes: string[];
  supportedLocalFileTypes: string[];
  sourceOrigins: string[];
  processingProfiles: ProcessingProfile[];
  splitStrategies: string[];
  rowStorageModes: string[];
}

export interface WorkerStatus {
  available: boolean;
  queue: string;
  worker: "online" | "offline";
  redis: "connected" | "disconnected";
}

export interface RowSourceResponse {
  hasSource: boolean;
  rowIndex: number;
  documentId: string | null;
  fileName?: string;
  mimeType?: string;
  sourceType?: string;
  processingStatus?: string;
  pageCount?: number;
  sourceUrl?: string;
  fileSize?: number;
  checksum?: string;
  metadata?: Record<string, any>;
  message?: string;
}

export interface ProcessingEvent {
  documentId: string;
  status: string;
  stage: string;
  progress?: number;
  message?: string;
  timestamp?: string;
}

export const processingAPI = {
  async getCapabilities(): Promise<ProcessingCapabilities> {
    const response = await api.get("/processing/capabilities");
    return response.data;
  },

  async processDocument(documentId: string): Promise<any> {
    const response = await api.post(`/processing/document/${documentId}/process`);
    return response.data;
  },

  async getWorkerStatus(): Promise<WorkerStatus> {
    const response = await api.get(`/processing/worker/status`, {
      timeout: 8000,
    });
    return response.data;
  },

  /** Truthful MongoDB-backed processor status (new document-processors queue). */
  async getProcessorStatus(): Promise<{
    available: boolean;
    worker: "online" | "offline";
    queue: string;
    redis: "n/a";
    backlog: number;
  }> {
    const response = await api.get(`/document-processing/processor/status`, {
      timeout: 8000,
    });
    return response.data;
  },

  async uploadFile(
    datasetId: string,
    file: File,
    processingProfile: ProcessingProfile = "GENERIC_DOCUMENT",
    category?: UploadCategory,
    signal?: AbortSignal,
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("processingProfile", processingProfile);
    if (category) {
      formData.append("category", category);
    }

    // Same-origin upload: resolve against the Next server (:3000) so `next.config.ts`
    // `/processing` rewrite forwards it to the backend. Avoids cross-origin
    // multipart uploads that browser extensions/security software may block.
    const response = await api.post(
      `/processing/upload/${datasetId}`,
      formData,
      {
        baseURL: "",
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
        signal,
      },
    );
    return response.data;
  },

  async uploadUrl(
    datasetId: string,
    url: string,
    processingProfile: ProcessingProfile = "GENERIC_DOCUMENT",
    category?: UploadCategory,
    signal?: AbortSignal,
  ): Promise<UploadResponse> {
    const response = await api.post(
      `/processing/url/${datasetId}`,
      { url, processingProfile, category },
      { baseURL: "", timeout: 60000, signal },
    );
    return response.data;
  },

  async listDocuments(datasetId: string): Promise<DocumentAssetResponse[]> {
    const response = await api.get(
      `/processing/dataset/${datasetId}/documents`,
    );
    return response.data;
  },

  async getDocumentStatus(documentId: string): Promise<{
    documentId: string;
    status: string;
    pageCount?: number;
    fileType: string;
  }> {
    const response = await api.get(`/processing/document/${documentId}/status`);
    return response.data;
  },

  async getDocumentContent(documentId: string): Promise<Blob> {
    const response = await api.get(
      `/processing/document/${documentId}/content`,
      { responseType: "blob" },
    );
    return response.data;
  },

  async getRowSource(
    datasetId: string,
    rowIndex: number,
  ): Promise<RowSourceResponse> {
    const response = await api.get(
      `/processing/dataset/${datasetId}/row/${rowIndex}/source`,
    );
    return response.data;
  },

  async subscribeToProcessingEvents(
    documentId: string,
    onEvent: (event: ProcessingEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const token = localStorage.getItem("accessToken");
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const response = await fetch(
      `${baseUrl}/processing/document/${documentId}/events`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal,
      },
    );

    if (!response.ok || !response.body) {
      throw new Error(`Processing event stream failed with ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const eventBlock of events) {
        const dataLine = eventBlock
          .split("\n")
          .find((line) => line.startsWith("data:"));
        if (!dataLine) continue;

        try {
          onEvent(JSON.parse(dataLine.slice(5).trim()) as ProcessingEvent);
        } catch {
          // Ignore heartbeat or malformed event payloads.
        }
      }
    }
  },
};
