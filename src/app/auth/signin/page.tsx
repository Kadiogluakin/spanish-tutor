'use client';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Suspense } from 'react';
import { Mail, Lock, User, ArrowRight, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { 
  checkAuthRateLimit, 
  resetAuthRateLimit, 
  validatePassword, 
  sanitizeAuthError, 
  isValidEmail, 
  getSecureRedirectUrl,
  logAuthSecurityEvent,
  type PasswordValidation 
} from '@/lib/auth-security';



export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInComponent />
    </Suspense>
  );
}

function SignInComponent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitTimer, setRateLimitTimer] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle rate limiting timer
  useEffect(() => {
    if (rateLimitTimer > 0) {
      const timer = setTimeout(() => setRateLimitTimer(rateLimitTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isRateLimited) {
      setIsRateLimited(false);
    }
  }, [rateLimitTimer, isRateLimited]);

  // Validate password strength in real-time for sign up
  useEffect(() => {
    if (isSignUp && password) {
      setPasswordValidation(validatePassword(password));
    } else {
      setPasswordValidation(null);
    }
  }, [password, isSignUp]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    // Rate limiting check
    const clientId = `${email}_${window.navigator.userAgent.slice(0, 50)}`;
    if (!checkAuthRateLimit(clientId)) {
      setIsRateLimited(true);
      setRateLimitTimer(300); // 5 minutes
      setError('Too many attempts. Please try again in 5 minutes.');
      logAuthSecurityEvent('RATE_LIMIT_EXCEEDED', { email, action: isSignUp ? 'signup' : 'signin' });
      return;
    }

    // Password strength validation for sign up
    if (isSignUp) {
      const validation = validatePassword(password);
      if (!validation.isValid) {
        setError(`Password requirements not met: ${validation.errors[0]}`);
        return;
      }
    }

    setLoading(true);

    try {
      const supabase = createClient();
      
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            data: {
              name: email.split('@')[0],
              level_cefr: 'A1'
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (error) {
          logAuthSecurityEvent('SIGNUP_FAILED', { email, error: error.message });
          console.error('Signup error details:', error);
          
          // Handle specific error cases
          if (error.message.includes('User already registered')) {
            setError('An account with this email already exists. Please sign in instead.');
            // Automatically switch to sign in mode
            setTimeout(() => {
              setIsSignUp(false);
              setError('');
            }, 3000);
          } else {
            setError(sanitizeAuthError(error.message));
          }
        } else if (data.user) {
          // Check if this is a new user or existing user
          // For existing users, Supabase still returns success but with different characteristics
          const isNewUser = data.user.created_at === data.user.updated_at && 
                           !data.user.email_confirmed_at;
          
          if (isNewUser) {
            logAuthSecurityEvent('SIGNUP_SUCCESS', { email });
            resetAuthRateLimit(clientId);
            setSuccess('¡Bienvenido! Account created successfully! Please check your email to confirm your account. The confirmation link expires in 24 hours.');
          } else {
            // Existing user - provide generic message to prevent email enumeration
            logAuthSecurityEvent('SIGNUP_EXISTING_USER', { email });
            setSuccess('If an account with this email exists, we\'ve sent a confirmation email. Please check your inbox.');
          }
          
          setIsSignUp(false);
          setEmail('');
          setPassword('');
          return;
        } else {
          // Handle case where no error but also no user (edge case)
          logAuthSecurityEvent('SIGNUP_INCOMPLETE', { email });
          setError('Account creation incomplete. Please try again.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });

        if (error) {
          logAuthSecurityEvent('SIGNIN_FAILED', { email, error: error.message });
          setError(sanitizeAuthError(error.message));
        } else if (data.user) {
          logAuthSecurityEvent('SIGNIN_SUCCESS', { email });
          resetAuthRateLimit(clientId);
          
          // Secure redirect
          const returnTo = searchParams.get('returnTo');
          const redirectUrl = getSecureRedirectUrl(returnTo || '/');
          
          router.push(redirectUrl);
          router.refresh();
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      logAuthSecurityEvent('UNEXPECTED_AUTH_ERROR', { email, error: error instanceof Error ? error.message : 'Unknown' });
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="relative inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mb-3 sm:mb-4 shadow-lg overflow-hidden">
            <Image
              src="/images/convos-logo.png"
              alt="ConVos Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Master Spanish with AI conversation practice
          </p>
        </div>

        {/* Main Card */}
        <Card className="card-elevated">
          <CardHeader className="text-center space-y-1 px-4 sm:px-6 pt-6 pb-4">
            <CardTitle className="text-xl sm:text-2xl">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {isSignUp 
                ? 'Start your Spanish learning journey today'
                : 'Continue your Spanish learning adventure'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 px-4 sm:px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 sm:h-12 text-sm sm:text-base"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 sm:h-12 text-sm sm:text-base"
                    placeholder={isSignUp ? "Create a secure password" : "Enter your password"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {isSignUp && password && passwordValidation && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            passwordValidation.strength === 'strong' ? 'bg-success w-full' :
                            passwordValidation.strength === 'medium' ? 'bg-warning w-2/3' :
                            'bg-destructive w-1/3'
                          }`}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordValidation.strength === 'strong' ? 'text-success' :
                        passwordValidation.strength === 'medium' ? 'text-warning' :
                        'text-destructive'
                      }`}>
                        {passwordValidation.strength.charAt(0).toUpperCase() + passwordValidation.strength.slice(1)}
                      </span>
                    </div>
                    
                    {passwordValidation.errors.length > 0 && (
                      <div className="space-y-1">
                        {passwordValidation.errors.map((err, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Messages */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-success font-medium">{success}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || isRateLimited || (isSignUp && passwordValidation?.isValid === false)}
                size="lg"
                className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold"
              >
                {isRateLimited ? (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Rate limited ({rateLimitTimer}s)
                  </div>
                ) : loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent"></div>
                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isSignUp ? <User className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </div>
                )}
              </Button>
            </form>



            {/* Toggle Auth Mode */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccess('');
                }}
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Create one"
                }
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-4 sm:mt-6 text-center space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground px-2">
            {isSignUp 
              ? 'Join thousands of students learning Spanish with AI'
              : 'Your learning progress is automatically saved'
            }
          </p>
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs text-muted-foreground flex-wrap">
            <span>• Personalized lessons</span>
            <span>• Voice AI teacher</span>
            <span>• Progress tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
}