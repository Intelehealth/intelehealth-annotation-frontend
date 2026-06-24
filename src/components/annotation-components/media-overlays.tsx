'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Volume2 } from 'lucide-react';

interface ImageOverlayProps {
  isOpen: boolean;
  imageUrl: string;
  imageUrls: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

interface AudioOverlayProps {
  isOpen: boolean;
  audioUrl: string;
  onClose: () => void;
}

export function ImageOverlay({
  isOpen,
  imageUrl,
  imageUrls,
  currentIndex,
  onClose,
  onNavigate,
}: ImageOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50">
      <div className="relative max-w-4xl max-h-full bg-white rounded-lg shadow-2xl p-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 z-10 bg-white/80 rounded-full p-1"
        >
          <X className="h-6 w-6" />
        </button>
        
        <img
          src={imageUrl}
          alt="Full size"
          className="max-w-full max-h-full object-contain"
        />
        
        {imageUrls.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('prev')}
              disabled={currentIndex === 0}
              className="bg-white/90 hover:bg-white border-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 bg-white/90 rounded text-sm border border-gray-300">
              {currentIndex + 1} / {imageUrls.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('next')}
              disabled={currentIndex === imageUrls.length - 1}
              className="bg-white/90 hover:bg-white border-gray-300"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function AudioOverlay({
  isOpen,
  audioUrl,
  onClose,
}: AudioOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Audio Player</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <audio
          controls
          className="w-full"
          src={audioUrl}
        >
          Your browser does not support the audio element.
        </audio>
        
        <div className="mt-4 text-sm text-gray-600">
          <p className="truncate">URL: {audioUrl}</p>
        </div>
      </div>
    </div>
  );
}
