/** Shared glassmorphism TopNav for authenticated pages */
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/sidebar';

interface TopNavProps {
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: React.ReactNode;
}

export function TopNav({ onRefresh, refreshing, children }: TopNavProps) {
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
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <Sidebar forceCollapsed={false} />
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex items-center gap-2">
          {children}
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="h-9 gap-1.5 text-sm">
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}