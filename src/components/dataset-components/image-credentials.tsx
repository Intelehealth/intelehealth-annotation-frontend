'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { datasetsAPI } from '@/lib/api/datasets';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Credentials for a private image host.
 *
 * Images are fetched by the server, not the browser, so a host that needs a
 * login (an OpenMRS instance, an internal file server) works once its username
 * and password are stored here. The password is encrypted at rest and never
 * sent back to the browser.
 */
export function ImageCredentials({ datasetId, sampleUrl }: { datasetId: string; sampleUrl?: string }) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hasStored, setHasStored] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    datasetsAPI
      .getById(datasetId)
      .then((d) => {
        const cfg = (d as unknown as { imageAuthConfig?: { isPrivate?: boolean; username?: string } }).imageAuthConfig;
        setIsPrivate(!!cfg?.isPrivate);
        setUsername(cfg?.username ?? '');
        setHasStored(!!cfg?.username);
      })
      .catch(() => undefined);
  }, [datasetId]);

  const save = async () => {
    setSaving(true); setMessage(null);
    try {
      await datasetsAPI.update(datasetId, {
        imageAuthConfig: { isPrivate, username: username.trim(), ...(password ? { password } : {}) },
      });
      setPassword(''); setHasStored(!!username.trim());
      setMessage({ ok: true, text: 'Saved. Reload an annotation page to see the images.' });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setMessage({ ok: false, text: err?.response?.data?.message || err?.message || 'Could not save the credentials' });
    } finally { setSaving(false); }
  };

  // Loads one image through the proxy exactly as the annotation screen does.
  const test = async () => {
    if (!sampleUrl) return;
    setTesting(true); setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/image-proxy/${datasetId}?url=${encodeURIComponent(sampleUrl)}`);
      const type = res.headers.get('content-type') || '';
      if (res.ok && type.startsWith('image/')) setMessage({ ok: true, text: `The host returned an image (${type}).` });
      else if (res.status === 401 || res.status === 403) setMessage({ ok: false, text: 'The host refused the login. Check the username and password.' });
      else setMessage({ ok: false, text: `The host answered ${res.status}${type ? ` (${type})` : ''}, not an image.` });
    } catch {
      setMessage({ ok: false, text: 'Could not reach the image host from the server.' });
    } finally { setTesting(false); }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <KeyRound className="h-4 w-4 text-blue-600" />
        <div>
          <p className="text-sm font-semibold text-gray-800">Image credentials</p>
          <p className="text-xs text-gray-500">For image columns whose host needs a login. The server signs in, not the browser.</p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="rounded border-gray-300" />
          This dataset&apos;s images need a login
        </label>

        {isPrivate && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <Label className="text-[10px] font-bold uppercase text-gray-500">Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="mt-1 h-9" autoComplete="off" />
            </label>
            <label className="text-sm">
              <Label className="text-[10px] font-bold uppercase text-gray-500">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={hasStored ? 'unchanged' : 'password'}
                className="mt-1 h-9"
                autoComplete="new-password"
              />
            </label>
          </div>
        )}

        {message && <p className={`text-sm ${message.ok ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          {sampleUrl && (
            <Button size="sm" variant="outline" onClick={test} disabled={testing}>
              {testing && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Test one image
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save credentials
          </Button>
        </div>
      </div>
    </div>
  );
}
