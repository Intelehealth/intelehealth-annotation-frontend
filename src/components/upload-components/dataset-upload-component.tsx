"use client";

import { cn } from "@/lib/utils";
import { CSVUploadComponent } from "./csv-upload-component";
import { ImageUploadComponent } from "./image-upload-component";
import { PdfUploadComponent } from "./pdf-upload-component";
import { UrlUploadComponent } from "./url-upload-component";
import { OfficeUploadComponent } from "./office-upload-component";
import { DocumentSourceList } from "./document-source-list";
import { useState } from "react";

interface DatasetUploadComponentProps {
  datasetId: string;
  onCSVUploaded?: (
    csvImportId: string,
    fileName: string,
    totalRows: number,
  ) => void;
  onSourceUploaded?: (document: unknown) => void;
  onDocumentCompleted?: (document: unknown) => void;
  className?: string;
}

type UploadMode =
  | "tabular"
  | "images"
  | "pdf"
  | "links"
  | "other";

const MODES: { key: UploadMode; label: string }[] = [
  { key: "tabular", label: "CSV / Excel" },
  { key: "images", label: "Images" },
  { key: "pdf", label: "PDFs" },
  { key: "links", label: "Links / URLs" },
  { key: "other", label: "Office / Other" },
];

function SourceTab({
  mode,
  setMode,
}: {
  mode: UploadMode;
  setMode: (mode: UploadMode) => void;
}) {
  return (
    <div className="flex w-full max-w-3xl flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
      {MODES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setMode(key)}
          className={cn(
            "flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
            mode === key
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function DatasetUploadComponent({
  datasetId,
  onCSVUploaded,
  onSourceUploaded,
  onDocumentCompleted,
  className,
}: DatasetUploadComponentProps) {
  const [mode, setMode] = useState<UploadMode>("tabular");
  const [sourceRefreshKey, setSourceRefreshKey] = useState(0);

  const handleSourceUploaded = (document: unknown) => {
    setSourceRefreshKey((previous) => previous + 1);
    onSourceUploaded?.(document);
  };

  const handleDocumentCompleted = (document: unknown) => {
    setSourceRefreshKey((previous) => previous + 1);
    onDocumentCompleted?.(document);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <SourceTab mode={mode} setMode={setMode} />

      {mode === "tabular" ? (
        <CSVUploadComponent
          selectedDatasetId={datasetId}
          onCSVUploaded={onCSVUploaded}
        />
      ) : (
        <>
          {mode === "images" && (
            <ImageUploadComponent
              datasetId={datasetId}
              onUploaded={handleSourceUploaded}
            />
          )}
          {mode === "pdf" && (
            <PdfUploadComponent
              datasetId={datasetId}
              onUploaded={handleSourceUploaded}
            />
          )}
          {mode === "links" && (
            <UrlUploadComponent
              datasetId={datasetId}
              onUploaded={handleSourceUploaded}
            />
          )}
          {mode === "other" && (
            <OfficeUploadComponent
              datasetId={datasetId}
              onUploaded={handleSourceUploaded}
            />
          )}
          <DocumentSourceList
            datasetId={datasetId}
            refreshKey={sourceRefreshKey}
            onDocumentCompleted={handleDocumentCompleted}
          />
        </>
      )}
    </div>
  );
}
