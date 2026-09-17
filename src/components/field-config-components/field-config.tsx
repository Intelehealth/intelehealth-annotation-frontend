"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fieldSelectionAPI } from "@/lib/api/field-config";
import { datasetsAPI } from "@/lib/api/datasets";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Database,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CSVColumnsDisplay } from "./csv-columns-display";
import { MergeColumns } from "./merge-columns";
import { GroupFieldEditor } from "./group-field-editor";
import { useToast } from "@/components/ui/toast";
import type { GroupChildField } from "@/types/feature1";
import { FieldGroup, VisibilityRule, BranchOption } from "@/types/feature1";
import { FieldGroupEditor } from "./field-group-editor";
import { RecursiveFieldEditor } from "./recursive-field-editor";
import { LivePreviewTree } from "./live-preview-tree";
import { FieldTypeConfigurator } from "./field-type-configurator";
import {
  DecisionCardEngine,
  parseOptions,
} from "@/components/new-column-components/new-column-data-panel";
import { ConditionalFieldRenderer } from "@/components/new-column-components/conditional-field-renderer";
import { schemaRequestsAPI } from "@/lib/api/schema-requests";

function FieldLivePreview({ field }: { field: AnnotationField }) {
  const [value, setValue] = useState<string>("");

  // Sync value if field changes or reset selection
  useEffect(() => {
    setValue("");
  }, [field.id, field.columnType]);

  const richOptions = useMemo(() => {
    return parseOptions(field.options || []);
  }, [field.options]);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
          <span>PREVIEW FIELD</span>
          {field.questionTitle && (
            <>
              <span>·</span>
              <span>{field.questionTitle}</span>
            </>
          )}
        </div>
        {field.questionDescription && (
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            {field.questionDescription}
          </p>
        )}
        {field.helpText && (
          <p className="text-[11px] text-teal-700/80 italic mt-0.5">
            Context: {field.helpText}
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-gray-100">
        {field.branching?.enabled ? (
          <ConditionalFieldRenderer
            field={field}
            formData={{ [field.fieldName]: value }}
            onChange={(data) => setValue(data[field.fieldName] || "")}
          />
        ) : (
          <DecisionCardEngine
            field={field}
            options={richOptions}
            value={value}
            onChange={(val) => setValue(val)}
          />
        )}
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-mono select-none">
        <span>STORED VALUE:</span>
        <span
          className={cn(
            "font-bold px-2 py-0.5 rounded border",
            value
              ? "bg-teal-50 text-teal-700 border-teal-200"
              : "bg-gray-50 text-gray-400 border-gray-200",
          )}
        >
          {value ? JSON.stringify(value) : '"" (empty)'}
        </span>
      </div>
    </div>
  );
}

interface NewColumn {
  id: string;
  columnName: string; // e.g., "Review Notes", "Quality Score"
  columnType:
    | "text"
    | "number"
    | "select"
    | "selectrange"
    | "textarea"
    | "rating"
    | "multiselect"
    | "checkbox"
    | "radio"
    | "date"
    | "url"
    | "group";
  isRequired: boolean;
  defaultValue?: string;
  options?: string[]; // For select type
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  rangeStart?: number;
  rangeEnd?: number;
  rangeStep?: number;
  maxSelections?: number;
  minDate?: string;
  maxDate?: string;
  maxRating?: number;
  allowHalf?: boolean;
  rows?: number;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  branching?: any;
  groupChildren?: GroupChildField[];
  /** Image source and per-image caption settings — see MediaSourceConfig. */
  imageFormat?: "url" | "base64" | "binary";
  imageMultiple?: boolean;
  imageDelimiter?: string;
  imageMimeType?: string;
  captionEnabled?: boolean;
  captionLabel?: string;
  captionType?: "text" | "textarea" | "number" | "select" | "radio" | "multiselect";
  captionOptions?: string[];
  captionRequired?: boolean;
  captionFields?: GroupChildField[];
}

interface AnnotationField {
  id: string;
  csvColumnName: string;
  fieldName: string;
  fieldType:
    | "text"
    | "number"
    | "select"
    | "selectrange"
    | "textarea"
    | "rating"
    | "multiselect"
    | "checkbox"
    | "radio"
    | "date"
    | "url"
    | "image"
    | "audio"
    | "video";
  isRequired: boolean;
  // true if it needs annotation (shown on right), false if metadata (left)
  isAnnotationField: boolean;
  // exactly one field across config can be the primary key
  isPrimaryKey?: boolean;
  options?: string[];
  isNewColumn?: boolean; // true if this is a new column, not from CSV
  newColumnId?: string; // Reference to NewColumn if isNewColumn is true
  columnType?:
    | "text"
    | "number"
    | "select"
    | "selectrange"
    | "textarea"
    | "rating"
    | "multiselect"
    | "checkbox"
    | "radio"
    | "date"
    | "url"
    | "group";
  /** Children of a composite field — see GroupChildField. */
  groupChildren?: GroupChildField[];
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  rangeStart?: number;
  rangeEnd?: number;
  rangeStep?: number;
  maxSelections?: number;
  minDate?: string;
  maxDate?: string;
  maxRating?: number;
  allowHalf?: boolean;
  rows?: number;

  // NEW Metadata properties
  questionTitle?: string;
  questionDescription?: string;
  helpText?: string;
  section?: string;
  visibilityRule?: VisibilityRule;
  branching?: any;
  /** Image source and per-image caption settings — see MediaSourceConfig. */
  imageFormat?: "url" | "base64" | "binary";
  imageMultiple?: boolean;
  imageDelimiter?: string;
  imageMimeType?: string;
  captionEnabled?: boolean;
  captionLabel?: string;
  captionType?: "text" | "textarea" | "number" | "select" | "radio" | "multiselect";
  captionOptions?: string[];
  captionRequired?: boolean;
  captionFields?: GroupChildField[];
}

interface CSVColumn {
  name: string;
  sampleData: string;
  dataType: "string" | "number" | "date" | "boolean";
}

interface FieldConfigProps {
  datasetId: string;
  csvImportId?: string;
  onNavigateToUpload?: () => void;
  onNavigateToOverview?: () => void;
}

// Fields split by what an annotator may do with them. "Viewing" fields are the
// context they read (the CSV data, media, merged columns); "annotation" fields
// are the questions they answer. Dragging a card between the panels flips it.
const FIELD_PANELS = [
  {
    key: "view" as const,
    title: "Viewing fields",
    subtitle: "Read only",
    hint: "Context an annotator reads while working. They cannot change these.",
  },
  {
    key: "annotate" as const,
    title: "Annotation fields",
    subtitle: "Read & write",
    hint: "Questions the annotator answers. Use the button on a card to move it between the two.",
  },
];
type FieldPanelKey = (typeof FIELD_PANELS)[number]["key"];

export function FieldConfig({
  datasetId,
  csvImportId,
  onNavigateToUpload,
  onNavigateToOverview,
}: FieldConfigProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [availableColumns, setAvailableColumns] = useState<{
    csvColumns: { name: string; source: "CSV"; csvImportId?: string }[];
    manualColumns: { name: string; source: "MANUAL" }[];
    documentColumns: { name: string; source: "DOCUMENT" }[];
  }>({ csvColumns: [], manualColumns: [], documentColumns: [] });
  const [annotationFields, setAnnotationFields] = useState<AnnotationField[]>(
    [],
  );
  const [newColumns, setNewColumns] = useState<NewColumn[]>([]);
  const [fieldGroups, setFieldGroups] = useState<FieldGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<FieldGroup | null>(null);
  const [showGroupEditor, setShowGroupEditor] = useState(false);
  const [totalCSVFiles, setTotalCSVFiles] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [datasetLoadingError, setDatasetLoadingError] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"fields">("fields");
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(),
  );
  const [columnValidationErrors, setColumnValidationErrors] = useState<
    Record<string, string>
  >({});
  const [datasetInfo, setDatasetInfo] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [syncChoices, setSyncChoices] = useState<
    Record<string, "PUSH_ALL" | "KEEP_LOCAL">
  >({});

  const toggleRowExpanded = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  // Load dataset columns and existing field configuration
  useEffect(() => {
    // Load dataset available columns and existing field configuration
    loadDatasetColumns();
    loadExistingFieldConfig();
    loadDatasetInfo();
  }, [datasetId]);

  const loadDatasetColumns = async () => {
    try {
      setLoading(true);
      setDatasetLoadingError(null);

      const dataset = await datasetsAPI.getById(datasetId);

      if (dataset) {
        if (typeof dataset.totalCSVFiles === "number") {
          setTotalCSVFiles(dataset.totalCSVFiles);
        }
      }

      if (dataset && dataset.availableColumns) {
        const availableColumns = dataset.availableColumns;
        const csvColumns = availableColumns.filter(
          (col) => col.source === "CSV",
        );
        const manualColumns = availableColumns.filter(
          (col) => col.source === "MANUAL",
        );
        const documentColumns = availableColumns.filter(
          (col) => col.source === "DOCUMENT",
        );

        setAvailableColumns({
          csvColumns: csvColumns.map((col: any) => ({
            name: col.name,
            source: "CSV" as const,
            csvImportId: col.csvImportId,
          })),
          manualColumns: manualColumns.map((col: any) => ({
            name: col.name,
            source: "MANUAL" as const,
          })),
          documentColumns: documentColumns.map((col: any) => ({
            name: col.name,
            source: "DOCUMENT" as const,
          })),
        });
      } else {
        setAvailableColumns({
          csvColumns: [],
          manualColumns: [],
          documentColumns: [],
        });
      }
    } catch (error: any) {
      console.error("Error loading dataset columns:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      setDatasetLoadingError(
        "Failed to load dataset columns. Please try again.",
      );
      setAvailableColumns({
        csvColumns: [],
        manualColumns: [],
        documentColumns: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExistingFieldConfig = async () => {
    if (!datasetId) return;

    try {
      const config = await fieldSelectionAPI.getDatasetFieldConfig(datasetId);
      if (config) {
        // Keep every saved property. This used to copy a fixed list, which
        // dropped group inputs, image and caption settings on every reopen.
        const cleanFields = (config.annotationFields || []).map(
          (field: any, index: number) => {
            const cleanField = {
              ...field,
              id: field.id || field.fieldName || `field-${index}`,
              csvColumnName: field.csvColumnName || "",
              fieldName: field.fieldName || "",
              fieldType: field.fieldType || "text",
              isRequired: Boolean(field.isRequired),
              // prefer explicit isAnnotationField, fallback to inverse of legacy isMetadataField
              isAnnotationField:
                typeof field.isAnnotationField === "boolean"
                  ? Boolean(field.isAnnotationField)
                  : !Boolean(field.isMetadataField),
              isPrimaryKey: Boolean(field.isPrimaryKey),
              options: field.options || [],
              isNewColumn: Boolean(field.isNewColumn),
              newColumnId: field.newColumnId || undefined,
            } as AnnotationField;
            // Enforce invariant: primary key cannot be an annotation field
            if (cleanField.isPrimaryKey) {
              cleanField.isAnnotationField = false;
            }
            return cleanField;
          },
        );

        setAnnotationFields(cleanFields);
        setNewColumns(config.newColumns || []);
        setFieldGroups(config.fieldGroups || []);
        setPendingRequests(config.pendingFieldRequests || []);

        const progressStarted =
          config.completedRows > 0 ||
          (config.rowAnnotations || []).some(
            (row: any) =>
              row.status !== "pending" ||
              (row.annotations && Object.keys(row.annotations).length > 0),
          );
        // Update selected columns based on existing annotation fields
        const existingColumnNames = cleanFields
          .filter((field: AnnotationField) => !field.isNewColumn)
          .map((field: AnnotationField) => field.csvColumnName);
        setSelectedColumns(new Set(existingColumnNames));
      }
      setHasChanges(false);
    } catch (error) {
      console.error("Error loading field config:", error);
    }
  };

  const loadDatasetInfo = async () => {
    try {
      const dataset = await datasetsAPI.getById(datasetId);
      if (dataset) {
        if (typeof dataset.totalCSVFiles === "number") {
          setTotalCSVFiles(dataset.totalCSVFiles);
        }
      }
      setDatasetInfo({
        name: dataset.name,
        description: dataset.description || "",
      });
    } catch (err: any) {
      console.error("Error loading dataset info:", err);
      setDatasetInfo(null);
    }
  };

  const handleFieldChange = (
    fieldId: string,
    updates: Partial<AnnotationField>,
  ) => {
    // 1. Update annotationFields
    setAnnotationFields((currentFields) => {
      return currentFields.map((field) => {
        if (field.id === fieldId) {
          const updatedField = { ...field, ...updates };
          return updatedField;
        }
        return field;
      });
    });
    setHasChanges(true);

    // 2. If it is a new column, synchronize with newColumns list
    const field = annotationFields.find((f) => f.id === fieldId);
    if (field && field.isNewColumn && field.newColumnId) {
      setNewColumns((currentColumns) => {
        return currentColumns.map((col) => {
          if (col.id === field.newColumnId) {
            const columnUpdates: Partial<NewColumn> = {};
            if (updates.fieldName !== undefined) {
              columnUpdates.columnName = updates.fieldName;
            }
            if (updates.columnType !== undefined) {
              columnUpdates.columnType = updates.columnType;
            }
            if (updates.isRequired !== undefined) {
              columnUpdates.isRequired = updates.isRequired;
            }
            if (updates.options !== undefined) {
              columnUpdates.options = updates.options;
            }
            if (updates.placeholder !== undefined) {
              columnUpdates.placeholder = updates.placeholder;
            }
            if (updates.defaultValue !== undefined) {
              columnUpdates.defaultValue = updates.defaultValue;
            }
            if (updates.maxLength !== undefined) {
              columnUpdates.maxLength = updates.maxLength;
            }
            if (updates.min !== undefined) {
              columnUpdates.min = updates.min;
            }
            if (updates.max !== undefined) {
              columnUpdates.max = updates.max;
            }
            if (updates.step !== undefined) {
              columnUpdates.step = updates.step;
            }
            if (updates.rangeStart !== undefined) {
              columnUpdates.rangeStart = updates.rangeStart;
            }
            if (updates.rangeEnd !== undefined) {
              columnUpdates.rangeEnd = updates.rangeEnd;
            }
            if (updates.rangeStep !== undefined) {
              columnUpdates.rangeStep = updates.rangeStep;
            }
            if (updates.maxSelections !== undefined) {
              columnUpdates.maxSelections = updates.maxSelections;
            }
            if (updates.minDate !== undefined) {
              columnUpdates.minDate = updates.minDate;
            }
            if (updates.maxDate !== undefined) {
              columnUpdates.maxDate = updates.maxDate;
            }
            if (updates.maxRating !== undefined) {
              columnUpdates.maxRating = updates.maxRating;
            }
            if (updates.allowHalf !== undefined) {
              columnUpdates.allowHalf = updates.allowHalf;
            }
            if (updates.rows !== undefined) {
              columnUpdates.rows = updates.rows;
            }
            if (updates.branching !== undefined) {
              columnUpdates.branching = updates.branching;
            }
            return { ...col, ...columnUpdates };
          }
          return col;
        });
      });
    }
  };

  const getUnifiedType = (field: AnnotationField) => {
    // Media is media in either section: an image column shown beside the
    // questions and one shown among them are both still images.
    if (field.fieldType === "image") return "image";
    if (field.fieldType === "audio") return "audio";
    if (field.fieldType === "video") return "video";
    if (!field.isAnnotationField) return "text-metadata";
    return field.columnType || "text";
  };

  const handleUnifiedTypeChange = (field: AnnotationField, type: string) => {
    const updates: Partial<AnnotationField> = {};
    if (type === "image" || type === "audio" || type === "video") {
      // Only the type changes; which section the field sits in is the
      // configurer's choice, kept as it is. columnType is cleared so a value
      // left over from a text field cannot win over the media type later.
      updates.fieldType = type;
      updates.columnType = undefined;
    } else if (type === "text-metadata") {
      updates.fieldType = "text";
      updates.isAnnotationField = false;
    } else {
      updates.fieldType = "text";
      updates.isAnnotationField = true;
      updates.columnType = type as
        | "text"
        | "number"
        | "select"
        | "selectrange"
        | "textarea"
        | "rating"
        | "multiselect"
        | "checkbox"
        | "radio"
        | "date"
        | "url";
    }
    handleFieldChange(field.id, updates);
  };

  const updateAnnotationField = (
    id: string,
    updates: Partial<AnnotationField>,
  ) => {
    handleFieldChange(id, updates);
  };

  // Toggle primary key ensuring exclusivity
  const togglePrimaryKey = (fieldId: string, makePrimary: boolean) => {
    setAnnotationFields((currentFields) => {
      const newFields = currentFields.map((field) => {
        const updated = { ...field } as AnnotationField;
        if (field.id === fieldId) {
          updated.isPrimaryKey = makePrimary;
          // If becoming primary, it cannot be annotated
          if (makePrimary) {
            updated.isAnnotationField = false;
          }
        } else if (makePrimary) {
          // Only one primary key allowed
          updated.isPrimaryKey = false;
        }
        return updated;
      });
      return newFields;
    });
    setHasChanges(true);
  };

  const removeAnnotationField = (id: string) => {
    setAnnotationFields((fields) => fields.filter((field) => field.id !== id));
    setHasChanges(true);
  };

  // New Column Management
  const addNewColumn = () => {
    const newColumn: NewColumn = {
      id: Date.now().toString(),
      columnName: "",
      columnType: "text",
      isRequired: false,
      defaultValue: "",
      placeholder: "",
      validation: {},
    };

    // Add to newColumns array
    setNewColumns([...newColumns, newColumn]);

    // Also add as an annotation field
    const newField: AnnotationField = {
      id: Date.now().toString() + "_field",
      csvColumnName: "",
      fieldName: "",
      fieldType: "text",
      isRequired: false,
      isAnnotationField: true,
      isPrimaryKey: false,
      options: [],
      isNewColumn: true,
      newColumnId: newColumn.id,
    };
    setAnnotationFields([...annotationFields, newField]);
    setHasChanges(true);
  };

  const updateNewColumn = (id: string, updates: Partial<NewColumn>) => {
    setNewColumns((columns) =>
      columns.map((column) =>
        column.id === id ? { ...column, ...updates } : column,
      ),
    );
    setHasChanges(true);
  };

  // Validation function to check for duplicate column names
  const validateColumnName = useCallback(
    (
      columnName: string,
      excludeId?: string,
    ): { isValid: boolean; error?: string } => {
      if (!columnName || columnName.trim() === "") {
        return { isValid: false, error: "Column name is required" };
      }

      const trimmedName = columnName.trim();

      // Check if the exact name exists
      const exactMatch = availableColumns.csvColumns.find(
        (col) => col.name.toLowerCase() === trimmedName.toLowerCase(),
      );

      // Check for duplicates in new columns
      const duplicateNewColumn = newColumns.find(
        (col) =>
          col.id !== excludeId &&
          col.columnName.toLowerCase() === trimmedName.toLowerCase(),
      );

      if (duplicateNewColumn) {
        return {
          isValid: false,
          error: `Column name "${trimmedName}" already exists in new columns`,
        };
      }

      // Check for duplicates in existing CSV columns
      const duplicateCSVColumn = availableColumns.csvColumns.find(
        (col) => col.name.toLowerCase() === trimmedName.toLowerCase(),
      );

      if (duplicateCSVColumn) {
        return {
          isValid: false,
          error: `Column name "${trimmedName}" already exists in CSV`,
        };
      }

      // Check for duplicates in annotation fields (for new columns)
      const duplicateAnnotationField = annotationFields.find(
        (field) =>
          !field.isNewColumn &&
          field.csvColumnName.toLowerCase() === trimmedName.toLowerCase(),
      );

      if (duplicateAnnotationField) {
        return {
          isValid: false,
          error: `Column name "${trimmedName}" already exists in annotation fields`,
        };
      }

      return { isValid: true };
    },
    [newColumns, availableColumns.csvColumns, annotationFields],
  );

  // Removed debounced validation to prevent stale error states. We rely on immediate validation only.

  const removeNewColumn = (id: string) => {
    setNewColumns((columns) => columns.filter((column) => column.id !== id));
    // Also remove any annotation fields that reference this new column
    setAnnotationFields((fields) =>
      fields.filter((field) => field.newColumnId !== id),
    );
    // Clear validation errors for this column
    setColumnValidationErrors((errors) => {
      const newErrors = { ...errors };
      delete newErrors[id];
      return newErrors;
    });
    setHasChanges(true);
  };

  const addNewColumnAsAnnotationField = (newColumnId: string) => {
    const newColumn = newColumns.find((col) => col.id === newColumnId);
    if (!newColumn) return;

    const newField: AnnotationField = {
      id: Date.now().toString(),
      csvColumnName: newColumn.columnName,
      fieldName: newColumn.columnName,
      fieldType: "text", // Default to text for new columns
      isRequired: newColumn.isRequired,
      isAnnotationField: true,
      isPrimaryKey: false,
      options: [],
      isNewColumn: true,
      newColumnId: newColumnId,
    };
    setAnnotationFields([...annotationFields, newField]);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!datasetId) {
      showToast({
        title: "Error",
        description: "Dataset ID is required",
        type: "error",
      });
      return;
    }

    // Validate that at least one field is configured
    if (annotationFields.length === 0) {
      showToast({
        title: "Validation Error",
        description: "Please add at least one field before saving.",
        type: "error",
      });
      return;
    }

    // Ensure exactly one Primary Key is selected — auto-assign the first
    // annotation field if none is marked, so saving never fails with the
    // backend's opaque "Primary Key" error.
    let fieldsToSave = annotationFields;
    let primaryKeyCount = fieldsToSave.filter((f) => f.isPrimaryKey).length;
    if (primaryKeyCount !== 1) {
      const firstField =
        fieldsToSave.find((f) => f.isAnnotationField && !f.isNewColumn) ||
        fieldsToSave[0];
      if (primaryKeyCount === 0 && firstField) {
        fieldsToSave = fieldsToSave.map((f, idx) => ({
          ...f,
          isPrimaryKey: idx === fieldsToSave.indexOf(firstField),
        }));
        setAnnotationFields(fieldsToSave);
        primaryKeyCount = 1;
        showToast({
          title: "Primary Key Set",
          description: `"${firstField?.fieldName || firstField?.csvColumnName || 'first field'}" was set as the primary key automatically.`,
          type: "info",
        });
      }
    }

    if (primaryKeyCount !== 1) {
      showToast({
        title: "Validation Error",
        description: "Please select exactly one Primary Key field.",
        type: "error",
      });
      return;
    }

    // Check for validation errors
    if (Object.keys(columnValidationErrors).length > 0) {
      showToast({
        title: "Validation Error",
        description: "Please fix column name validation errors before saving.",
        type: "error",
      });
      return;
    }

    // Validate all new column names before saving
    const validationErrors: string[] = [];
    newColumns.forEach((column) => {
      const validation = validateColumnName(column.columnName, column.id);
      if (!validation.isValid) {
        validationErrors.push(`${column.columnName}: ${validation.error}`);
      }
    });

    // Validate selectrange fields require start and end
    const allFields = [
      ...annotationFields.filter((f) => f.isNewColumn),
      ...newColumns,
    ];
    allFields.forEach((field: any) => {
      if (
        field.columnType === "selectrange" ||
        field.fieldType === "selectrange"
      ) {
        const start = field.rangeStart;
        const end = field.rangeEnd;
        if (start === undefined || start === null || start === "") {
          validationErrors.push(
            `${field.columnName || field.fieldName || "Field"}: selectrange requires Range Start`,
          );
        }
        if (end === undefined || end === null || end === "") {
          validationErrors.push(
            `${field.columnName || field.fieldName || "Field"}: selectrange requires Range End`,
          );
        }
      }
    });

    if (validationErrors.length > 0) {
      showToast({
        title: "Validation Error",
        description: `Please fix the following errors:\n${validationErrors.join("\n")}`,
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      // Build payload with full deep-cloned recursive structures
      const payload = {
        datasetId,
        annotationFields: fieldsToSave.map((field) => ({
          id:
            field.id ||
            field.fieldName ||
            `field-${Math.random().toString(36).substr(2, 9)}`,
          csvColumnName: field.csvColumnName,
          fieldName: field.fieldName,
          fieldType:
            field.fieldType === "radio" ||
            field.fieldType === "rating" ||
            field.fieldType === "multiselect" ||
            field.fieldType === "select" ||
            field.fieldType === "checkbox" ||
            field.fieldType === "selectrange" ||
            field.fieldType === "textarea" ||
            field.fieldType === "number" ||
            field.fieldType === "date"
              ? "text"
              : field.fieldType || "text",
          isRequired: field.isRequired,
          isAnnotationField: field.isAnnotationField,
          isPrimaryKey: field.isPrimaryKey,
          options: Array.isArray(field.options)
            ? field.options.map((o) => o.trim()).filter(Boolean)
            : field.options,
          isNewColumn: field.isNewColumn,
          newColumnId: field.newColumnId,
          columnType:
            field.columnType ||
            (field.fieldType !== "text" &&
            field.fieldType !== "image" &&
            field.fieldType !== "audio" &&
            field.fieldType !== "video"
              ? field.fieldType
              : undefined),
          placeholder: field.placeholder,
          defaultValue: field.defaultValue,
          maxLength: field.maxLength,
          min: field.min,
          max: field.max,
          step: field.step,
          rangeStart: field.rangeStart,
          rangeEnd: field.rangeEnd,
          rangeStep: field.rangeStep,
          maxSelections: field.maxSelections,
          minDate: field.minDate,
          maxDate: field.maxDate,
          maxRating: field.maxRating,
          allowHalf: field.allowHalf,
          rows: field.rows,
          questionTitle: field.questionTitle,
          questionDescription: field.questionDescription,
          helpText: field.helpText,
          section: field.section,
          visibilityRule: field.visibilityRule,
          branching: field.branching
            ? structuredClone(field.branching)
            : undefined,
          // Composite children and media/caption settings. Enumerating props
          // here used to drop these, so every save wiped them.
          groupChildren: field.groupChildren
            ? structuredClone(field.groupChildren)
            : undefined,
          imageFormat: field.imageFormat,
          imageMultiple: field.imageMultiple,
          imageDelimiter: field.imageDelimiter,
          imageMimeType: field.imageMimeType,
          captionEnabled: field.captionEnabled,
          captionLabel: field.captionLabel,
          captionType: field.captionType,
          captionOptions: field.captionOptions,
          captionRequired: field.captionRequired,
          captionFields: field.captionFields
            ? structuredClone(field.captionFields)
            : undefined,
        })),
        annotationLabels: [],
        newColumns: newColumns.map((column) => {
          const mapped = {
            id: column.id,
            columnName: column.columnName,
            columnType: column.columnType,
            isRequired: column.isRequired,
            defaultValue: column.defaultValue,
            options: Array.isArray(column.options)
              ? column.options.map((o) => o.trim()).filter(Boolean)
              : column.options,
            placeholder: column.placeholder,
            maxLength: column.maxLength,
            min: column.min,
            max: column.max,
            step: column.step,
            rangeStart: column.rangeStart,
            rangeEnd: column.rangeEnd,
            rangeStep: column.rangeStep,
            maxSelections: column.maxSelections,
            minDate: column.minDate,
            maxDate: column.maxDate,
            maxRating: column.maxRating,
            allowHalf: column.allowHalf,
            rows: column.rows,
            validation: column.validation,
            branching: column.branching
              ? structuredClone(column.branching)
              : undefined,
            groupChildren: column.groupChildren
              ? structuredClone(column.groupChildren)
              : undefined,
            imageFormat: column.imageFormat,
            imageMultiple: column.imageMultiple,
            imageDelimiter: column.imageDelimiter,
            imageMimeType: column.imageMimeType,
            captionEnabled: column.captionEnabled,
            captionLabel: column.captionLabel,
            captionType: column.captionType,
            captionOptions: column.captionOptions,
            captionRequired: column.captionRequired,
            captionFields: column.captionFields
              ? structuredClone(column.captionFields)
              : undefined,
          };
          return mapped;
        }),
        fieldGroups: fieldGroups ? structuredClone(fieldGroups) : [],
      };

      // === DEBUG: Verify branching exists before sending ===
      const getBranchingDepth = (branching: any): number => {
        if (!branching || !branching.enabled || !branching.options) return 0;
        let maxChildDepth = 0;
        for (const option of branching.options) {
          if (option.childFields && option.childFields.length > 0) {
            for (const child of option.childFields) {
              const childDepth = child.branching
                ? getBranchingDepth(child.branching)
                : 0;
              if (childDepth > maxChildDepth) {
                maxChildDepth = childDepth;
              }
            }
          }
        }
        return 1 + maxChildDepth;
      };

      const getOptionWiseChildCount = (branching: any, depth = 1): any[] => {
        if (!branching || !branching.enabled || !branching.options) return [];
        return branching.options.map((option: any) => {
          const children = option.childFields || [];
          const childDetails = children.map((c: any) => ({
            fieldName: c.fieldName || c.columnName,
            hasBranching: !!c.branching?.enabled,
            nested: c.branching
              ? getOptionWiseChildCount(c.branching, depth + 1)
              : [],
          }));
          return {
            optionValue: option.value,
            depth,
            childCount: children.length,
            childDetails,
          };
        });
      };

      await fieldSelectionAPI.saveDatasetFieldConfig(payload);

      setHasChanges(false);
      showToast({
        title: "Success",
        description: "Field configuration saved successfully!",
        type: "success",
      });

      // Dispatch event to notify other components that field config was saved
      window.dispatchEvent(
        new CustomEvent("fieldConfigSaved", {
          detail: { datasetId },
        }),
      );

      // Redirect to data overview tab after successful save
      if (onNavigateToOverview) {
        onNavigateToOverview();
      } else {
        router.push(`/dataset/${datasetId}`);
      }
    } catch (error: any) {
      console.error("Error saving field configuration:", error);

      // Extract validation errors from backend response
      let errorMessage =
        "Failed to save field configuration. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // If it's a validation error, parse and show specific errors
      if (errorMessage.includes("Validation errors:")) {
        const validationErrors = errorMessage.split("\n").slice(1); // Remove "Validation errors:" header
        showToast({
          title: "Validation Error",
          description: validationErrors.join("\n"),
          type: "error",
        });
      } else {
        showToast({
          title: "Error",
          description: errorMessage,
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getSuggestedFieldName = (csvColumnName: string) => {
    const suggestions: Record<string, string> = {
      customer_name: "Customer Name",
      email: "Email",
      phone: "Phone",
      message: "Message",
      rating: "Rating",
      timestamp: "Timestamp",
      sentiment: "Sentiment",
      category: "Category",
      priority: "Priority",
      status: "Status",
    };
    return (
      suggestions[csvColumnName] ||
      csvColumnName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  // Get all available column names from dataset schema
  const getAllAvailableColumnNames = useCallback(() => {
    const csvColumnNames = availableColumns.csvColumns.map((col) =>
      col.name.toLowerCase(),
    );
    const manualColumnNames = availableColumns.manualColumns.map((col) =>
      col.name.toLowerCase(),
    );
    return [...csvColumnNames, ...manualColumnNames];
  }, [availableColumns]);

  // Check if a column name is available in the dataset
  const isColumnNameAvailable = useCallback(
    (columnName: string) => {
      const availableNames = getAllAvailableColumnNames();
      return !availableNames.includes(columnName.toLowerCase());
    },
    [getAllAvailableColumnNames],
  );

  // Handle column selection from CSV display
  const handleColumnClick = (columnName: string) => {
    // Check if column is already selected
    if (selectedColumns.has(columnName)) {
      // Remove from selection and annotation fields
      setSelectedColumns((prev) => {
        const newSet = new Set(prev);
        newSet.delete(columnName);
        return newSet;
      });

      // Remove from annotation fields
      setAnnotationFields((prev) =>
        prev.filter((field) => field.csvColumnName !== columnName),
      );
    } else {
      // Add to selection
      setSelectedColumns((prev) => new Set([...prev, columnName]));

      // Add to annotation fields
      const newField: AnnotationField = {
        id: Date.now().toString(),
        csvColumnName: columnName,
        fieldName: getSuggestedFieldName(columnName),
        fieldType: "text",
        isRequired: false,
        isAnnotationField: false,
        isPrimaryKey: false,
        options: [],
      };

      setAnnotationFields((prev) => [...prev, newField]);
    }

    setHasChanges(true);
  };

  const handleSelectAll = () => {
    const csvCols = availableColumns.csvColumns.map((col) => col.name);
    const docCols = availableColumns.documentColumns.map((col) => col.name);
    const allCols = [...csvCols, ...docCols];
    setSelectedColumns(new Set(allCols));
    setAnnotationFields((prev) => {
      const existingCsvCols = new Set(
        prev.filter((f) => !f.isNewColumn).map((f) => f.csvColumnName),
      );
      const fieldsToAdd = allCols
        .filter((columnName) => !existingCsvCols.has(columnName))
        .map((columnName) => ({
          id: `${Date.now()}-${columnName}`,
          csvColumnName: columnName,
          fieldName: getSuggestedFieldName(columnName),
          fieldType: "text" as const,
          isRequired: false,
          isAnnotationField: false,
          isPrimaryKey: false,
          options: [],
        }));
      return [
        ...prev.filter(
          (f) => f.isNewColumn || existingCsvCols.has(f.csvColumnName),
        ),
        ...fieldsToAdd,
      ];
    });
    setHasChanges(true);
  };

  const handleClearAll = () => {
    setSelectedColumns(new Set());
    setAnnotationFields((prev) => prev.filter((f) => f.isNewColumn));
    setHasChanges(true);
  };

  const handleInvertSelection = () => {
    const csvCols = availableColumns.csvColumns.map((col) => col.name);
    const docCols = availableColumns.documentColumns.map((col) => col.name);
    const allCols = [...csvCols, ...docCols];
    const newSelected = new Set<string>();
    allCols.forEach((col) => {
      if (!selectedColumns.has(col)) {
        newSelected.add(col);
      }
    });
    setSelectedColumns(newSelected);
    setAnnotationFields((prev) => {
      const keptNewFields = prev.filter((f) => f.isNewColumn);
      const csvFieldsMap = new Map(
        prev.filter((f) => !f.isNewColumn).map((f) => [f.csvColumnName, f]),
      );
      const newCsvFields = allCols
        .filter((col) => newSelected.has(col))
        .map((columnName) => {
          const existing = csvFieldsMap.get(columnName);
          if (existing) return existing;
          return {
            id: `${Date.now()}-${columnName}`,
            csvColumnName: columnName,
            fieldName: getSuggestedFieldName(columnName),
            fieldType: "text" as const,
            isRequired: false,
            isAnnotationField: false,
            isPrimaryKey: false,
            options: [],
          };
        });
      return [...keptNewFields, ...newCsvFields];
    });
    setHasChanges(true);
  };

  const handleApproveRequest = async (requestId: string) => {
    const choice = syncChoices[requestId] || "PUSH_ALL";
    const note = reviewNotes[requestId] || "";
    try {
      await schemaRequestsAPI.approve(requestId, { choice, reviewNote: note });
      showToast({
        title: "Request Approved",
        description: "Field change has been applied.",
        type: "success",
      });
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      setReviewNotes((prev) => {
        const n = { ...prev };
        delete n[requestId];
        return n;
      });
      setSyncChoices((prev) => {
        const n = { ...prev };
        delete n[requestId];
        return n;
      });
      loadExistingFieldConfig();
    } catch (err: any) {
      showToast({
        title: "Approval Failed",
        description: err?.response?.data?.message || "Failed to approve.",
        type: "error",
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const note = reviewNotes[requestId] || "";
    try {
      await schemaRequestsAPI.reject(requestId, { reviewNote: note });
      showToast({
        title: "Request Rejected",
        description: "Field request has been discarded.",
        type: "success",
      });
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      setReviewNotes((prev) => {
        const n = { ...prev };
        delete n[requestId];
        return n;
      });
    } catch (err: any) {
      showToast({
        title: "Rejection Failed",
        description: err?.response?.data?.message || "Failed to reject.",
        type: "error",
      });
    }
  };

  // ── Moving fields between the viewing and annotation panels ───────────────
  const [dragFieldId, setDragFieldId] = useState<string | null>(null);
  const [dragHandleId, setDragHandleId] = useState<string | null>(null);
  const [dropPanel, setDropPanel] = useState<FieldPanelKey | null>(null);

  const panelOf = (field: AnnotationField): FieldPanelKey =>
    field.isAnnotationField ? "annotate" : "view";

  // Reorder within a section. The array order is the order annotators see, so
  // a field only ever swaps with its neighbour inside the same section.
  const moveFieldOrder = (fieldId: string, dir: -1 | 1) => {
    setAnnotationFields((fields) => {
      const field = fields.find((f) => f.id === fieldId);
      if (!field) return fields;
      const panel = panelOf(field);
      const positions = fields
        .map((f, i) => ({ f, i }))
        .filter(({ f }) => panelOf(f) === panel)
        .map(({ i }) => i);
      const at = positions.indexOf(fields.indexOf(field));
      const swapWith = positions[at + dir];
      if (swapWith === undefined) return fields;
      const next = [...fields];
      const here = positions[at];
      [next[here], next[swapWith]] = [next[swapWith], next[here]];
      return next;
    });
    setHasChanges(true);
  };

  const moveFieldTo = (fieldId: string, panel: FieldPanelKey) => {
    const field = annotationFields.find((f) => f.id === fieldId);
    if (!field || panelOf(field) === panel) return;
    if (panel === "annotate" && field.isPrimaryKey) {
      showToast({
        title: "The primary key stays read only",
        description:
          "It identifies the row, so annotators must not change it. Clear Primary Key first if you really want it annotated.",
        type: "error",
      });
      return;
    }
    if (panel === "view" && field.isNewColumn) {
      showToast({
        title: "A new column is always a question",
        description:
          "It has no data behind it, so there is nothing to display read only. Delete it instead if it is not needed.",
        type: "error",
      });
      return;
    }
    // Moving a field only changes whether annotators may edit it. Its type is
    // the configurer's decision and is left alone — except for a plain text
    // column, whose read-only form is the metadata display.
    const isMedia = ["image", "audio", "video"].includes(field.fieldType);
    const updates: Partial<AnnotationField> = { isAnnotationField: panel === "annotate" };
    if (!isMedia && panel === "annotate" && !field.columnType) {
      updates.columnType = "text";
    }
    handleFieldChange(field.id, updates);
  };

  const renderFieldCard = (field: AnnotationField) => {
                    const siblings = annotationFields.filter(
                      (f) => panelOf(f) === panelOf(field),
                    );
                    const position = siblings.findIndex((f) => f.id === field.id);
                    const newColumn = field.isNewColumn
                      ? newColumns.find((col) => col.id === field.newColumnId)
                      : null;
                    const unifiedTypes = [
                      { value: "text", label: "Text Input" },
                      { value: "textarea", label: "Long Text" },
                      { value: "number", label: "Numeric Input" },
                      { value: "select", label: "Dropdown" },
                      { value: "selectrange", label: "Numeric Range Select" },
                      { value: "radio", label: "Radio Options" },
                      { value: "checkbox", label: "Checkbox Toggle" },
                      {
                        value: "multiselect",
                        label: "Multiple Select Checkboxes",
                      },
                      { value: "date", label: "Date Picker" },
                      { value: "rating", label: "Star Rating" },
                      { value: "url", label: "URL Link" },
                      { value: "group", label: "Group (several inputs)" },
                      { value: "image", label: "Image" },
                      { value: "audio", label: "Audio" },
                      { value: "video", label: "Video" },
                    ];

                    const metadataTypes = [
                      { value: "text-metadata", label: "Metadata Display" },
                    ];

                    const options = field.isNewColumn
                      ? unifiedTypes
                      : [...unifiedTypes, ...metadataTypes];
                    const currentUnifiedType = getUnifiedType(field);
                    const isInputType = unifiedTypes.some(
                      (opt) => opt.value === currentUnifiedType,
                    );
                    const isTypeDisabled = Boolean(field.isPrimaryKey);

                    return (
                      <Card
                        key={field.id}
                        draggable={dragHandleId === field.id}
                        onDragStart={(e) => {
                          setDragFieldId(field.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDragFieldId(null);
                          setDragHandleId(null);
                          setDropPanel(null);
                        }}
                        className={cn(
                          "border border-gray-200 shadow-sm overflow-hidden bg-white transition-all duration-200",
                          dragFieldId === field.id && "opacity-50",
                          field.isNewColumn
                            ? "hover:border-purple-200"
                            : "hover:border-blue-200",
                        )}
                      >
                        <div className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                          {/* Left Part: Name & Selection */}
                          <div className="flex-1 min-w-0">
                            {field.isNewColumn ? (
                              <div className="space-y-1 max-w-md">
                                <Input
                                  placeholder="Column name"
                                  value={newColumn?.columnName || ""}
                                  disabled={false}
                                  onChange={(e) => {
                                    const columnName = e.target.value;
                                    handleFieldChange(field.id, {
                                      fieldName: columnName,
                                      csvColumnName: columnName,
                                    });

                                    if (columnName.trim() === "") {
                                      setColumnValidationErrors((prev) => {
                                        const newErrors = { ...prev };
                                        delete newErrors[field.newColumnId!];
                                        return newErrors;
                                      });
                                      return;
                                    }

                                    const validation = validateColumnName(
                                      columnName,
                                      field.newColumnId,
                                    );
                                    if (!validation.isValid) {
                                      setColumnValidationErrors((prev) => ({
                                        ...prev,
                                        [field.newColumnId!]:
                                          validation.error || "",
                                      }));
                                    } else {
                                      setColumnValidationErrors((prev) => {
                                        const newErrors = { ...prev };
                                        delete newErrors[field.newColumnId!];
                                        return newErrors;
                                      });
                                    }
                                  }}
                                  className={cn(
                                    "h-9 text-sm bg-white transition-colors",
                                    columnValidationErrors[field.newColumnId!]
                                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
                                  )}
                                />
                                {columnValidationErrors[field.newColumnId!] && (
                                  <div className="flex items-center space-x-1 mt-1">
                                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                    <p className="text-xs text-red-500">
                                      {
                                        columnValidationErrors[
                                          field.newColumnId!
                                        ]
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-w-md">
                                <div className="flex items-center space-x-2">
                                  <span
                                    className="font-mono text-xs text-gray-600 truncate max-w-[250px]"
                                    title="Original column name in the CSV. Used to read the data and cannot be changed."
                                  >
                                    {field.csvColumnName}
                                  </span>
                                  <span className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded uppercase font-semibold">
                                    CSV Column
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Display name + description, for every field. Metadata columns
                                use fieldName/helpText (the data is read via csvColumnName);
                                annotation inputs use questionTitle/questionDescription because
                                answers are stored under fieldName, which must stay stable. */}
                            <div className="mt-2 grid gap-1.5 max-w-md">
                              <Input
                                value={isInputType ? field.questionTitle ?? "" : field.fieldName}
                                placeholder={isInputType ? `Display name (defaults to “${field.fieldName || "field"}”)` : "Display name shown to annotators"}
                                aria-label="Display name"
                                onChange={(e) =>
                                  handleFieldChange(field.id, isInputType ? { questionTitle: e.target.value } : { fieldName: e.target.value })
                                }
                                className="h-8 text-sm bg-white"
                              />
                              <Input
                                value={(isInputType ? field.questionDescription : field.helpText) ?? ""}
                                placeholder="What this field means — shown as an ⓘ tip"
                                aria-label="Field description"
                                onChange={(e) =>
                                  handleFieldChange(field.id, isInputType ? { questionDescription: e.target.value } : { helpText: e.target.value })
                                }
                                className="h-8 text-xs bg-white"
                              />
                              <p className="text-[11px] text-gray-500">
                                Annotators see{" "}
                                <span className="font-medium text-gray-700">
                                  {(isInputType ? field.questionTitle : field.fieldName) || field.fieldName || field.csvColumnName || "…"}
                                </span>
                                {(isInputType ? field.questionDescription : field.helpText) ? " with an info tip." : "."}
                              </p>
                            </div>
                          </div>

                          {/* Middle Part: Type Dropdown, Primary checkbox, action buttons */}
                          <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                            <div className="w-[180px]">
                              <select
                                value={currentUnifiedType}
                                onChange={(e) =>
                                  handleUnifiedTypeChange(field, e.target.value)
                                }
                                disabled={isTypeDisabled}
                                className="w-full h-9 px-3 border border-gray-300 bg-white rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {options.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {!field.isNewColumn && (
                              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                                <input
                                  type="checkbox"
                                  id={`pk-${field.id}`}
                                  checked={Boolean(field.isPrimaryKey)}
                                  onChange={(e) =>
                                    togglePrimaryKey(field.id, e.target.checked)
                                  }
                                  disabled={false}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                                />
                                <Label
                                  htmlFor={`pk-${field.id}`}
                                  className="text-xs text-gray-600 cursor-pointer font-medium select-none"
                                >
                                  Primary Key
                                </Label>
                              </div>
                            )}

                            {isInputType && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleRowExpanded(field.id)}
                                className="h-9 text-xs font-semibold flex items-center space-x-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                              >
                                <span>Configure</span>
                                {expandedRows.has(field.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={false}
                              onClick={() => {
                                if (field.isNewColumn) {
                                  removeNewColumn(field.newColumnId!);
                                } else {
                                  // Uncheck CSV column selection
                                  setSelectedColumns((prev) => {
                                    const newSet = new Set(prev);
                                    newSet.delete(field.csvColumnName);
                                    return newSet;
                                  });
                                }
                                removeAnnotationField(field.id);
                              }}
                              className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Move this field to the other panel — bottom right */}
                        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-1.5">
                          <span
                            onMouseDown={() => setDragHandleId(field.id)}
                            onMouseUp={() => setDragHandleId(null)}
                            title="Drag to the other section"
                            className="cursor-grab rounded p-0.5 text-gray-300 hover:text-gray-600 active:cursor-grabbing"
                          >
                            <GripVertical className="h-4 w-4" />
                          </span>
                          <div className="mr-1 flex items-center">
                            <button
                              type="button"
                              aria-label={`Move ${field.fieldName || field.csvColumnName || "field"} up`}
                              title="Move up"
                              disabled={position <= 0}
                              onClick={() => moveFieldOrder(field.id, -1)}
                              className="rounded-l-md border border-gray-200 bg-white p-1 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${field.fieldName || field.csvColumnName || "field"} down`}
                              title="Move down"
                              disabled={position >= siblings.length - 1}
                              onClick={() => moveFieldOrder(field.id, 1)}
                              className="-ml-px rounded-r-md border border-gray-200 bg-white p-1 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="mr-auto text-[11px] tabular-nums text-gray-400">
                            {position + 1} of {siblings.length}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              moveFieldTo(
                                field.id,
                                panelOf(field) === "annotate" ? "view" : "annotate",
                              )
                            }
                            className="whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                          >
                            {panelOf(field) === "annotate"
                              ? "Make read only ↑"
                              : "Make annotatable ↓"}
                          </button>
                        </div>

                        {/* Expanded Config Panel */}
                        {expandedRows.has(field.id) && isInputType && (
                          <div className="px-4 pb-4 pt-3 border-t border-gray-100 bg-gray-50/50">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* LEFT: Configuration */}
                              <div className="space-y-4">
                                <FieldTypeConfigurator
                                  type={currentUnifiedType}
                                  field={field}
                                  onChange={(updates) =>
                                    handleFieldChange(field.id, updates)
                                  }
                                />
                                {/* A group field is several inputs answered together */}
                                {currentUnifiedType === "group" && (
                                  <div className="pt-4 border-t border-gray-200">
                                    <GroupFieldEditor
                                      items={field.groupChildren ?? []}
                                      onChange={(groupChildren) =>
                                        handleFieldChange(field.id, { groupChildren })
                                      }
                                    />
                                  </div>
                                )}

                                {/* Recursive Branching Editor for choice types */}
                                {[
                                  "radio",
                                  "multiselect",
                                  "select",
                                  "rating",
                                  "checkbox",
                                ].includes(currentUnifiedType) && (
                                  <div className="pt-4 border-t border-gray-200">
                                    <RecursiveFieldEditor
                                      field={field}
                                      depth={0}
                                      onChange={(updated) =>
                                        handleFieldChange(field.id, updated)
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                              {/* RIGHT: Live Preview Tree */}
                              <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                  <span>👁</span> Live Workflow Tree
                                </h4>
                                <LivePreviewTree fields={[field]} />
                                {![
                                  "radio",
                                  "multiselect",
                                  "select",
                                  "rating",
                                  "checkbox",
                                ].includes(currentUnifiedType) && (
                                  <div className="text-xs text-gray-400 italic mt-4 text-center">
                                    Branching is only available for choice-based
                                    fields (Radio, Multi-Select, Dropdown,
                                    Rating).
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900">
          {datasetInfo?.name || "Field Configuration"}
        </h1>
        <p className="text-gray-600 mt-1">
          Configure CSV annotation fields and data mapping
        </p>
      </div>

      {datasetLoadingError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <span>{datasetLoadingError}</span>
        </div>
      )}

      {/* Pending Field Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-amber-100 bg-amber-50/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <span>Pending Field Requests ({pendingRequests.length})</span>
            </CardTitle>
            <CardDescription className="text-xs text-amber-700">
              Annotators have requested changes to the field configuration.
              Review, approve, or reject below.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-gray-100">
            {pendingRequests.map((req) => {
              const requestId = req.id;
              const annotatorName = req.requestedBy
                ? `${req.requestedBy.firstName} ${req.requestedBy.lastName}`
                : "Unknown";
              const currentSync = syncChoices[requestId] || "PUSH_ALL";

              return (
                <div
                  key={requestId}
                  className={`p-4 ${req.targetFieldMissing ? "bg-red-50" : ""}`}
                >
                  {req.targetFieldMissing && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span className="font-semibold">Warning:</span> Target
                      field no longer exists in configuration
                    </div>
                  )}
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                          {req.type}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {req.type === "ADD_FIELD" && req.field?.fieldName}
                          {req.type === "ADD_GROUP" && req.field?.groupName}
                          {req.type === "RENAME_FIELD" &&
                            `${req.fieldName} → ${req.newFieldName || req.newQuestionTitle}`}
                          {req.type === "DELETE_FIELD" && req.fieldName}
                          {req.type === "UPDATE_FIELD" && req.fieldName}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Requested by:</span>{" "}
                        {annotatorName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(req.createdAt).toLocaleString()}
                      </div>
                      {req.field?.columnType && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Type:</span>{" "}
                          {req.field.columnType}
                          {req.field.options?.length > 0 && (
                            <span className="ml-2">
                              Options: {req.field.options.join(", ")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="w-full md:w-64 space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSyncChoices((prev) => ({
                              ...prev,
                              [requestId]: "PUSH_ALL",
                            }))
                          }
                          className={`px-2 py-1.5 text-xs font-semibold rounded border text-center transition-all ${
                            currentSync === "PUSH_ALL"
                              ? "bg-teal-50 border-teal-500 text-teal-700"
                              : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          All Clones
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSyncChoices((prev) => ({
                              ...prev,
                              [requestId]: "KEEP_LOCAL",
                            }))
                          }
                          className={`px-2 py-1.5 text-xs font-semibold rounded border text-center transition-all ${
                            currentSync === "KEEP_LOCAL"
                              ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                              : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          Keep Local
                        </button>
                      </div>
                      <input
                        placeholder="Review note (optional)..."
                        value={reviewNotes[requestId] || ""}
                        onChange={(e) =>
                          setReviewNotes((prev) => ({
                            ...prev,
                            [requestId]: e.target.value,
                          }))
                        }
                        className="w-full h-7 text-xs px-2 border border-gray-200 rounded bg-white"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleRejectRequest(requestId)}
                          className="flex-1 px-2 py-1.5 text-xs font-semibold rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveRequest(requestId)}
                          className="flex-1 px-2 py-1.5 text-xs font-semibold rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Columns Display */}
      {(availableColumns.csvColumns.length > 0 ||
        availableColumns.manualColumns.length > 0 ||
        availableColumns.documentColumns.length > 0) && (
        <CSVColumnsDisplay
          csvColumns={availableColumns.csvColumns}
          manualColumns={availableColumns.manualColumns}
          documentColumns={availableColumns.documentColumns}
          selectedColumns={selectedColumns}
          onColumnClick={handleColumnClick}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
          onInvertSelection={handleInvertSelection}
          title="Select Columns"
          description="Click on columns below to add them to annotation fields"
        />
      )}

      {/* Build one column out of several */}
      {availableColumns.csvColumns.length +
        availableColumns.manualColumns.length +
        availableColumns.documentColumns.length >
        1 && (
        <MergeColumns
          datasetId={datasetId}
          columns={[
            ...availableColumns.csvColumns,
            ...availableColumns.manualColumns,
            ...availableColumns.documentColumns,
          ]}
          onChanged={() => {
            loadDatasetColumns();
          }}
        />
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading dataset columns...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {datasetLoadingError && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center py-8 text-red-500">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-300" />
              <p className="text-lg font-medium mb-2">
                Error Loading Dataset Columns
              </p>
              <p className="text-sm mb-4">{datasetLoadingError}</p>
              <Button
                onClick={loadDatasetColumns}
                className="bg-red-600 hover:bg-red-700"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Columns State */}
      {!loading &&
        !datasetLoadingError &&
        availableColumns.csvColumns.length === 0 &&
        availableColumns.manualColumns.length === 0 &&
        availableColumns.documentColumns.length === 0 &&
        annotationFields.length === 0 && (
          <Card>
            <CardContent className="p-8">
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No columns found</p>
                <p className="text-sm mb-4">
                  Upload a CSV or document file first, or add fields manually below.
                </p>
                <Button
                  onClick={() => {
                    if (onNavigateToUpload) {
                      onNavigateToUpload();
                    } else {
                      router.push(`/dataset/${datasetId}`);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Go to Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Configuration Tabs */}
      <div className="space-y-6">
          {/* Configured Repeatable Field Groups */}
          <Card className="mb-6">
            <CardHeader className="py-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                    <Database className="h-4 w-4 text-purple-600" />
                    <span>Repeatable Field Groups</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configured repeatable groups of fields
                  </CardDescription>
                </div>
                {!showGroupEditor && (
                  <Button
                    onClick={() => {
                      setEditingGroup(null);
                      setShowGroupEditor(true);
                    }}
                    disabled={false}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 h-8 text-xs text-white"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Field Group
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3">
              {fieldGroups.length > 0 ? (
                <div className="space-y-2">
                  {fieldGroups.map((group) => (
                    <div
                      key={group.groupId}
                      className="flex justify-between items-center p-3 rounded-md border border-purple-100 bg-purple-50/30"
                    >
                      <div>
                        <div className="text-sm font-semibold text-purple-900 flex items-center space-x-2">
                          <span>{group.groupName}</span>
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-mono">
                            Repeated {group.repeatCount} times
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Fields:{" "}
                          {group.fields.map((f) => f.fieldName).join(", ")}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingGroup(group);
                            setShowGroupEditor(true);
                          }}
                          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={false}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Delete Group?\nThis action cannot be undone.",
                              )
                            ) {
                              setFieldGroups(
                                fieldGroups.filter(
                                  (g) => g.groupId !== group.groupId,
                                ),
                              );
                              setHasChanges(true);
                            }
                          }}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-xs">
                  No repeatable field groups configured yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Field Group Editor */}
          {showGroupEditor && (
            <div className="mb-6">
              <FieldGroupEditor
                existingGroup={editingGroup}
                existingColumnNames={
                  new Set([
                    ...availableColumns.csvColumns.map((c) =>
                      c.name.toLowerCase(),
                    ),
                    ...availableColumns.manualColumns.map((c) =>
                      c.name.toLowerCase(),
                    ),
                    ...newColumns.map((c) => c.columnName.toLowerCase()),
                    ...annotationFields.map((f) => f.fieldName.toLowerCase()),
                  ])
                }
                onSave={(group) => {
                  if (editingGroup) {
                    setFieldGroups(
                      fieldGroups.map((g) =>
                        g.groupId === editingGroup.groupId ? group : g,
                      ),
                    );
                  } else {
                    setFieldGroups([...fieldGroups, group]);
                  }
                  setShowGroupEditor(false);
                  setEditingGroup(null);
                  setHasChanges(true);
                }}
                onCancel={() => {
                  setShowGroupEditor(false);
                  setEditingGroup(null);
                }}
              />
            </div>
          )}

          {/* Annotation Fields Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-blue-600" />
                    <span>Fields</span>
                  </CardTitle>
                  <CardDescription>
                    Viewing fields are read-only context; annotation fields are the questions. Move a field with the button on its card.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {annotationFields.length > 0 ? (
                <div className="space-y-5">
                  {FIELD_PANELS.map((panel) => {
                    const fields = annotationFields.filter(
                      (f) => panelOf(f) === panel.key,
                    );
                    const isTarget = dropPanel === panel.key;
                    return (
                      <section
                        key={panel.key}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragFieldId) setDropPanel(panel.key);
                        }}
                        onDragLeave={() => setDropPanel((p) => (p === panel.key ? null : p))}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragFieldId) moveFieldTo(dragFieldId, panel.key);
                          setDragFieldId(null);
                          setDropPanel(null);
                        }}
                        aria-label={panel.title}
                        className={cn(
                          "rounded-lg border-2 border-dashed p-3 transition-colors",
                          isTarget
                            ? "border-blue-400 bg-blue-50/40"
                            : "border-gray-200 bg-gray-50/40",
                        )}
                      >
                        <header className="mb-3 flex items-baseline justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-800">
                              {panel.title}
                              <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                                {panel.subtitle}
                              </span>
                            </h3>
                            <p className="mt-0.5 text-xs text-gray-500">{panel.hint}</p>
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-gray-500">
                            {fields.length}
                          </span>
                        </header>
                        {fields.length === 0 ? (
                          <p className="rounded-md border border-dashed border-gray-200 bg-white/60 px-3 py-6 text-center text-xs text-gray-500">
                            Nothing here yet. Use the button at the bottom of a field card{panel.key === "annotate" ? " to ask a question about it" : " to show it as read-only context"}.
                          </p>
                        ) : (
                          <div className="space-y-4">{fields.map(renderFieldCard)}</div>
                        )}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base font-medium mb-1">
                    Please select columns from above
                  </p>
                  <p className="text-sm">
                    Click on columns in the "Select Columns" section to add them
                    here
                  </p>
                </div>
              )}
            </CardContent>

            {/* Inline validation errors */}
            {(() => {
              const selectrangeErrors = [
                ...annotationFields.filter((f) => f.isNewColumn),
                ...newColumns,
              ]
                .filter(
                  (f: any) =>
                    f.columnType === "selectrange" ||
                    f.fieldType === "selectrange",
                )
                .filter((f: any) => !f.rangeStart || !f.rangeEnd)
                .map(
                  (f: any) => f.columnName || f.fieldName || "Unnamed field",
                );

              if (selectrangeErrors.length > 0) {
                return (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-700 font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {selectrangeErrors.length} selectrange field
                      {selectrangeErrors.length !== 1 ? "s" : ""} require Range
                      Start and Range End
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            {/* Fixed Footer with Save Button */}
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex justify-between">
                <Button
                  onClick={addNewColumn}
                  disabled={false}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 h-8 px-3 text-sm"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add New Field
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={
                    !hasChanges ||
                    loading ||
                    (() => {
                      const hasErrors = [
                        ...annotationFields.filter((f) => f.isNewColumn),
                        ...newColumns,
                      ].some(
                        (f: any) =>
                          (f.columnType === "selectrange" ||
                            f.fieldType === "selectrange") &&
                          (!f.rangeStart || !f.rangeEnd),
                      );
                      return hasErrors;
                    })()
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 h-8 px-3 text-sm"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Configuration
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
  );
}
