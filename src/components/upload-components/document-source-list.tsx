"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileImage,
  FileText,
  Eye,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentAssetResponse, processingAPI } from "@/lib/api/processing";
import { cn } from "@/lib/utils";
import { DocumentSourcePreview } from "./document-source-preview";

interface DocumentSourceListProps {
  datasetId: string;
  refreshKey?: number;
  /** Called once per document when it first reaches COMPLETED. */
  onDocumentCompleted?: (document: DocumentAssetResponse) => void;
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusStyles(status: string): {
  label: string;
  className: string;
  icon: typeof Clock3;
} {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        className: "bg-green-50 text-green-700 border-green-200",
        icon: CheckCircle2,
      };
    case "FAILED":
      return {
        label: "Failed",
        className: "bg-red-50 text-red-700 border-red-200",
        icon: AlertCircle,
      };
    case "PROCESSING":
    case "PREPROCESSING":
      return {
        label: "Processing",
        className: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Loader2,
      };
    case "QUEUED":
      return {
        label: "Queued",
        className: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Clock3,
      };
    case "NEEDS_REVIEW":
      return {
        label: "Needs review",
        className: "bg-purple-50 text-purple-700 border-purple-200",
        icon: AlertCircle,
      };
    default:
      return {
        label: "Uploaded",
        className: "bg-gray-50 text-gray-700 border-gray-200",
        icon: Clock3,
      };
  }
}

function isImageFile(document: DocumentAssetResponse): boolean {
  return (
    document.mimeType.startsWith("image/") ||
    ["PNG", "JPG", "JPEG", "TIFF", "BMP", "WEBP"].includes(document.fileType)
  );
}

export function DocumentSourceList({
  datasetId,
  refreshKey = 0,
  onDocumentCompleted,
}: DocumentSourceListProps) {
  const [documents, setDocuments] = useState<DocumentAssetResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentAssetResponse | null>(null);
  const firedCompleted = useRef<Set<string>>(new Set());

  const loadDocuments = useCallback(
    async (showLoading = true) => {
      if (!datasetId) return;
      if (showLoading) setIsLoading(true);
      setIsRefreshing(true);
      setError(null);

      try {
        setDocuments(await processingAPI.listDocuments(datasetId));
      } catch {
        setError("Unable to load document sources.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [datasetId],
  );

  // Fire onDocumentCompleted once per document that reaches COMPLETED.
  useEffect(() => {
    if (!onDocumentCompleted) return;
    for (const document of documents) {
      const id = String(document._id || "");
      if (id && document.status === "COMPLETED" && !firedCompleted.current.has(id)) {
        firedCompleted.current.add(id);
        onDocumentCompleted(document);
      }
    }
  }, [documents, onDocumentCompleted]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments, refreshKey]);

  useEffect(() => {
    const hasActiveProcessing = documents.some((document) =>
      ["QUEUED", "PREPROCESSING", "PROCESSING"].includes(document.status),
    );
    if (!hasActiveProcessing) return;

    const timer = window.setInterval(() => {
      void loadDocuments(false);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [documents, loadDocuments]);

  useEffect(() => {
    const activeDocuments = documents.filter((document) =>
      ["QUEUED", "PREPROCESSING", "PROCESSING"].includes(document.status),
    );
    if (activeDocuments.length === 0) return;

    const controller = new AbortController();
    for (const document of activeDocuments) {
      void processingAPI
        .subscribeToProcessingEvents(
          document._id,
          () => void loadDocuments(false),
          controller.signal,
        )
        .catch(() => {
          // Polling remains the fallback when SSE is unavailable.
        });
    }

    return () => controller.abort();
  }, [documents, loadDocuments]);

  const handleRefresh = () => {
    void loadDocuments(false);
  };

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Document sources
          </h2>
          <p className="text-xs text-gray-500">
            Uploaded files and direct URL sources for this dataset.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading document sources...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm font-medium text-gray-700">
            No document sources yet
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Add a local PDF/image or a direct URL above to begin processing.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((document) => {
            const status = statusStyles(document.status);
            const StatusIcon = status.icon;

            return (
              <div
                key={document._id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 px-3 py-3"
              >
                {isImageFile(document) ? (
                  <FileImage className="h-5 w-5 shrink-0 text-purple-500" />
                ) : (
                  <FileText className="h-5 w-5 shrink-0 text-red-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {document.originalFileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {document.fileType} • {formatFileSize(document.fileSize)} •{" "}
                    {formatDate(document.createdAt)}
                  </p>
                  {["FAILED", "NEEDS_REVIEW"].includes(document.status) && (
                    <p className="text-xs text-red-600/90 mt-0.5">
                      {document.status === "NEEDS_REVIEW"
                        ? "Extraction is uncertain and needs review."
                        : "Extraction failed."}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium",
                    status.className,
                  )}
                >
                  <StatusIcon
                    className={cn(
                      "h-3.5 w-3.5",
                      document.status === "PROCESSING" && "animate-spin",
                    )}
                  />
                  {status.label}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  {document.processingProfile === "INVOICE"
                    ? "Invoice"
                    : "Generic"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDocument(document)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <DocumentSourcePreview
        document={selectedDocument}
        open={Boolean(selectedDocument)}
        onOpenChange={(open) => {
          if (!open) setSelectedDocument(null);
        }}
      />
    </section>
  );
}
