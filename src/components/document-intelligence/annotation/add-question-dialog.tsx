'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fieldSelectionAPI } from '@/lib/api/field-config';

const FIELD_TYPES = [
  'text',
  'number',
  'textarea',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'date',
  'rating',
] as const;

const CHOICE_TYPES = ['select', 'multiselect', 'radio', 'checkbox'];

interface ChildField {
  id: string;
  name: string;
  type: string;
}

interface AddQuestionDialogProps {
  datasetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
  initialQuestion?: string | null;
}

/**
 * Explicitly adds an annotation question (optionally with options and NESTED
 * child questions via branching) to the existing (real) field configuration.
 * Never auto-creates — always requires the user to confirm Add.
 */
export function AddQuestionDialog({
  datasetId,
  open,
  onOpenChange,
  onAdded,
  initialQuestion,
}: AddQuestionDialogProps) {
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<string>('text');
  const [options, setOptions] = useState<string[]>([]);
  const [children, setChildren] = useState<Record<string, ChildField[]>>({});
  const [openOptions, setOpenOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialQuestion) setFieldName(initialQuestion);
  }, [open, initialQuestion]);

  const isChoice = CHOICE_TYPES.includes(fieldType);
  const hasChildren = Object.values(children).some((arr) => arr.length > 0);

  const addOption = () => {
    const value = `Option ${options.length + 1}`;
    setOptions((prev) => [...prev, value]);
    setChildren((prev) => ({ ...prev, [value]: [] }));
  };

  const updateOption = (index: number, value: string) => {
    const old = options[index];
    const next = [...options];
    next[index] = value;
    setOptions(next);
    if (old !== value && children[old]) {
      setChildren((prev) => {
        const copy = { ...prev };
        copy[value] = copy[old] || [];
        delete copy[old];
        return copy;
      });
    }
  };

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setChildren((prev) => {
      const copy = { ...prev };
      delete copy[options[index]];
      return copy;
    });
  };

  const addChild = (optionValue: string) => {
    setChildren((prev) => ({
      ...prev,
      [optionValue]: [
        ...(prev[optionValue] || []),
        { id: `c-${Date.now()}`, name: '', type: 'text' },
      ],
    }));
  };

  const updateChild = (optionValue: string, childId: string, patch: Partial<ChildField>) => {
    setChildren((prev) => ({
      ...prev,
      [optionValue]: (prev[optionValue] || []).map((c) =>
        c.id === childId ? { ...c, ...patch } : c,
      ),
    }));
  };

  const removeChild = (optionValue: string, childId: string) => {
    setChildren((prev) => ({
      ...prev,
      [optionValue]: (prev[optionValue] || []).filter((c) => c.id !== childId),
    }));
  };

  const toChildField = (c: ChildField) => ({
    id: c.id,
    fieldName: c.name,
    csvColumnName: c.name,
    fieldType: 'text',
    columnType: c.type || 'text',
    isRequired: false,
    isAnnotationField: true,
    isNewColumn: true,
  });

  const handleAdd = async () => {
    const name = fieldName.trim();
    if (!name) {
      setError('Question text is required.');
      return;
    }
    if (!options.length && isChoice) {
      setError('Add at least one option for a choice field.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const config = await fieldSelectionAPI.getDatasetFieldConfig(datasetId);
      const existing: any[] = (config as any)?.annotationFields || [];
      if (existing.some((f) => f.fieldName === name)) {
        setError('A field with this name already exists.');
        setSaving(false);
        return;
      }
      const newField: any = {
        id: `field-${Date.now()}`,
        fieldName: name,
        csvColumnName: name,
        fieldType: 'text',
        columnType: fieldType,
        isRequired: false,
        isAnnotationField: true,
        isNewColumn: true,
      };
      if (isChoice) {
        newField.options = options.slice();
        if (hasChildren) {
          newField.branching = {
            options: options.map((v) => ({
              value: v,
              descriptionPlaceholder: '',
              requireDescription: false,
              childFields: (children[v] || []).filter((c) => c.name.trim()).map(toChildField),
            })),
          };
        }
      }
      const payload = {
        datasetId,
        annotationFields: [...existing, newField],
        annotationLabels: (config as any)?.annotationLabels || [],
        newColumns: (config as any)?.newColumns || [],
        fieldGroups: (config as any)?.fieldGroups || [],
      };
      await fieldSelectionAPI.saveDatasetFieldConfig(payload as any);
      setFieldName('');
      setFieldType('text');
      setOptions([]);
      setChildren({});
      onAdded();
      onOpenChange(false);
    } catch {
      setError('Could not save the annotation question.');
    } finally {
      setSaving(false);
    }
  };

  const activeChildren = isChoice && openOptions ? options : [];

  return (
    <DialogShell open={open} onOpenChange={onOpenChange} onAdd={handleAdd} saving={saving}>
      <div className="space-y-3">
        <div>
          <Label htmlFor="add-q-name">Question</Label>
          <Input
            id="add-q-name"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder="e.g. Vendor name"
          />
        </div>
        <div>
          <Label htmlFor="add-q-type">Field type</Label>
          <select
            id="add-q-type"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {isChoice && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
            <button
              type="button"
              onClick={() => setOpenOptions((o) => !o)}
              className="flex w-full items-center justify-between text-xs font-medium text-gray-700"
            >
              Options & nested questions
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openOptions ? 'rotate-180' : ''}`} />
            </button>
            {openOptions && (
              <div className="mt-2 space-y-2">
                {options.map((opt, oi) => (
                  <div key={oi} className="space-y-1 rounded border border-gray-200 bg-white p-2">
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(oi, e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Option value"
                      />
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removeOption(oi)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                    <div className="space-y-1.5 pl-1">
                      {(children[opt] || []).map((child) => (
                        <div key={child.id} className="flex items-center gap-1.5">
                          <Input
                            value={child.name}
                            onChange={(e) => updateChild(opt, child.id, { name: e.target.value })}
                            className="h-7 text-[11px]"
                            placeholder="Nested question"
                          />
                          <select
                            value={child.type}
                            onChange={(e) => updateChild(opt, child.id, { type: e.target.value })}
                            className="h-7 rounded border border-gray-300 bg-white px-1 text-[11px]"
                          >
                            <option value="text">text</option>
                            <option value="number">number</option>
                            <option value="textarea">textarea</option>
                            <option value="date">date</option>
                          </select>
                          <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeChild(opt, child.id)}>
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => addChild(opt)}>
                        <Plus className="mr-1 h-3 w-3" /> Add nested question
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" className="w-full text-[11px]" onClick={addOption}>
                  <Plus className="mr-1 h-3 w-3" /> Add option
                </Button>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
        <p className="text-[11px] text-gray-400">
          {activeChildren.length ? 'Nested questions will be shown for the selected option during annotation.' : 'You can add options and nested child questions for choice fields.'}
        </p>
      </div>
    </DialogShell>
  );
}

function DialogShell({
  open,
  onOpenChange,
  onAdd,
  saving,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: () => void;
  saving: boolean;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="mb-4 text-base font-semibold text-gray-800">Add Annotation Question</h3>
        {children}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onAdd} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </div>
    </div>
  );
}