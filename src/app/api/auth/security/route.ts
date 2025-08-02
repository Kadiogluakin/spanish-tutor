import { NextRequest } from 'next/server'
import { createSecureResponse, authenticateRequest, logSecurityEvent } from '@/lib/security'
import { createClient } from '@/lib/supabase/server'

/**
 * Security endpoint for authentication-related security operations
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') ?? undefined

  try {
    // Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      return authResult.response
    }

    const body = await request.json()
    const { action } = body

    const supabase = await createClient()
    const user = authResult.user

    switch (action) {
      case 'check_security_status':
        // Check for suspicious activity
        const securityStatus = await checkUserSecurityStatus(user.id, supabase)
        return createSecureResponse({
          status: securityStatus,
          timestamp: new Date().toISOString()
        }, 200, origin)

      case 'report_suspicious_activity':
        const { details } = body
        logSecurityEvent('USER_REPORTED_SUSPICIOUS_ACTIVITY', {
          userId: user.id,
          details
        }, request)
        
        return createSecureResponse({
          message: 'Report received, thank you for helping keep the platform secure'
        }, 200, origin)

      default:
        return createSecureResponse({ error: 'Invalid action' }, 400, origin)
    }

  } catch (error) {
    console.error('Security endpoint error:', error)
    return createSecureResponse({ error: 'Security check failed' }, 500, origin)
  }
}

async function checkUserSecurityStatus(userId: string, supabase: any) {
  try {
    // Check for recent security events (this would be expanded based on your logging system)
    const recentSessions = await supabase
      .from('learning_sessions')
      .select('created_at, metadata')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    const sessionCount = recentSessions.data?.length || 0
    
    // Basic security checks
    const isHighActivity = sessionCount > 20 // More than 20 sessions in 24h
    const hasRecentActivity = sessionCount > 0

    return {
      user_id: userId,
      recent_sessions: sessionCount,
      high_activity: isHighActivity,
      has_recent_activity: hasRecentActivity,
      security_score: calculateSecurityScore(sessionCount, isHighActivity),
      last_check: new Date().toISOString()
    }

  } catch (error) {
    console.error('Security status check error:', error)
    return {
      user_id: userId,
      error: 'Could not check security status',
      security_score: 0
    }
  }
}

function calculateSecurityScore(sessionCount: number, isHighActivity: boolean): number {
  let score = 100 // Start with perfect score

  if (isHighActivity) {
    score -= 20 // Deduct for suspicious high activity
  }

  if (sessionCount === 0) {
    score -= 10 // Deduct for no recent activity (could indicate compromise)
  }

  return Math.max(0, Math.min(100, score))
}