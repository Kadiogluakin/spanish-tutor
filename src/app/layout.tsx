import '../styles/globals.css';
import React from 'react';
import { SessionProvider } from './providers';
import Header from '@/components/Header';

export const metadata = { title: 'Spanish Teacher', description: 'Personal daily Spanish teacher' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-neutral-900">
        <SessionProvider>
          <div className="min-h-screen">
            <Header />
            <main className="w-full">
              {children}
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
