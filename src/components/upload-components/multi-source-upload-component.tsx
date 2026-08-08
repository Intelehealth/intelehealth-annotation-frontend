"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  FileImage,
  FileText,
  Link as LinkIcon,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { processingAPI, ProcessingProfile, UploadCategory } from "@/lib/api/processing";
import api from "@/lib/api";
import { getUploadErrorMessage } from "@/lib/upload-errors";

const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".tif",
  ".tiff",
  ".bmp",
  ".webp",
  ".docx",
  ".doc",
  ".odt",
  ".odp",
  ".svg",
  ".xls",
  ".xlsx",
  ".csv",
  ".pptx",
  ".zip",
];

type UploadState = "pending" | "uploading" | "success" | "error";

interface UploadItem {
  file: File;
  state: UploadState;
  message?: string;
}

interface MultiSourceUploadComponentProps {
  datasetId: string;
  onUploaded?: (document: unknown) => void;
  className?: string;
  acceptedExtensions?: string[];
  dropLabel?: string;
  allowUrl?: boolean;
  urlOnly?: boolean;
  category?: UploadCategory;
}

const DEFAULT_DROP_LABEL = "Drop documents here or browse files";

function isAcceptedFile(file: File, extensions: string[]): boolean {
  const lowerName = file.name.toLowerCase();
  return extensions.some((extension) => lowerName.endsWith(extension));
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function MultiSourceUploadComponent({
  datasetId,
  onUploaded,
  className,
  acceptedExtensions = ACCEPTED_EXTENSIONS,
  dropLabel = DEFAULT_DROP_LABEL,
  allowUrl = true,
  urlOnly = false,
  category = "generic",
}: MultiSourceUploadComponentProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [sourceMode, setSourceMode] = useState<"file" | "url">(
    urlOnly ? "url" : "file",
  );
  const [sourceUrl, setSourceUrl] = useState("");
  const [processingProfile, setProcessingProfile] =
    useState<ProcessingProfile>("GENERIC_DOCUMENT");
  const [isUploading, setIsUploading] = useState(false);
  const [isUrlUploading, setIsUrlUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"checking" | "ok" | "error">("checking");
  const [workerStatus, setWorkerStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");

  useEffect(() => {
    const checkBackend = async () => {
      try {
        await api.get("/", { timeout: 5000 });
        setBackendStatus("ok");
      } catch {
        setBackendStatus("error");
      }
    };
    checkBackend();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkWorker = async () => {
      try {
        // Truthful MongoDB-backed processor status (no fake "connected").
        const status = await processingAPI.getProcessorStatus();
        if (cancelled) return;
        setWorkerStatus(status.available ? "online" : "offline");
      } catch {
        if (!cancelled) setWorkerStatus("offline");
      }
    };
    checkWorker();
    const timer = window.setInterval(checkWorker, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const hasPendingFiles = useMemo(
    () => items.some((item) => item.state === "pending"),
    [items],
  );

  const addFiles = (files: File[]) => {
    const accepted: UploadItem[] = [];
    const rejected: string[] = [];

    for (const file of files) {
      if (isAcceptedFile(file, acceptedExtensions)) {
        accepted.push({ file, state: "pending" });
      } else {
        rejected.push(file.name);
      }
    }

    if (rejected.length > 0) {
      showToast({
        type: "error",
        title: "Unsupported file type",
        description: `${rejected.join(", ")}. Supported: ${acceptedExtensions.join(", ")}.`,
      });
    }

    if (accepted.length > 0) {
      setItems((previous) => [...previous, ...accepted]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files || []));
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const removeItem = (index: number) => {
    if (isUploading) return;
    setItems((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const uploadFiles = async () => {
    if (!datasetId || !hasPendingFiles || isUploading) return;

    setIsUploading(true);
    const pendingIndexes = items
      .map((item, index) => (item.state === "pending" ? index : -1))
      .filter((index) => index >= 0);

    for (const index of pendingIndexes) {
      const item = items[index];
      setItems((previous) =>
        previous.map((current, currentIndex) =>
          currentIndex === index ? { ...current, state: "uploading" } : current,
        ),
      );

      try {
        const document = await processingAPI.uploadFile(
          datasetId,
          item.file,
          processingProfile,
          category,
        );
        setItems((previous) =>
          previous.map((current, currentIndex) =>
            currentIndex === index
              ? { ...current, state: "success", message: document.status }
              : current,
          ),
        );
        onUploaded?.(document);

        // Processing is auto-enqueued by the upload endpoint (202 +
        // jobId). No manual processDocument trigger is needed — doing so here
        // would create a duplicate job.
      } catch (error: unknown) {
        setItems((previous) =>
          previous.map((current, currentIndex) =>
            currentIndex === index
              ? {
                  ...current,
                  state: "error",
                  message: getUploadErrorMessage(error, "Upload failed"),
                }
              : current,
          ),
        );
      }
    }

    setIsUploading(false);
  };

  const uploadUrl = async () => {
    const trimmedUrl = sourceUrl.trim();
    if (!trimmedUrl || isUrlUploading) return;

    setIsUrlUploading(true);
    try {
      const document = await processingAPI.uploadUrl(
        datasetId,
        trimmedUrl,
        processingProfile,
        category,
      );
      setSourceUrl("");
      onUploaded?.(document);
      showToast({
        type: "success",
        title: "Source added",
        description:
          "The remote document was stored and is ready for processing.",
      });
    } catch (error: unknown) {
      showToast({
        type: "error",
        title: "Unable to add source",
        description: getUploadErrorMessage(error, "The URL could not be imported."),
      });
    } finally {
      setIsUrlUploading(false);
    }
  };

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {!urlOnly && (
          <button
            type="button"
            onClick={() => setSourceMode("file")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              sourceMode === "file"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100",
            )}
          >
            <CloudUpload className="h-4 w-4" />
            Local files
          </button>
        )}
        {allowUrl && (
          <button
            type="button"
            onClick={() => setSourceMode("url")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              sourceMode === "url"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100",
            )}
          >
            <LinkIcon className="h-4 w-4" />
            Direct URL
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          Drive and cloud adapters are coming later
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <div>
          <Label htmlFor="processing-profile">Processing profile</Label>
          <select
            id="processing-profile"
            value={processingProfile}
            onChange={(event) =>
              setProcessingProfile(event.target.value as ProcessingProfile)
            }
            className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="GENERIC_DOCUMENT">Generic document</option>
            <option value="INVOICE">Invoice</option>
          </select>
        </div>
        {workerStatus === "online" && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Worker connected — uploaded documents will be processed automatically.
          </div>
        )}
        {workerStatus === "offline" && (
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
            Processing worker is unavailable. Uploads can be queued but processing will resume when the worker is available.
          </div>
        )}
        {workerStatus === "checking" && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600 flex items-center gap-2">
            Checking processing worker…
          </div>
        )}
      </div>

      {backendStatus === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Backend server unreachable. Make sure the API server is running at {process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}.
        </div>
      )}

      {sourceMode === "file" ? (
        <>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
              isDragOver
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50",
            )}
          >
            <CloudUpload className="mx-auto h-10 w-10 text-blue-500" />
            <p className="mt-3 text-sm font-semibold text-gray-800">
              {dropLabel}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {acceptedExtensions.join(", ").toUpperCase()}
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={acceptedExtensions.join(",").toLowerCase()}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={`${item.file.name}-${index}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                >
                  {item.file.type.startsWith("image/") ? (
                    <FileImage className="h-5 w-5 text-purple-500" />
                  ) : (
                    <FileText className="h-5 w-5 text-red-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(item.file.size)}
                      {item.message ? ` • ${item.message}` : ""}
                    </p>
                  </div>
                  {item.state === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  )}
                  {item.state === "success" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {item.state === "error" && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  {item.state === "pending" && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            onClick={uploadFiles}
            disabled={!hasPendingFiles || isUploading || backendStatus === "error"}
            className="w-full sm:w-auto"
            title={backendStatus === "error" ? "Backend server is not reachable" : ""}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="mr-2 h-4 w-4" />
            )}
            {isUploading ? "Uploading..." : "Add selected sources"}
          </Button>
        </>
      ) : (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div>
            <Label htmlFor="source-url">Direct document URL</Label>
            <Input
              id="source-url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://example.com/document.pdf"
              className="mt-1 bg-white"
            />
          </div>
          <p className="text-xs text-gray-500">
            Only direct PDF and image URLs are supported in this milestone.
            Private network URLs are blocked by the backend.
          </p>
          <Button
            type="button"
            onClick={uploadUrl}
            disabled={!sourceUrl.trim() || isUrlUploading}
          >
            {isUrlUploading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Add URL source
          </Button>
        </div>
      )}
    </div>
  );
}
