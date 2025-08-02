import { NextRequest } from 'next/server'
import { createSecureResponse } from '@/lib/security'

/**
 * Health check endpoint for monitoring and load balancing
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') ?? undefined
  
  try {
    // Basic health checks
    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'OPENAI_API_KEY'
    ]

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingEnvVars.length > 0) {
      return createSecureResponse({
        ...checks,
        status: 'degraded',
        issues: [`Missing environment variables: ${missingEnvVars.join(', ')}`]
      }, 200, origin)
    }

    return createSecureResponse(checks, 200, origin)
    
  } catch (error) {
    console.error('Health check error:', error)
    return createSecureResponse({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: 'Health check failed'
    }, 503, origin)
  }
}