'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/sidebar';

/**
 * Mobile-only hamburger menu that opens the app Sidebar in a left drawer.
 * Automatically closes the drawer when the route changes (after selecting a
 * menu item) to prevent layout shifts and keep navigation friction-free.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 flex-shrink-0" aria-label="Open navigation menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-80 max-w-[85vw] sm:max-w-sm overflow-y-auto">
        <Sidebar forceCollapsed={false} />
      </SheetContent>
    </Sheet>
  );
}
