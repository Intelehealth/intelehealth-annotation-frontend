'use client';

import React, { useState, useCallback, useRef, useEffect, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCcw, PictureInPicture2 } from 'lucide-react';
import { MagnifierLens, lensOf, type LensSettings } from './magnifier';

interface ImageOverlayProps {
  isOpen: boolean;
  imageUrl: string;
  imageUrls: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  /** Hover magnifier settings from the image field; defaults apply when absent. */
  lens?: LensSettings | null;
}

interface VideoOverlayProps {
  isOpen: boolean;
  videoUrl: string;
  videoUrls: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

// Zoom is a plain pan/zoom transform in container pixels:
// screen = translate(tx, ty) · scale(s) · image. Zooming about a point p keeps
// p fixed: tx' = p.x − (p.x − tx)·k, k = s'/s. Panning clamps so the image box
// never leaves the viewport.
type ZoomState = { scale: number; tx: number; ty: number };

const MIN_SCALE = 1;
const MAX_SCALE = 16;
const ZOOM_RATIO = 1.25;
const DBLCLICK_SCALE = 3;
const RESET: ZoomState = { scale: 1, tx: 0, ty: 0 };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function clampPan(z: ZoomState, w: number, h: number): ZoomState {
  if (z.scale <= 1) return RESET;
  return { ...z, tx: clamp(z.tx, w - w * z.scale, 0), ty: clamp(z.ty, h - h * z.scale, 0) };
}

function zoomAbout(z: ZoomState, next: number, px: number, py: number, w: number, h: number): ZoomState {
  const scale = clamp(next, MIN_SCALE, MAX_SCALE);
  const k = scale / z.scale;
  return clampPan({ scale, tx: px - (px - z.tx) * k, ty: py - (py - z.ty) * k }, w, h);
}

export function ImageOverlay({
  isOpen,
  imageUrl,
  imageUrls,
  currentIndex,
  onClose,
  onNavigate,
  lens,
}: ImageOverlayProps) {
  const magnifier = lensOf(lens);
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState<ZoomState>(RESET);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const box = () => {
    const r = containerRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 1, h: r?.height ?? 1, left: r?.left ?? 0, top: r?.top ?? 0 };
  };

  const resetZoom = useCallback(() => setZoom(RESET), []);

  const zoomBy = useCallback((ratio: number, clientX?: number, clientY?: number) => {
    const { w, h, left, top } = box();
    const px = clientX === undefined ? w / 2 : clientX - left;
    const py = clientY === undefined ? h / 2 : clientY - top;
    setZoom((z) => zoomAbout(z, z.scale * ratio, px, py, w, h));
  }, []);

  // React attaches wheel listeners passively, so preventDefault there is a
  // no-op and the page behind the overlay would scroll. Bind natively.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isOpen) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      // Trackpads send many small deltas; mice send ±100. Scale the step so
      // both feel the same.
      const ratio = Math.exp(-e.deltaY * 0.0025);
      zoomBy(ratio, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isOpen, zoomBy, imageUrl]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom.scale <= 1 || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, tx: zoom.tx, ty: zoom.ty };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const { w, h } = box();
    setZoom((z) => clampPan({ ...z, tx: d.tx + (e.clientX - d.x), ty: d.ty + (e.clientY - d.y) }, w, h));
  };
  const onPointerUp = () => { dragRef.current = null; setDragging(false); };

  const onDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    const { w, h, left, top } = box();
    setZoom((z) => (z.scale > 1 ? RESET : zoomAbout(z, DBLCLICK_SCALE, e.clientX - left, e.clientY - top, w, h)));
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft': resetZoom(); onNavigate('prev'); break;
        case 'ArrowRight': resetZoom(); onNavigate('next'); break;
        case '=': case '+': zoomBy(ZOOM_RATIO); break;
        case '-': zoomBy(1 / ZOOM_RATIO); break;
        case '0': resetZoom(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, onNavigate, zoomBy, resetZoom]);

  if (!isOpen) return null;

  const zoomed = zoom.scale > 1;
  const ctl = 'p-1.5 bg-gray-700 rounded-md border border-gray-600 text-gray-200 hover:bg-gray-600 disabled:opacity-40 transition-colors';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg p-3">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 text-white z-30 bg-gray-600 hover:bg-gray-500 rounded-full p-2.5 transition-colors shadow-lg"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="absolute top-4 left-4 flex items-center space-x-1 z-30">
          <button onClick={() => zoomBy(1 / ZOOM_RATIO)} disabled={zoom.scale <= MIN_SCALE} className={ctl} title="Zoom out (-)">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="px-2 py-1 bg-gray-700 rounded text-xs border border-gray-600 min-w-[52px] text-center text-gray-200 font-mono">
            {Math.round(zoom.scale * 100)}%
          </span>
          <button onClick={() => zoomBy(ZOOM_RATIO)} disabled={zoom.scale >= MAX_SCALE} className={ctl} title="Zoom in (+)">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={resetZoom} disabled={!zoomed} className={`${ctl} ml-1`} title="Fit to screen (0)">
            <RotateCcw className="h-4 w-4" />
          </button>
          <span className="ml-3 hidden sm:inline text-[11px] text-gray-400">
            {magnifier.enabled ? `Hover magnifies ${Math.round(magnifier.zoom * 100)}% · ` : ''}Scroll to zoom · drag to pan · double-click for {DBLCLICK_SCALE}x
          </span>
        </div>

        <div
          ref={containerRef}
          className="overflow-hidden rounded-lg relative select-none bg-gray-900 touch-none"
          style={{
            width: '85vw',
            height: '85vh',
            maxWidth: '1400px',
            maxHeight: '1000px',
            cursor: zoomed ? (dragging ? 'grabbing' : 'grab') : magnifier.enabled ? 'crosshair' : 'zoom-in',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
        >
          <img
            ref={imgRef}
            key={imageUrl}
            src={imageUrl}
            alt="Full size"
            draggable={false}
            className="w-full h-full select-none"
            style={{
              objectFit: 'contain',
              transform: `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.scale})`,
              transformOrigin: '0 0',
              transition: dragging ? 'none' : 'transform 0.12s ease-out',
              willChange: 'transform',
            }}
            onLoad={resetZoom}
          />
          {magnifier.enabled && (
            <MagnifierLens
              containerRef={containerRef}
              imgRef={imgRef}
              src={imageUrl}
              zoom={magnifier.zoom}
              radius={magnifier.radius}
              active={!zoomed && !dragging}
            />
          )}
        </div>

        {imageUrls.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-3 z-30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { resetZoom(); onNavigate('prev'); }}
              disabled={currentIndex === 0}
              className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-200 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 bg-gray-700 rounded text-sm border border-gray-600 text-gray-200">
              {currentIndex + 1} / {imageUrls.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { resetZoom(); onNavigate('next'); }}
              disabled={currentIndex === imageUrls.length - 1}
              className="bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-200 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function VideoOverlay({
  isOpen,
  videoUrl,
  videoUrls,
  currentIndex,
  onClose,
  onNavigate,
}: VideoOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, []);

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // PiP not supported
    }
  }, []);

  useEffect(() => {
    handleSpeedChange(1);
  }, [videoUrl, handleSpeedChange]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate('prev');
      if (e.key === 'ArrowRight' && currentIndex < videoUrls.length - 1) onNavigate('next');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNavigate, currentIndex, videoUrls.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-5xl w-full mx-4 shadow-xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-white">Video Player</h3>
            {videoUrls.length > 1 && (
              <span className="text-sm text-gray-400 ml-2">
                {currentIndex + 1} / {videoUrls.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white rounded-full p-1 hover:bg-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="bg-black rounded-lg overflow-hidden relative">
          <video
            ref={videoRef}
            controls
            className="w-full max-h-[75vh]"
            preload="auto"
            src={videoUrl}
          >
            Your browser does not support the video element.
          </video>
        </div>

        <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Speed:</span>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <button
            onClick={togglePiP}
            className="flex items-center space-x-1 px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            title="Picture-in-Picture"
          >
            <PictureInPicture2 className="h-3.5 w-3.5 mr-1" />
            PiP
          </button>
        </div>

        {videoUrls.length > 1 && (
          <div className="mt-4 flex items-center justify-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('prev')}
              disabled={currentIndex === 0}
              className="bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('next')}
              disabled={currentIndex === videoUrls.length - 1}
              className="bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        <div className="mt-3 text-sm text-gray-500">
          <p className="truncate">{videoUrl}</p>
        </div>
      </div>
    </div>
  );
}