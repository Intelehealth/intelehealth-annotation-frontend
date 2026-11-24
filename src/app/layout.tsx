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
  // The site is light-only (forcedTheme below); ask dark-mode extensions not to recolour it.
  other: { 'darkreader-lock': '' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Stops the browser's automatic dark mode from guessing colours (it hid chart lines and legend dots).
  colorScheme: 'only light' as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
