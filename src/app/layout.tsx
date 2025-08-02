import '../styles/globals.css';
import React from 'react';
import { SessionProvider } from './providers';
import ConditionalLayout from '@/components/ConditionalLayout';

export const metadata = { 
  title: 'ConVos - AI Spanish Tutor', 
  description: 'Master Spanish with AI conversation practice',
  icons: {
    icon: '/images/convos-logo.png',
    apple: '/images/convos-logo.png',
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <SessionProvider>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
