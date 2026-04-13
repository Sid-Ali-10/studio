import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/context/ThemeContext';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'GetMeDZ - P2P Marketplace for Travelers & Buyers',
  description: 'Connect with travelers and get items from abroad to Algeria.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><path d=%22M35 35V25C35 16.7 41.7 10 50 10C58.3 10 65 16.7 65 25V35%22 stroke=%22%231E3A8A%22 stroke-width=%228%22 stroke-linecap=%22round%22 fill=%22none%22/><path d=%22M20 35H80V80C80 85.5 75.5 90 70 90H30C24.5 90 20 85.5 20 80V35Z%22 fill=%22%233B82F6%22/><path d=%22M35 60L50 75L85 40L80 35L50 65L40 55L35 60Z%22 fill=%22%2310B981%22/></svg>',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground transition-colors duration-300">
        <FirebaseClientProvider>
          <AuthProvider>
            <ThemeProvider>
              <AppLayout>
                {children}
              </AppLayout>
              <Toaster />
            </ThemeProvider>
          </AuthProvider>
        </FirebaseClientProvider>
        <Script 
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" 
          strategy="lazyOnload" 
        />
      </body>
    </html>
  );
}
