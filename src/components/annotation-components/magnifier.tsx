'use client';

import { useEffect, useRef, type RefObject } from 'react';

// A circular magnifier that follows the cursor over an image shown with
// object-fit: contain. It paints the same image as a background, scaled by
// `zoom`, positioned so the pixel under the cursor sits at the lens centre.

export type LensSettings = { lensEnabled?: boolean; lensZoom?: number; lensRadius?: number };
export type Lens = { enabled: boolean; zoom: number; radius: number };

export const LENS_DEFAULTS: Lens = { enabled: true, zoom: 1.5, radius: 80 };
export const LENS_ZOOM_RANGE = { min: 1.1, max: 8 };
export const LENS_RADIUS_RANGE = { min: 20, max: 300 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function lensOf(f?: LensSettings | null): Lens {
  return {
    enabled: f?.lensEnabled ?? LENS_DEFAULTS.enabled,
    zoom: clamp(Number(f?.lensZoom) || LENS_DEFAULTS.zoom, LENS_ZOOM_RANGE.min, LENS_ZOOM_RANGE.max),
    radius: clamp(Number(f?.lensRadius) || LENS_DEFAULTS.radius, LENS_RADIUS_RANGE.min, LENS_RADIUS_RANGE.max),
  };
}

/** Where the image's pixels actually are inside an object-fit: contain box. */
function containBox(img: HTMLImageElement) {
  const r = img.getBoundingClientRect();
  const natW = img.naturalWidth, natH = img.naturalHeight;
  if (!natW || !natH || !r.width || !r.height) return null;
  const scale = Math.min(r.width / natW, r.height / natH);
  const w = natW * scale, h = natH * scale;
  return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, w, h };
}

export function MagnifierLens({
  containerRef,
  imgRef,
  src,
  zoom,
  radius,
  active,
}: {
  containerRef: RefObject<HTMLElement | null>;
  imgRef: RefObject<HTMLImageElement | null>;
  src: string;
  zoom: number;
  radius: number;
  active: boolean;
}) {
  const lensRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    const lens = lensRef.current;
    if (!el || !lens) return;
    const hide = () => { lens.style.display = 'none'; };
    if (!active) { hide(); return; }

    const move = (e: PointerEvent) => {
      const img = imgRef.current;
      const box = img && containBox(img);
      if (!box) return hide();
      const x = e.clientX - box.left, y = e.clientY - box.top;
      if (x < 0 || y < 0 || x > box.w || y > box.h) return hide();
      const c = el.getBoundingClientRect();
      lens.style.display = 'block';
      lens.style.left = `${e.clientX - c.left - radius}px`;
      lens.style.top = `${e.clientY - c.top - radius}px`;
      lens.style.backgroundSize = `${box.w * zoom}px ${box.h * zoom}px`;
      lens.style.backgroundPosition = `${radius - x * zoom}px ${radius - y * zoom}px`;
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', hide);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', hide); hide(); };
  }, [containerRef, imgRef, zoom, radius, active, src]);

  return (
    <div
      ref={lensRef}
      aria-hidden
      className="pointer-events-none absolute z-20 rounded-full border-2 border-white/90 bg-gray-900"
      style={{
        display: 'none',
        width: radius * 2,
        height: radius * 2,
        boxShadow: '0 0 0 1px rgba(0,0,0,.4), 0 6px 24px rgba(0,0,0,.45)',
        backgroundImage: `url("${src}")`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

// A sample picture with fine detail, so the magnifier can be tried while
// configuring it without needing a row of real data.
export const LENS_SAMPLE_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
      <defs><pattern id='g' width='20' height='20' patternUnits='userSpaceOnUse'>
        <path d='M20 0H0V20' fill='none' stroke='#cbd5e1' stroke-width='1'/></pattern></defs>
      <rect width='600' height='400' fill='#f8fafc'/><rect width='600' height='400' fill='url(#g)'/>
      <circle cx='150' cy='130' r='70' fill='#fecaca'/><circle cx='150' cy='130' r='4' fill='#7f1d1d'/>
      <circle cx='420' cy='240' r='90' fill='#bfdbfe'/><circle cx='430' cy='230' r='3' fill='#1e3a8a'/>
      <text x='40' y='330' font-family='monospace' font-size='9' fill='#334155'>fine print 0123456789 abcdefghij — hover to read</text>
      <text x='300' y='60' font-family='sans-serif' font-size='28' fill='#0f172a'>Sample</text>
    </svg>`,
  );

/** The magnifier over a sample image, for the field editor. */
export function LensPreview({ lens }: { lens: Lens }) {
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  return (
    <div ref={box} className="relative h-44 w-full overflow-hidden rounded-md border border-gray-200 bg-gray-100" style={{ cursor: lens.enabled ? 'crosshair' : 'default' }}>
      <img ref={img} src={LENS_SAMPLE_SRC} alt="Magnifier preview" draggable={false} className="h-full w-full select-none object-contain" />
      <MagnifierLens containerRef={box} imgRef={img} src={LENS_SAMPLE_SRC} zoom={lens.zoom} radius={lens.radius} active={lens.enabled} />
      <span className="pointer-events-none absolute bottom-1 right-2 text-[10px] text-gray-500">
        {lens.enabled ? `move the cursor over the picture — ${Math.round(lens.zoom * 100)}%, r=${lens.radius}px` : 'magnifier off'}
      </span>
    </div>
  );
}
