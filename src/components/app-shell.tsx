'use client';

import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { Brand } from '@/components/brand';

/**
 * Responsive authenticated app shell used by the dashboard and
 * profile layouts.
 *
 * - Desktop (>= lg): renders the permanent sidebar exactly as before.
 * - Mobile/tablet (< lg): hides the permanent sidebar and instead shows a
 *   sticky top bar with a hamburger menu that opens the sidebar as a left
 *   slide-in drawer (with backdrop, Esc/backdrop to close, close on select,
 *   body scroll lock and smooth animations — all handled by <MobileNav>).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Permanent sidebar — desktop only (unchanged behavior) */}
      <Sidebar className="hidden lg:flex" />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile / tablet header with hamburger drawer trigger */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b border-gray-200/70 bg-white/90 backdrop-blur-md shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <MobileNav />
            <div className="flex items-center gap-2 min-w-0">
              <Brand size="sm" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
