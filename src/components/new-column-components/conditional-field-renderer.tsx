"use client";
import { FieldInfo } from '@/components/annotation-components/metadata-display';

import { useCallback } from "react";

const cleanOptionValue = (val: any): string => {
  if (val === undefined || val === null) return "";
  const s = String(val).trim();
  const colonIdx = s.indexOf(":");
  return colonIdx === -1 ? s : s.slice(0, colonIdx).trim();
};
import { cn } from "@/lib/utils";
import type { AnnotationField } from "@/types/feature1";
import { DecisionCardEngine, parseOptions } from "./new-column-data-panel";

interface ConditionalFieldRendererProps {
  field: AnnotationField;
  formData: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  path?: string;
  isReadOnly?: boolean;
  annotatorIndex?: number;
}

export function ConditionalFieldRenderer({
  field,
  formData,
  onChange,
  path = "",
  isReadOnly = false,
}: ConditionalFieldRendererProps) {
  const fieldPath = path ? `${path}.${field.fieldName}` : field.fieldName;
  const value = formData[fieldPath];
  const hasBranching =
    field.branching?.enabled && field.branching.options?.length > 0;
  const type = field.columnType || field.fieldType;

  const handleChange = useCallback(
    (newValue: any) => {
      const oldVal = formData[fieldPath];
      const cleaned = { ...formData };

      // 1. Parse old and new values as arrays of strings
      const parseValues = (val: any) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(String);
        if (typeof val === "string") {
          if (type === "multiselect") {
            return val
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          }
          return [val];
        }
        return [String(val)];
      };

      const oldValues = parseValues(oldVal);
      const newValues = parseValues(newValue);

      // 2. Find which options were deselected (in old but not in new)
      const deselected = oldValues.filter((v) => !newValues.includes(v));

      // 3. For each deselected option, remove its orphaned keys
      deselected.forEach((desel) => {
        const branchPrefix = `${fieldPath}.${desel}`;
        Object.keys(cleaned).forEach((k) => {
          if (k.startsWith(branchPrefix + ".")) {
            delete cleaned[k];
          }
          if (k === `${fieldPath}.${desel}_description`) {
            delete cleaned[k];
          }
        });
      });

      // 4. Set the new value
      cleaned[fieldPath] = newValue;

      onChange(cleaned);
    },
    [fieldPath, formData, onChange, type],
  );

  const handleDescriptionChange = useCallback(
    (optionValue: string, text: string) => {
      const descKey = `${fieldPath}.${optionValue}_description`;
      onChange({ ...formData, [descKey]: text });
    },
    [fieldPath, formData, onChange],
  );

  const renderOptionChild = (optVal: string) => {
    const cleanOptVal = cleanOptionValue(optVal);
    const option = field.branching?.options?.find(
      (o) =>
        cleanOptionValue(o.value).toLowerCase() === cleanOptVal.toLowerCase(),
    );
    if (!option) return null;

    const descKey = `${fieldPath}.${option.value}_description`;

    return (
      <div key={option.value} className="space-y-2 mt-2 w-full">
        {option.requireDescription &&
          (isReadOnly ? (
            formData[descKey] && (
              <div className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 italic mt-1">
                {formData[descKey]}
              </div>
            )
          ) : (
            <textarea
              key={descKey}
              value={formData[descKey] || ""}
              onChange={(e) =>
                handleDescriptionChange(option.value, e.target.value)
              }
              placeholder={
                option.descriptionPlaceholder || "Describe your choice..."
              }
              rows={2}
              className="w-full text-sm border border-purple-200 rounded-lg px-3 py-2 outline-none focus:border-purple-500 bg-white resize-y mt-1"
            />
          ))}

        {option.childFields && option.childFields.length > 0 && (
          <div className="ml-4 pl-3 border-l-2 border-teal-200 space-y-3">
            {option.childFields.map((child, ci) => (
              <ConditionalFieldRenderer
                key={`${fieldPath}.${option.value}.${child.fieldName || ci}`}
                field={child}
                formData={formData}
                onChange={onChange}
                path={`${fieldPath}.${option.value}`}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const showChildFieldsAtBottom =
    isReadOnly ||
    !["radio", "select", "multiselect", "rating", "checkbox"].includes(type);

  const getFriendlyTypeLabel = (t: string) => {
    const mapping: Record<string, string> = {
      text: "Long Text",
      textarea: "Long Text",
      radio: "Radio",
      select: "Dropdown",
      multiselect: "Multiselect",
      rating: "Star Rating",
      checkbox: "Checkbox",
    };
    return mapping[t] || t;
  };

  return (
    <div className="space-y-2 w-full">
      {/* Render child field name and type if it is a nested/child field */}
      {path && (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1 select-none mt-2">
          <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            {field.questionTitle || field.fieldName}
          </span>
          {field.questionDescription && <FieldInfo text={field.questionDescription} column={field.fieldName} />}
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-normal">
            ({getFriendlyTypeLabel(type)})
          </span>
          {field.isRequired && (
            <span
              className="text-red-500 text-sm font-bold"
              title="Required field"
            >
              *
            </span>
          )}
        </div>
      )}

      {/* Render the input based on field type */}
      {isReadOnly ? (
        <div className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
          {value || <span className="text-gray-300 italic">No value</span>}
        </div>
      ) : (
        <FieldInput
          field={field}
          value={value}
          onChange={handleChange}
          fieldPath={fieldPath}
          renderChildFields={renderOptionChild}
        />
      )}

      {/* Render Inline descriptions and Child fields for selected option(s) at bottom ONLY if not rendered inline */}
      {showChildFieldsAtBottom &&
        hasBranching &&
        field.branching!.options.map((option) => {
          const isSelected =
            value !== "" &&
            value !== undefined &&
            value !== null &&
            (type === "multiselect"
              ? (Array.isArray(value) &&
                  value
                    .map((v) => cleanOptionValue(v).toLowerCase())
                    .includes(cleanOptionValue(option.value).toLowerCase())) ||
                (typeof value === "string" &&
                  value
                    .split(",")
                    .map((s) => cleanOptionValue(s).toLowerCase())
                    .includes(cleanOptionValue(option.value).toLowerCase()))
              : cleanOptionValue(value).toLowerCase() ===
                cleanOptionValue(option.value).toLowerCase());

          if (!isSelected) return null;

          return renderOptionChild(option.value);
        })}
    </div>
  );
}

// ─── Field Input Components ──────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  fieldPath,
  renderChildFields,
}: {
  field: AnnotationField;
  value: any;
  onChange: (v: any) => void;
  fieldPath: string;
  renderChildFields?: (optionValue: string) => React.ReactNode;
}) {
  const type = field.columnType || field.fieldType;
  if (["radio", "select", "multiselect", "rating", "checkbox"].includes(type)) {
    return (
      <DecisionCardEngine
        field={field}
        options={parseOptions(field.options || [])}
        value={value}
        onChange={onChange}
        renderChildFields={renderChildFields}
      />
    );
  }

  switch (type) {
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={value === true || value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            className="rounded text-blue-600"
          />
          {field.questionTitle || field.fieldName}
        </label>
      );

    case "textarea":
      return (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Enter text..."}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white resize-y"
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "0"}
          min={field.min}
          max={field.max}
          step={field.step || 1}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
        />
      );

    default:
      return (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Enter value..."}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
        />
      );
  }
}

function RatingInput({
  value,
  max,
  allowHalf,
  onChange,
}: {
  value: any;
  max: number;
  allowHalf?: boolean;
  onChange: (v: string) => void;
}) {
  const nums = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className="flex gap-1.5 flex-wrap">
      {nums.map((n) => (
        <button
          key={n}
          onClick={() => onChange(String(n))}
          className={cn(
            "w-9 h-9 rounded-lg text-sm font-bold border-2 transition-all",
            value === String(n)
              ? "bg-blue-600 text-white border-blue-600 shadow-sm scale-105"
              : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:shadow-sm",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
