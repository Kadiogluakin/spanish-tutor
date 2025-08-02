/**
 * Authentication security utilities
 */

// Rate limiting for auth attempts (client-side)
const authAttempts = new Map<string, { count: number; lastAttempt: number }>()

export function checkAuthRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 300000): boolean {
  const now = Date.now()
  const attempts = authAttempts.get(identifier)
  
  // Clean up old attempts
  if (attempts && now - attempts.lastAttempt > windowMs) {
    authAttempts.delete(identifier)
    return true
  }
  
  if (!attempts) {
    authAttempts.set(identifier, { count: 1, lastAttempt: now })
    return true
  }
  
  if (attempts.count >= maxAttempts) {
    return false
  }
  
  attempts.count++
  attempts.lastAttempt = now
  return true
}

export function resetAuthRateLimit(identifier: string): void {
  authAttempts.delete(identifier)
}

// Password strength validation
export interface PasswordValidation {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  if (password.length >= 12 && errors.length === 0) {
    strength = 'strong'
  } else if (password.length >= 8 && errors.length <= 1) {
    strength = 'medium'
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength
  }
}

// Sanitize error messages to prevent information leakage
export function sanitizeAuthError(error: string): string {
  const errorMap: { [key: string]: string } = {
    // Common Supabase errors
    'Invalid login credentials': 'Invalid email or password',
    'User not found': 'Invalid email or password',
    'Email not confirmed': 'Please check your email and confirm your account',
    'Too many requests': 'Too many attempts. Please try again later',
    'Password should be at least 6 characters': 'Password must be at least 8 characters long',
    'Unable to validate email address: invalid format': 'Please enter a valid email address',
    'Password is too weak': 'Password does not meet strength requirements',
    'Email rate limit exceeded': 'Too many requests. Please try again later',
    'Signup is disabled': 'Account creation is currently unavailable',
    'User already registered': 'An account with this email already exists',
  }
  
  // Check for exact matches first
  if (errorMap[error]) {
    return errorMap[error]
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(errorMap)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return value
    }
  }
  
  // For unknown errors, return a generic message
  return 'Authentication failed. Please check your credentials and try again'
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

// Generate secure redirect URL
export function getSecureRedirectUrl(returnTo?: string): string {
  const allowedDomains = [
    window.location.origin,
    process.env.NEXT_PUBLIC_SITE_URL,
  ].filter(Boolean)
  
  if (!returnTo) {
    return '/'
  }
  
  try {
    // If returnTo is a relative path, it's safe
    if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
      return returnTo
    }
    
    // If it's an absolute URL, check if it's from an allowed domain
    const url = new URL(returnTo)
    if (allowedDomains.some(domain => url.origin === domain)) {
      return returnTo
    }
  } catch (error) {
    // Invalid URL format
    console.warn('Invalid redirect URL:', returnTo)
  }
  
  // Default to home page for security
  return '/'
}

// Log security events (client-side)
export function logAuthSecurityEvent(event: string, details: any = {}): void {
  console.warn(`[AUTH_SECURITY] ${event}`, {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    ...details
  })
  
  // In production, you might want to send this to your monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to analytics or monitoring service
    // analytics.track('auth_security_event', { event, ...details })
  }
}