'use client';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't show header on auth pages
  const isAuthPage = pathname?.startsWith('/auth');
  
  return (
    <div className="min-h-screen">
      {!isAuthPage && <Header />}
      <main className={`w-full ${!isAuthPage ? '' : ''}`}>
        {children}
      </main>
    </div>
  );
}