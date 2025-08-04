'use client';
import { useAuth } from '@/app/providers';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { 
  Home, 
  BookOpen, 
  GraduationCap, 
  ClipboardList, 
  TrendingUp, 
  RotateCcw, 
  Settings, 
  User, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigationItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/lesson', label: 'Today\'s Lesson', icon: GraduationCap },
  { href: '/lessons', label: 'All Lessons', icon: BookOpen },
  { href: '/homework', label: 'Homework', icon: ClipboardList },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/review', label: 'Review', icon: RotateCcw },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/signin');
  };

  const isActivePath = (href: string) => {
    if (href === '/') return pathname === '/';
    // Exact match for /lesson to avoid conflict with /lessons
    if (href === '/lesson') return pathname === '/lesson';
    return pathname?.startsWith(href);
  };

  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-200">
                <Image
                  src="/images/convos-logo.png"
                  alt="ConVos Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-200">
                  ConVos
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">AI Spanish Tutor</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* User Menu & Mobile Controls */}
          <div className="flex items-center space-x-3">
            {user && (
              <>
                {/* User Profile */}
                <div className="hidden md:flex items-center space-x-3">
                  <div className="flex items-center space-x-2 px-3 py-2 bg-secondary rounded-lg">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {user.email?.split('@')[0] || 'Student'}
                    </span>
                  </div>
                  
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex items-center space-x-2"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </Button>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors duration-200"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <X className="w-5 h-5 text-foreground" />
                  ) : (
                    <Menu className="w-5 h-5 text-foreground" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {user && mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border bg-white/95 backdrop-blur-md">
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              
              {/* Mobile User Info & Sign Out */}
              <div className="pt-4 mt-4 border-t border-border space-y-3">
                <div className="flex items-center space-x-3 px-4 py-2 bg-secondary rounded-lg mx-0">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {user.email?.split('@')[0] || 'Student'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center space-x-3 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors duration-200 w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}