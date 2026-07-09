'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldGroup, FieldGroupChildField, AnnotationField } from '@/types/feature1';
import { Plus, Trash2, HelpCircle, Eye, RefreshCw, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldTypeConfigurator } from './field-type-configurator';
import { RecursiveFieldEditor } from './recursive-field-editor';

interface FieldGroupEditorProps {
  onSave: (group: FieldGroup) => void;
  onCancel: () => void;
  existingGroup?: FieldGroup | null;
  existingColumnNames: Set<string>;
  isLocked?: boolean; // If annotations have already started
}

interface GroupedPreview {
  instanceIndex: number;
  title: string;
  fields: string[];
}

export function FieldGroupEditor({
  onSave,
  onCancel,
  existingGroup,
  existingColumnNames,
  isLocked = false,
}: FieldGroupEditorProps) {
  const [groupName, setGroupName] = useState(existingGroup?.groupName || '');
  const [repeatCount, setRepeatCount] = useState(existingGroup?.repeatCount || 3);
  const [fields, setFields] = useState<FieldGroupChildField[]>(
    existingGroup?.fields?.map((f, idx) => ({
      ...f,
      id: f.id || `field_${Date.now()}_${idx}`,
    })) || [
      {
        id: `field_${Date.now()}_0`,
        fieldName: '',
        fieldType: 'text',
        isRequired: false,
        options: [],
        placeholder: '',
        repeatCount: 1,
      },
    ]
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [previewGroups, setPreviewGroups] = useState<GroupedPreview[]>([]);
  const [expandedFields, setExpandedFields] = useState<Set<number>>(new Set());

  const toggleFieldExpanded = (index: number) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Update preview when fields or repeatCount change
  useEffect(() => {
    const groupsList: GroupedPreview[] = [];
    const count = Number(repeatCount) || 0;
    const trimmedGroupName = groupName.trim();
    if (count > 0 && count <= 50) {
      for (let i = 1; i <= count; i++) {
        const fieldsList: string[] = [];
        for (const f of fields) {
          const fieldNameTrimmed = f.fieldName.trim();
          if (fieldNameTrimmed && trimmedGroupName) {
            const childRepeatCount = f.repeatCount || 1;
            for (let j = 1; j <= childRepeatCount; j++) {
              if (childRepeatCount > 1) {
                fieldsList.push(`${trimmedGroupName}_${fieldNameTrimmed}_${j}_${i}`);
              } else {
                fieldsList.push(`${trimmedGroupName}_${fieldNameTrimmed}_${i}`);
              }
            }
          }
        }
        if (fieldsList.length > 0) {
          groupsList.push({
            instanceIndex: i,
            title: `${trimmedGroupName || 'Group'} #${i}`,
            fields: fieldsList,
          });
        }
      }
    }
    setPreviewGroups(groupsList);
  }, [fields, repeatCount, groupName]);

  // Field type list mapping
  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'textarea', label: 'Long Text (Textarea)' },
    { value: 'number', label: 'Number' },
    { value: 'select', label: 'Dropdown Selection' },
    { value: 'multiselect', label: 'Multi-Select Checkboxes' },
    { value: 'rating', label: 'Star Rating' },
    { value: 'checkbox', label: 'Single Checkbox (Boolean)' },
    { value: 'radio', label: 'Radio Button Selection' },
    { value: 'date', label: 'Date Picker' },
  ];

  const addField = () => {
    setFields([
      ...fields,
      {
        id: `field_${Date.now()}_${fields.length}`,
        fieldName: '',
        fieldType: 'text',
        isRequired: false,
        options: [],
        placeholder: '',
        repeatCount: 1,
      },
    ]);
  };

  const removeField = (index: number) => {
    if (fields.length <= 1) return;
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<FieldGroupChildField>) => {
    setFields(
      fields.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  const handleSave = () => {
    const newErrors: string[] = [];
    const trimmedGroupName = groupName.trim();

    if (!trimmedGroupName) {
      newErrors.push('Group Name is required.');
    }

    const count = Number(repeatCount);
    if (isNaN(count) || count < 1 || count > 50) {
      newErrors.push('Repeat Count must be between 1 and 50.');
    }

    if (fields.length === 0) {
      newErrors.push('Field Group must contain at least 1 field.');
    }

    const fieldNames = new Set<string>();
    fields.forEach((f, idx) => {
      const name = f.fieldName.trim();
      if (!name) {
        newErrors.push(`Field #${idx + 1} name cannot be empty.`);
      } else if (fieldNames.has(name.toLowerCase())) {
        newErrors.push(`Duplicate field name "${name}" in the group.`);
      } else {
        fieldNames.add(name.toLowerCase());
      }

      if (f.repeatCount !== undefined) {
        const childCount = Number(f.repeatCount);
        if (isNaN(childCount) || childCount < 1 || childCount > 50) {
          newErrors.push(`Field "${name || `#${idx + 1}`}" repeat count must be between 1 and 50.`);
        }
      }

      if (['select', 'multiselect', 'radio'].includes(f.fieldType) && (!f.options || f.options.length === 0)) {
        newErrors.push(`Field "${name || `#${idx + 1}`}" requires dropdown options.`);
      }
    });

    // Collision check on generated suffixed labels
    if (count > 0 && count <= 50) {
      for (let i = 1; i <= count; i++) {
        for (const f of fields) {
          const name = f.fieldName.trim();
          if (!name) continue;
          const childRepeatCount = f.repeatCount || 1;
          for (let j = 1; j <= childRepeatCount; j++) {
            const generatedLabel = childRepeatCount > 1
              ? `${trimmedGroupName}_${name}_${j}_${i}`
              : `${trimmedGroupName}_${name}_${i}`;
            if (existingColumnNames.has(generatedLabel.toLowerCase())) {
              newErrors.push(
                `Collision error: Generated field "${generatedLabel}" already exists in the dataset schema or new columns.`
              );
            }
          }
        }
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    onSave({
      groupId: existingGroup?.groupId || `group_${Date.now()}`,
      groupName: trimmedGroupName,
      repeatCount: count,
      fields: fields.map(f => ({
        fieldName: f.fieldName.trim(),
        fieldType: f.fieldType,
        isRequired: f.isRequired,
        repeatCount: f.repeatCount || 1,
        options: f.options?.map(opt => opt.trim()).filter(Boolean) || [],
        placeholder: f.placeholder?.trim() || '',
        defaultValue: f.defaultValue,
        maxLength: f.maxLength,
        min: f.min,
        max: f.max,
        step: f.step,
        rangeStart: f.rangeStart,
        rangeEnd: f.rangeEnd,
        rangeStep: f.rangeStep,
        maxSelections: f.maxSelections,
        minDate: f.minDate,
        maxDate: f.maxDate,
        maxRating: f.maxRating,
        allowHalf: f.allowHalf,
        rows: f.rows,
        id: f.id || `field_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        questionTitle: f.questionTitle,
        questionDescription: f.questionDescription,
        helpText: f.helpText,
        section: f.section,
        visibilityRule: f.visibilityRule,
        branching: f.branching ? structuredClone(f.branching) : undefined,
      })),
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            {existingGroup ? 'Edit Repeatable Field Group' : 'Add Repeatable Field Group'}
          </h3>
          <p className="text-xs text-gray-500">
            Define a group of fields to be repeated dynamically.
          </p>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {/* Errors list */}
        {errors.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-700 space-y-1">
            <p className="font-bold">Validation Errors:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left/Middle block: Inputs & Fields */}
          <div className="md:col-span-2 space-y-4">
            {/* Group Meta */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-600">Group Name</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Defect Details"
                  className="h-8 text-xs mt-1"
                  disabled={false}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600">Repeat Count (1-50)</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="h-8 text-xs mt-1"
                  disabled={false}
                />
              </div>
            </div>

            {/* Child Fields list */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-gray-700">Fields inside group</Label>
                  <Button
                    onClick={addField}
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] text-green-600 hover:text-green-700 border-green-200"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Child Field
                  </Button>
              </div>

              <div className="space-y-2 border border-gray-100 rounded-md p-2 bg-gray-50/50 max-h-[350px] overflow-y-auto">
                {fields.map((field, index) => {
                  const isExpanded = expandedFields.has(index);
                  const isInputType = [
                    'text',
                    'textarea',
                    'number',
                    'select',
                    'selectrange',
                    'radio',
                    'checkbox',
                    'multiselect',
                    'date',
                    'rating',
                  ].includes(field.fieldType);

                  return (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded p-3 space-y-2 relative shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-4">
                            <Label className="text-[10px] text-gray-500 font-bold">Field Name</Label>
                            <Input
                              value={field.fieldName}
                              onChange={(e) => updateField(index, { fieldName: e.target.value })}
                              placeholder="e.g. Severity"
                              className="h-8 text-xs mt-0.5"
                              disabled={false}
                            />
                          </div>
                          <div className="col-span-4">
                            <Label className="text-[10px] text-gray-500 font-bold">Field Type</Label>
                            <select
                              value={field.fieldType}
                              onChange={(e) => {
                                const newType = e.target.value as 'text' | 'number' | 'select' | 'selectrange' | 'textarea' | 'rating' | 'multiselect' | 'checkbox' | 'radio' | 'date';
                                updateField(index, {
                                  fieldType: newType,
                                  options: [],
                                  placeholder: '',
                                  defaultValue: undefined,
                                  maxLength: undefined,
                                  min: undefined,
                                  max: undefined,
                                  step: undefined,
                                  rangeStart: undefined,
                                  rangeEnd: undefined,
                                  rangeStep: undefined,
                                  maxSelections: undefined,
                                  minDate: undefined,
                                  maxDate: undefined,
                                  maxRating: undefined,
                                  allowHalf: undefined,
                                  rows: undefined,
                                });
                              }}
                              className="w-full h-8 px-2 py-1 mt-0.5 border border-gray-300 bg-white rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              disabled={false}
                            >
                              {fieldTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-[10px] text-gray-500 font-bold">Repeat Count</Label>
                            <Input
                              type="number"
                              min={1}
                              max={50}
                              value={field.repeatCount || 1}
                              onChange={(e) => {
                                const val = Math.min(50, Math.max(1, parseInt(e.target.value) || 1));
                                updateField(index, { repeatCount: val });
                              }}
                              className="h-8 text-xs mt-0.5"
                              disabled={false}
                            />
                          </div>
                          <div className="col-span-2 flex items-center space-x-1 mb-1 justify-end">
                            {isInputType && (
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => toggleFieldExpanded(index)}
                                className="h-8 w-8 p-0"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {!isLocked && fields.length > 1 && (
                              <Button
                                variant="ghost"
                                type="button"
                                onClick={() => removeField(index)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 pt-1">
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="checkbox"
                            id={`req-${index}`}
                            checked={field.isRequired}
                            onChange={(e) => updateField(index, { isRequired: e.target.checked })}
                            disabled={false}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <label htmlFor={`req-${index}`} className="text-[10px] text-gray-600 cursor-pointer font-medium select-none">
                            Required field
                          </label>
                        </div>
                      </div>

                      {/* Collapsible config panel */}
                      {isExpanded && isInputType && (
                        <div className="border-t border-gray-100 pt-3 mt-2 bg-gray-50/50 p-2.5 rounded-md border border-gray-100 space-y-4">
                          <FieldTypeConfigurator
                            type={field.fieldType}
                            field={field}
                            onChange={(updates) => updateField(index, updates)}
                            isLocked={isLocked}
                          />
                          {/* Recursive Branching Editor for choice types inside group fields */}
                          {['radio', 'multiselect', 'select', 'rating', 'checkbox'].includes(field.fieldType) && !isLocked && (
                            <div className="pt-3 border-t border-gray-200">
                              <RecursiveFieldEditor
                                field={field as unknown as AnnotationField}
                                depth={0}
                                onChange={(updated) => updateField(index, updated as unknown as FieldGroupChildField)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right block: Live suffix preview list grouped by card */}
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50 flex flex-col max-h-[400px]">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-700 pb-2 border-b border-gray-200 mb-3">
              <Eye className="h-3.5 w-3.5 text-blue-500" />
              <span>Live Generated Fields</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {previewGroups.length > 0 ? (
                previewGroups.map((group) => (
                  <div
                    key={group.instanceIndex}
                    className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                  >
                    {/* Group Title Header */}
                    <div className="bg-gray-50 px-2.5 py-1.5 border-b border-gray-200 flex justify-between items-center text-[11px] font-bold text-gray-700">
                      <span className="capitalize">{group.title}</span>
                      <span className="text-[9px] bg-blue-50 text-blue-600 font-semibold px-1.5 py-0.5 rounded">
                        Card #{group.instanceIndex}
                      </span>
                    </div>
                    {/* Fields List */}
                    <div className="p-2 space-y-1 bg-white">
                      {group.fields.map((label, fIdx) => (
                        <div
                          key={fIdx}
                          className="bg-slate-50 border border-gray-100 rounded px-2 py-1 text-[10px] text-gray-600 font-mono flex items-center justify-between"
                        >
                          <span>{label}</span>
                          <span className="text-[8px] text-gray-400 font-sans font-medium">
                            Field Generated
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 text-xs py-8 h-full flex flex-col justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-300" />
                  <p>Awaiting valid field names...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="border-t border-gray-100 pt-3 flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-8 text-xs bg-white text-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {existingGroup ? 'Update Group' : 'Add Group'}
          </Button>
        </div>
      </div>
    </div>
  );
}
