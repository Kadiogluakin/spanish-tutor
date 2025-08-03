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
      {/* suppressHydrationWarning prevents hydration mismatches from browser extensions like Grammarly */}
      <body className="min-h-screen bg-background text-foreground" suppressHydrationWarning={true}>
        <SessionProvider>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
