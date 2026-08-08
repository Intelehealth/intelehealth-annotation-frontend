"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Download, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentAssetResponse, processingAPI } from "@/lib/api/processing";

interface DocumentSourcePreviewProps {
  document: DocumentAssetResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isPdfMime(mime: string): boolean {
  return (
    mime === "application/pdf" ||
    mime.startsWith("application/pdf")
  );
}

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

function isCsvMime(mime: string): boolean {
  return mime === "text/csv" || mime === "application/csv";
}

function isOfficeMime(mime: string): boolean {
  return (
    mime.includes("wordprocessingml") ||
    mime.includes("presentationml") ||
    mime === "application/msword" ||
    mime === "application/vnd.ms-powerpoint" ||
    mime === "application/vnd.oasis.opendocument.text" ||
    mime === "application/vnd.oasis.opendocument.presentation" ||
    mime === "application/vnd.ms-excel" ||
    mime.includes("spreadsheetml")
  );
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (ch === "\n") {
        currentRow.push(currentField);
        if (currentRow.some((f) => f.trim() !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else if (ch === "\r") {
        // skip
      } else {
        currentField += ch;
      }
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim() !== "")) {
      rows.push(currentRow);
    }
  }
  return rows;
}

function CsvPreview({ text }: { text: string }) {
  const rows = parseCsv(text);
  const header = rows.length > 0 ? rows[0] : [];
  const data = rows.slice(1, 51);
  const truncated = rows.length - 1 > data.length;
  return (
    <div className="h-full w-full overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gray-100">
            {header.map((col, i) => (
              <th
                key={i}
                className="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri} className="even:bg-gray-50 hover:bg-blue-50">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border border-gray-200 px-2 py-1 text-gray-700 max-w-xs truncate"
                  title={cell}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {truncated && (
        <p className="px-2 py-2 text-xs text-gray-500">
          Showing first {data.length} of {rows.length - 1} rows — download the
          original for the full file.
        </p>
      )}
    </div>
  );
}

export function DocumentSourcePreview({
  document,
  open,
  onOpenChange,
}: DocumentSourcePreviewProps) {
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [csvText, setCsvText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    if (!open || !document) {
      setContentUrl(null);
      setCsvText(null);
      setMimeType("");
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setCsvText(null);
    processingAPI
      .getDocumentContent(document._id)
      .then(async (blob) => {
        const detectedMime = blob.type || "";
        objectUrl = URL.createObjectURL(blob);
        setMimeType(detectedMime);
        setContentUrl(objectUrl);
        if (isCsvMime(detectedMime)) {
          setCsvText(await blob.text());
        }
      })
      .catch(() => {
        setError("The protected document content could not be loaded.");
      })
      .finally(() => setIsLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document, open]);

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading protected content...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      );
    }

    // CSV inline table
    if (isCsvMime(mimeType) && csvText !== null) {
      return <CsvPreview text={csvText} />;
    }

    // PDF
    if (isPdfMime(mimeType) && contentUrl) {
      return (
        <iframe
          title={document?.originalFileName || "PDF preview"}
          src={contentUrl}
          className="h-full w-full rounded border border-gray-200 bg-white"
        />
      );
    }

    // Images (including SVG)
    if (isImageMime(mimeType) && contentUrl) {
      return (
        <img
          src={contentUrl}
          alt={document?.originalFileName || "Document preview"}
          className="max-h-full max-w-full object-contain"
        />
      );
    }

    // Office / spreadsheets / other: download link
    if (contentUrl) {
      return (
        <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
          <FileText className="h-12 w-12 text-gray-300" />
          <p>
            {isOfficeMime(mimeType) || isCsvMime(mimeType)
              ? "Inline preview not available for this type."
              : "Preview not available for this file type."}
          </p>
          <a
            href={contentUrl}
            download
            className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Download original file
          </a>
        </div>
      );
    }

    return <p className="text-sm text-gray-500">No preview available.</p>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-6xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">
            {document?.originalFileName || "Document preview"}
          </DialogTitle>
          <DialogDescription>
            Protected source preview. Annotation and extraction review will be
            added in later milestones.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-gray-100 p-2">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
