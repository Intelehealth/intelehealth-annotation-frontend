'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultLeftWidth?: number; // percentage (0-100)
  minLeftWidth?: number; // percentage
  maxLeftWidth?: number; // percentage
  className?: string;
}

export function ResizablePanels({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 50,
  minLeftWidth = 20,
  maxLeftWidth = 80,
  className
}: ResizablePanelsProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = leftWidth;
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = e.clientX - startXRef.current;
    const deltaPercent = (deltaX / containerWidth) * 100;
    
    const newLeftWidth = Math.max(
      minLeftWidth,
      Math.min(maxLeftWidth, startWidthRef.current + deltaPercent)
    );
    
    setLeftWidth(newLeftWidth);
  }, [isResizing, minLeftWidth, maxLeftWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Add global mouse event listeners
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-col lg:flex-row h-full w-full overflow-y-auto lg:overflow-hidden", className)}
      style={{ '--left-w': `${leftWidth}%` } as React.CSSProperties}
    >
      {/* Left Panel */}
      <div
        className="flex-shrink-0 w-full min-w-0 lg:h-full lg:w-[var(--left-w)] lg:overflow-hidden"
      >
        {leftPanel}
      </div>

      {/* Resizable Divider (desktop only) */}
      <div
        className={cn(
          "hidden lg:flex flex-shrink-0 w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize transition-all duration-200 relative group",
          isResizing && "bg-blue-400 shadow-lg"
        )}
        onMouseDown={handleMouseDown}
      >
        {/* Invisible hit area for easier grabbing */}
        <div className="absolute inset-y-0 -left-3 -right-3 cursor-col-resize" />

        {/* Visual indicator with dots */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 flex flex-col justify-center items-center space-y-1">
          <div className="w-1 h-1 bg-gray-400 rounded-full group-hover:bg-gray-600 transition-colors duration-200" />
          <div className="w-1 h-1 bg-gray-400 rounded-full group-hover:bg-gray-600 transition-colors duration-200" />
          <div className="w-1 h-1 bg-gray-400 rounded-full group-hover:bg-gray-600 transition-colors duration-200" />
        </div>
      </div>

      {/* Right Panel */}
      <div
        className="flex-1 w-full min-w-0 lg:h-full lg:overflow-hidden"
      >
        {rightPanel}
      </div>
    </div>
  );
}
