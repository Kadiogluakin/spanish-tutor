'use client';
import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/signin');
  };

  return (
    <header className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">🇪🇸</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Spanish Tutor
              </h1>
            </Link>
            
            {user && (
              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                  Dashboard
                </Link>
                <Link href="/lesson" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                  Today's Lesson
                </Link>
                <Link href="/lessons" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                  All Lessons
                </Link>
                <Link href="/homework" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                  Homework
                </Link>
                <Link href="/progress" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                  Progress
                </Link>
                <Link href="/review" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                  Review
                </Link>
                <Link href="/settings" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                  Settings
                </Link>
              </nav>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <span className="text-sm text-gray-600">
                  {user.email?.split('@')[0] || 'Student'}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}