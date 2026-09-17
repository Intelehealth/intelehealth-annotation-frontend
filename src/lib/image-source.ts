// How a cell's value turns into images on screen.
//
// A column can hold a URL, a base64 payload, or raw binary bytes, and it can
// hold one image or several separated by a delimiter the dataset chose. This
// resolves any of those into `src` values an <img> can use.
//
// Remote URLs go through the backend image proxy: it adds the dataset's stored
// credentials for private hosts, and it sidesteps CORS and hotlink blocking,
// neither of which the browser can do on its own.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type ImageSourceFormat = 'url' | 'base64' | 'binary';

export interface ImageFieldConfig {
  /** What the column holds. Default: url. */
  imageFormat?: ImageSourceFormat;
  /** Whether one cell may hold several images. Default: true. */
  imageMultiple?: boolean;
  /** Separator between images when there are several. Default: comma or newline. */
  imageDelimiter?: string;
  /** Media type for base64/binary payloads that do not declare one. */
  imageMimeType?: string;
}

export const IMAGE_FORMATS: { value: ImageSourceFormat; label: string; hint: string }[] = [
  { value: 'url', label: 'URL', hint: 'Each value is a link to the image (http or https).' },
  { value: 'base64', label: 'Base64', hint: 'Each value is the encoded image itself, with or without a data: prefix.' },
  { value: 'binary', label: 'Binary', hint: 'Raw bytes, as a byte array or hex string, stored in the cell.' },
];

export const IMAGE_DELIMITERS: { label: string; value: string }[] = [
  { label: 'Comma', value: ',' },
  { label: 'Semicolon', value: ';' },
  { label: 'Pipe', value: '|' },
  { label: 'New line', value: '\n' },
  { label: 'Space', value: ' ' },
];

const DEFAULT_MIME = 'image/jpeg';

/** Splits a raw cell value into one entry per image. */
export function splitImageValue(raw: unknown, cfg: ImageFieldConfig = {}): string[] {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);

  const value = typeof raw === 'string' ? raw : String(raw);
  if (!value.trim()) return [];
  if (cfg.imageMultiple === false) return [value.trim()];

  // A data: URI can legitimately contain commas, so only split on the
  // configured delimiter when the value is not a single data URI.
  if (/^data:image\//i.test(value.trim()) && !cfg.imageDelimiter) return [value.trim()];

  const delim = cfg.imageDelimiter;
  const parts = delim ? value.split(delim) : value.split(/[,\n]/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

const looksLikeUrl = (v: string) => /^https?:\/\//i.test(v);
const looksLikeDataUri = (v: string) => /^data:/i.test(v);
const looksLikeBase64 = (v: string) => v.length > 64 && /^[A-Za-z0-9+/\s]+={0,2}$/.test(v);
const looksLikeHex = (v: string) => v.length > 64 && /^(0x)?[0-9a-fA-F\s]+$/.test(v);

function hexToBase64(hex: string): string | null {
  const clean = hex.replace(/^0x/i, '').replace(/\s+/g, '');
  if (clean.length % 2 !== 0) return null;
  try {
    let binary = '';
    for (let i = 0; i < clean.length; i += 2) binary += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
    return typeof btoa === 'function' ? btoa(binary) : null;
  } catch {
    return null;
  }
}

export interface ResolvedImage {
  /** Value to put in <img src>. */
  src: string;
  /** The original cell entry, for links and error messages. */
  raw: string;
  kind: 'proxied-url' | 'direct-url' | 'data-uri';
}

/**
 * Turns one entry into something renderable. `datasetId` enables the proxy for
 * remote URLs; without it the URL is used directly.
 */
export function resolveImage(entry: string, cfg: ImageFieldConfig = {}, datasetId?: string, version?: string | number): ResolvedImage | null {
  const value = (entry ?? '').trim();
  if (!value || value === '[object Object]') return null;
  const format = cfg.imageFormat ?? 'url';
  const mime = cfg.imageMimeType || DEFAULT_MIME;

  if (looksLikeDataUri(value)) return { src: value, raw: value, kind: 'data-uri' };

  if (format === 'base64' || (format !== 'url' && looksLikeBase64(value))) {
    const body = value.replace(/\s+/g, '');
    return { src: `data:${mime};base64,${body}`, raw: value, kind: 'data-uri' };
  }

  if (format === 'binary') {
    const b64 = looksLikeHex(value) ? hexToBase64(value) : looksLikeBase64(value) ? value.replace(/\s+/g, '') : null;
    if (!b64) return null;
    return { src: `data:${mime};base64,${b64}`, raw: value, kind: 'data-uri' };
  }

  if (!looksLikeUrl(value)) return null;
  if (!datasetId) return { src: value, raw: value, kind: 'direct-url' };
  const v = version ? `&v=${encodeURIComponent(String(version))}` : '';
  return {
    src: `${API_BASE_URL}/image-proxy/${datasetId}?url=${encodeURIComponent(value)}${v}`,
    raw: value,
    kind: 'proxied-url',
  };
}

/** Every renderable image in one cell. */
export function resolveImages(raw: unknown, cfg: ImageFieldConfig = {}, datasetId?: string, version?: string | number): ResolvedImage[] {
  return splitImageValue(raw, cfg)
    .map((entry) => resolveImage(entry, cfg, datasetId, version))
    .filter((r): r is ResolvedImage => r !== null);
}
