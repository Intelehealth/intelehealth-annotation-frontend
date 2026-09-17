/** Shared glassmorphism TopNav for authenticated pages */
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileNav } from '@/components/mobile-nav';

interface TopNavProps {
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: React.ReactNode;
  /** When false, the mobile hamburger is omitted (e.g. when the layout already provides it). */
  showMobileNav?: boolean;
}

export function TopNav({ onRefresh, refreshing, children, showMobileNav = true }: TopNavProps) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled ? 'bg-white/90 backdrop-blur-md border-b border-gray-200/70 shadow-sm' : 'bg-white/60 backdrop-blur-sm'
      )}
    >
      <div className="flex items-center justify-between px-4 md:px-6 h-16 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          {showMobileNav && <MobileNav />}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          {children}
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="h-9 gap-1.5 text-sm flex-shrink-0">
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}