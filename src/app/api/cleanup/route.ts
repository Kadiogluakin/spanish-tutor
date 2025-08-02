import { NextRequest } from 'next/server'
import { createSecureResponse, validateApiKey, logSecurityEvent } from '@/lib/security'
import { createClient } from '@/lib/supabase/server'

/**
 * Cleanup endpoint for scheduled maintenance tasks
 * This endpoint is called by Vercel cron jobs
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined

  try {
    // Verify this is a cron request (Vercel adds this header)
    const cronSecret = request.headers.get('authorization')
    const envCronSecret = process.env.CRON_SECRET
    const expectedSecret = envCronSecret ? `Bearer ${envCronSecret}` : null
    
    if (!envCronSecret || !expectedSecret || cronSecret !== expectedSecret) {
      logSecurityEvent('UNAUTHORIZED_CLEANUP_ATTEMPT', {}, request)
      return createSecureResponse({ error: 'Unauthorized' }, 401, origin || undefined)
    }

    const supabase = await createClient()
    let cleanedUp = 0

    // Cleanup expired sessions (older than 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: expiredSessions, error: sessionError } = await supabase
      .from('learning_sessions')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select('id')

    if (sessionError) {
      console.error('Session cleanup error:', sessionError)
    } else {
      cleanedUp += expiredSessions?.length || 0
    }

    // Cleanup old grading results (older than 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data: expiredGrades, error: gradeError } = await supabase
      .from('homework_submissions')
      .delete()
      .lt('submitted_at', ninetyDaysAgo.toISOString())
      .is('graded_at', null) // Only delete ungraded old submissions
      .select('id')

    if (gradeError) {
      console.error('Grade cleanup error:', gradeError)
    } else {
      cleanedUp += expiredGrades?.length || 0
    }

    // Log cleanup results
    console.log(`Cleanup completed: ${cleanedUp} records removed`)

    return createSecureResponse({
      success: true,
      timestamp: new Date().toISOString(),
      recordsRemoved: cleanedUp,
      operations: [
        'expired_sessions',
        'old_ungraded_submissions'
      ]
    }, 200, origin || undefined)

  } catch (error) {
    console.error('Cleanup error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown'
    logSecurityEvent('CLEANUP_ERROR', { error: errorMessage }, request)
    
          return createSecureResponse({
        success: false,
        error: 'Cleanup failed',
        timestamp: new Date().toISOString()
      }, 500, origin || undefined)
  }
}