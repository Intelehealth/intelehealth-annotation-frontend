import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/toast';
import { ThemeProvider } from 'next-themes';

export const metadata: Metadata = {
  title: 'Data Annotation Platform',
  description: 'A platform for data annotation and management',
  icons: {
    icon: '/favicon.ico?v=2',
    shortcut: '/favicon.ico?v=2',
    apple: '/favicon.ico?v=2',
  },
  // The site has its own dark mode; ask dark-mode extensions not to recolour it on top.
  other: { 'darkreader-lock': '' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Light and dark are both supported (globals.css), so the browser does not auto-darken the page.
  colorScheme: 'light dark' as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem enableColorScheme={false} disableTransitionOnChange>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
