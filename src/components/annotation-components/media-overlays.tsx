'use client';

import { useState, useCallback, useRef, useEffect, type MouseEvent, type WheelEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCcw, PictureInPicture2 } from 'lucide-react';

interface ImageOverlayProps {
  isOpen: boolean;
  imageUrl: string;
  imageUrls: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

interface VideoOverlayProps {
  isOpen: boolean;
  videoUrl: string;
  videoUrls: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

type ZoomState = {
  scale: number;
  x: number;
  y: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.5;
const MAGNIFIER_SIZE = 60;
const MAGNIFICATION = 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ImageOverlay({
  isOpen,
  imageUrl,
  imageUrls,
  currentIndex,
  onClose,
  onNavigate,
}: ImageOverlayProps) {
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const imgDisplaySizeRef = useRef({ left: 0, top: 0, width: 0, height: 0, rendW: 0, rendH: 0, offX: 0, offY: 0 });

  useEffect(() => {
    if (!imageUrl) return;
    setNaturalSize({ width: 0, height: 0 });
    const img = new Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      setNaturalSize({ width: 0, height: 0 });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const resetZoom = useCallback(() => {
    setZoom({ scale: 1, x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / rect.width;
    const mouseY = (e.clientY - rect.top) / rect.height;

    setZoom(prev => {
      let newScale = prev.scale + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
      newScale = clamp(newScale, MIN_SCALE, MAX_SCALE);

      if (newScale === 1) {
        return { scale: 1, x: 0, y: 0 };
      }

      const scaleDiff = newScale / prev.scale;
      const newX = mouseX * 100 - (mouseX * 100 - prev.x) * scaleDiff;
      const newY = mouseY * 100 - (mouseY * 100 - prev.y) * scaleDiff;

      return { scale: newScale, x: newX, y: newY };
    });
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (zoom.scale === 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - zoom.x, y: e.clientY - zoom.y });
  }, [zoom.scale, zoom.x, zoom.y]);

  const handleMouseMoveForDrag = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setZoom(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const updateLens = useCallback((cx: number, cy: number, lens: HTMLDivElement, img: HTMLImageElement) => {
    const imgRect = img.getBoundingClientRect();
    const dw = imgRect.width || 1;
    const dh = imgRect.height || 1;
    const natW = naturalSize.width || 1;
    const natH = naturalSize.height || 1;
    const contAspect = dw / dh;
    const imgAspect = natW / natH;
    let rendW: number, rendH: number, offX: number, offY: number;
    if (contAspect > imgAspect) {
      rendH = dh;
      rendW = rendH * imgAspect;
      offX = (dw - rendW) / 2;
      offY = 0;
    } else {
      rendW = dw;
      rendH = rendW / imgAspect;
      offX = 0;
      offY = (dh - rendH) / 2;
    }
    const inBounds =
      cx >= imgRect.left + offX &&
      cx <= imgRect.left + offX + rendW &&
      cy >= imgRect.top + offY &&
      cy <= imgRect.top + offY + rendH;
    if (!inBounds) {
      lens.style.display = 'none';
      return;
    }
    imgDisplaySizeRef.current = { left: imgRect.left, top: imgRect.top, width: dw, height: dh, rendW, rendH, offX, offY };
    lens.style.display = 'block';
    lens.style.left = `${cx - MAGNIFIER_SIZE / 2}px`;
    lens.style.top = `${cy - MAGNIFIER_SIZE + 2}px`;
    const relX = cx - imgRect.left - offX;
    const relY = cy - imgRect.top - offY;
    const nX = (relX / rendW) * natW;
    const nY = (relY / rendH) * natH;
    const bgX = -(nX * MAGNIFICATION - MAGNIFIER_SIZE / 2);
    const bgY = -(nY * MAGNIFICATION - MAGNIFIER_SIZE / 2);
    lens.style.backgroundPosition = `${bgX}px ${bgY}px`;
  }, [naturalSize]);

  const handleImageMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    if (zoom.scale > 1) {
      if (lensRef.current) lensRef.current.style.display = 'none';
      return;
    }
    const img = imageRef.current;
    const lens = lensRef.current;
    if (!img || !lens) return;
    updateLens(e.clientX, e.clientY, lens, img);
  }, [isDragging, zoom.scale, updateLens]);

  const handleImageMouseLeave = useCallback(() => {
    if (lensRef.current) lensRef.current.style.display = 'none';
  }, []);

  const zoomIn = useCallback(() => {
    setZoom(prev => {
      const newScale = clamp(prev.scale + ZOOM_STEP, MIN_SCALE, MAX_SCALE);
      if (newScale === 1) return { scale: 1, x: 0, y: 0 };
      return { ...prev, scale: newScale };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const newScale = clamp(prev.scale - ZOOM_STEP, MIN_SCALE, MAX_SCALE);
      if (newScale === 1) return { scale: 1, x: 0, y: 0 };
      return { ...prev, scale: newScale };
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft': resetZoom(); onNavigate('prev'); break;
        case 'ArrowRight': resetZoom(); onNavigate('next'); break;
        case '=': case '+': zoomIn(); break;
        case '-': zoomOut(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNavigate, zoomIn, zoomOut, resetZoom]);

  const isWheelZoomed = zoom.scale > 1;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg p-3">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 text-white z-30 bg-gray-600 hover:bg-gray-500 rounded-full p-2.5 transition-colors shadow-lg"
        >
          <X className="h-5 w-5" />
        </button>

        {isWheelZoomed && (
          <div className="absolute top-4 left-4 flex items-center space-x-1 z-30">
            <button
              onClick={zoomOut}
              disabled={zoom.scale <= MIN_SCALE}
              className="p-1.5 bg-gray-700 rounded-md border border-gray-600 text-gray-200 hover:bg-gray-600 disabled:opacity-40 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="px-2 py-1 bg-gray-700 rounded text-xs border border-gray-600 min-w-[44px] text-center text-gray-200 font-mono">
              {Math.round(zoom.scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={zoom.scale >= MAX_SCALE}
              className="p-1.5 bg-gray-700 rounded-md border border-gray-600 text-gray-200 hover:bg-gray-600 disabled:opacity-40 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={resetZoom}
              className="p-1.5 bg-gray-700 rounded-md border border-gray-600 text-gray-200 hover:bg-gray-600 transition-colors ml-1"
              title="Reset zoom (100%)"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        )}

        <div
          ref={containerRef}
          className="overflow-hidden rounded-lg relative select-none bg-gray-900"
          style={{
            width: '85vw',
            height: '85vh',
            maxWidth: '1400px',
            maxHeight: '1000px',
            cursor: isWheelZoomed ? 'grab' : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 26 26'%3E%3Cdefs%3E%3Cfilter id='s'%3E%3CfeDropShadow dx='0' dy='1' stdDeviation='1.5' flood-color='rgba(0,0,0,0.6)'/%3E%3C/filter%3E%3C/defs%3E%3Cg filter='url(%23s)'%3E%3Ccircle cx='11' cy='11' r='7' fill='rgba(255,255,255,0.15)' stroke='white' stroke-width='1.8'/%3E%3Cline x1='16' y1='16' x2='22' y2='22' stroke='white' stroke-width='2.5' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E") 11 11, auto`,
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => { handleImageMouseMove(e); handleMouseMoveForDrag(e); }}
          onMouseLeave={() => { handleImageMouseLeave(); handleMouseUp(); }}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Full size"
            draggable={false}
            className="w-full h-full select-none"
            style={{
              objectFit: 'contain',
              transform: isWheelZoomed
                ? `scale(${zoom.scale}) translate(${zoom.x}px, ${zoom.y}px)`
                : 'none',
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            }}
            onLoad={resetZoom}
          />

          <div
            ref={lensRef}
            className="pointer-events-none fixed z-20"
            style={{
              display: 'none',
              width: MAGNIFIER_SIZE,
              height: MAGNIFIER_SIZE,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.9)',
              boxShadow: '0 0 20px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.1)',
              imageRendering: 'auto',
              backgroundImage: `url(${imageUrl})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${naturalSize.width * MAGNIFICATION}px ${naturalSize.height * MAGNIFICATION}px`,
              backgroundPosition: '0px 0px',
            }}
          />
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