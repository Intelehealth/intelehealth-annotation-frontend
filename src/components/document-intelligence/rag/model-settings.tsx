'use client';

import { useEffect, useState } from 'react';
import { Settings2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ragAPI, RagPresetInfo } from '@/lib/api/rag';
import { useDocumentView } from '../context/document-view-context';

/**
 * Admin model-preference panel. Saves the per-dataset model (PATCH
 * /rag/settings dataset) and the caller's own user preference (PATCH
 * /rag/settings). Dropdown lists catalog-available presets only.
 */
export function ModelSettings() {
  const { datasetId, selectedModel, setSelectedModel } = useDocumentView();
  const [models, setModels] = useState<RagPresetInfo[]>([]);
  const [datasetModel, setDatasetModel] = useState(selectedModel);
  const [userModel, setUserModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    ragAPI
      .models()
      .then((list) => setModels(list))
      .catch(() => setModels([]));
    setDatasetModel(selectedModel);
  }, [datasetId, selectedModel]);

  const saveDataset = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await ragAPI.saveDatasetSettings(datasetId, { model: datasetModel });
      setSelectedModel((updated as any)?.model || datasetModel);
      setMessage('Dataset model preference saved.');
    } catch {
      setMessage('Could not save the dataset model preference.');
    } finally {
      setSaving(false);
    }
  };

  const saveUser = async () => {
    if (!userModel) return;
    setSaving(true);
    setMessage(null);
    try {
      await ragAPI.saveUserSettings({ preferredModel: userModel });
      setMessage('Your model preference saved.');
    } catch {
      setMessage('Could not save your model preference.');
    } finally {
      setSaving(false);
    }
  };

  const avail = models.filter((m) => m.available);

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-gray-600">Dataset model (precedence)</label>
        <select
          value={datasetModel}
          onChange={(e) => setDatasetModel(e.target.value)}
          className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none"
        >
          {models.map((m) => (
            <option key={m.key} value={m.key} disabled={!m.available}>
              {m.key}
              {!m.available ? ' (unavailable)' : ''}
            </option>
          ))}
          {models.length === 0 && <option value="GEMINI">GEMINI</option>}
        </select>
        {avail.length === 0 && (
          <p className="mt-1 text-[11px] text-amber-600">
            No model presets are available in the catalog (check RAG_MODEL_* env).
          </p>
        )}
        <Button
          size="sm"
          variant="outline"
          className="mt-1.5 w-full border-blue-200 text-blue-700 hover:bg-blue-50"
          onClick={saveDataset}
          disabled={saving}
        >
          {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Settings2 className="mr-1 h-3.5 w-3.5" />}
          Save dataset model
        </Button>
      </div>

      <div className="border-t border-gray-100 pt-2">
        <label className="mb-1 block text-[11px] font-medium text-gray-600">Your model preference (user)</label>
        <select
          value={userModel}
          onChange={(e) => setUserModel(e.target.value)}
          className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-xs focus:border-blue-500 focus:outline-none"
        >
          <option value="">— none (use dataset/workspace/env) —</option>
          {models.map((m) => (
            <option key={m.key} value={m.key} disabled={!m.available}>
              {m.key}
              {!m.available ? ' (unavailable)' : ''}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="ghost"
          className="mt-1.5 w-full text-blue-700"
          onClick={saveUser}
          disabled={saving || !userModel}
        >
          Save my preference
        </Button>
      </div>

      {message && <p className="text-[11px] text-gray-500">{message}</p>}
      <p className="text-[11px] text-gray-400">
        Precedence: request → user → dataset → workspace → env (RAG_MODEL_*).
      </p>
    </div>
  );
}