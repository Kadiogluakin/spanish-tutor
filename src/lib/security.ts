import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Input validation schemas
export const schemas = {
  // User input validation
  userProfile: z.object({
    name: z.string().min(1).max(100).optional(),
    age: z.number().min(13).max(150).optional(),
    native_language: z.string().max(50).optional(),
    learning_goals: z.string().max(500).optional(),
    interests: z.string().max(500).optional(),
    occupation: z.string().max(100).optional(),
    location: z.string().max(100).optional(),
  }),

  // Lesson progress validation
  lessonProgress: z.object({
    lesson_id: z.string().min(1).max(100),
    score: z.number().min(0).max(100).optional(),
    time_spent_min: z.number().min(0).max(1440).optional(), // Max 24 hours
    completed: z.boolean().optional(),
  }),

  // Homework submission validation
  homeworkSubmission: z.object({
    assignment_id: z.string().min(1).max(100),
    content: z.string().min(1).max(10000), // 10KB limit
    type: z.enum(['writing', 'speaking', 'mixed']),
  }),

  // Grading request validation
  gradingRequest: z.object({
    type: z.enum(['writing', 'speaking', 'mixed']),
    text: z.string().min(1).max(10000),
  }),

  // Session analysis validation
  sessionAnalysis: z.object({
    sessionId: z.string().min(1).max(100),
    lessonId: z.string().min(1).max(100),
    transcript: z.string().min(1).max(50000), // 50KB limit
    duration: z.number().min(0).max(14400).optional(), // Max 4 hours
  }),
}

// Request size limits (in bytes)
export const REQUEST_SIZE_LIMITS = {
  default: 1024 * 1024, // 1MB
  upload: 10 * 1024 * 1024, // 10MB for file uploads
  transcript: 5 * 1024 * 1024, // 5MB for transcripts
}

/**
 * Validates request body against a Zod schema
 */
export function validateInput<T>(data: unknown, schema: z.ZodSchema<T>): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      return { success: false, error: `Validation failed: ${messages.join(', ')}` }
    }
    return { success: false, error: 'Invalid input format' }
  }
}

/**
 * Sanitizes string input to prevent XSS and other attacks
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>'"&]/g, (char) => {
      const map: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      }
      return map[char] || char
    })
    .trim()
}

/**
 * Checks if request size is within limits
 */
export function checkRequestSize(request: NextRequest, limit: number = REQUEST_SIZE_LIMITS.default): boolean {
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > limit) {
    return false
  }
  return true
}

/**
 * Authentication middleware for API routes
 */
export async function authenticateRequest(request: NextRequest): Promise<{ success: true; user: any } | { success: false; response: NextResponse }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    return { success: true, user }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    }
  }
}

/**
 * CORS configuration for API routes
 */
export function configureCORS(response: NextResponse, origin?: string): void {
  // Allow requests from your domain in production, localhost in development
  const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    process.env.NEXT_PUBLIC_SITE_URL || '',
  ].filter(Boolean)

  const requestOrigin = origin || ''
  const isAllowed = allowedOrigins.some(allowed => 
    requestOrigin === allowed || 
    (process.env.NODE_ENV === 'development' && requestOrigin.includes('localhost'))
  )

  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin)
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '3600')
}

/**
 * Creates a secure API response with proper headers
 */
export function createSecureResponse(data: any, status: number = 200, origin?: string): NextResponse {
  const response = NextResponse.json(data, { status })
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  
  // Configure CORS
  configureCORS(response, origin)
  
  return response
}

/**
 * Validates API key for sensitive operations
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key')
  const validApiKey = process.env.INTERNAL_API_KEY
  
  if (!validApiKey) {
    console.warn('INTERNAL_API_KEY not configured')
    return false
  }
  
  return apiKey === validApiKey
}

/**
 * Rate limiting configuration for different endpoints
 */
export const RATE_LIMITS = {
  default: { requests: 100, windowMs: 60000 }, // 100 requests per minute
  auth: { requests: 5, windowMs: 60000 }, // 5 requests per minute for auth
  grade: { requests: 10, windowMs: 60000 }, // 10 requests per minute for grading
  upload: { requests: 20, windowMs: 60000 }, // 20 requests per minute for uploads
  openai: { requests: 30, windowMs: 60000 }, // 30 requests per minute for OpenAI calls
}

/**
 * Logs security events for monitoring
 */
export function logSecurityEvent(event: string, details: any, request: NextRequest): void {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  console.warn(`[SECURITY] ${event}`, {
    ip,
    userAgent,
    path: request.nextUrl.pathname,
    timestamp: new Date().toISOString(),
    ...details
  })
}