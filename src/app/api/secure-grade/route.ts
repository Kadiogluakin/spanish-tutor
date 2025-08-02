import { NextRequest } from 'next/server'
import { 
  authenticateRequest, 
  validateInput, 
  createSecureResponse, 
  checkRequestSize, 
  schemas, 
  REQUEST_SIZE_LIMITS,
  logSecurityEvent 
} from '@/lib/security'

export const runtime = 'nodejs'

/**
 * Secure grading endpoint with comprehensive security measures
 * This demonstrates how to properly secure API routes
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') ?? undefined

  try {
    // 1. Check request size
    if (!checkRequestSize(request, REQUEST_SIZE_LIMITS.default)) {
      logSecurityEvent('REQUEST_TOO_LARGE', { size: request.headers.get('content-length') }, request)
      return createSecureResponse({ error: 'Request too large' }, 413, origin)
    }

    // 2. Authenticate user
    const authResult = await authenticateRequest(request)
    if (!authResult.success) {
      logSecurityEvent('AUTHENTICATION_FAILED', {}, request)
      return authResult.response
    }

    // 3. Parse and validate input
    let body
    try {
      body = await request.json()
    } catch (error) {
      logSecurityEvent('INVALID_JSON', { error: error instanceof Error ? error.message : 'Unknown' }, request)
      return createSecureResponse({ error: 'Invalid JSON format' }, 400, origin)
    }

    const validation = validateInput(body, schemas.gradingRequest)
    if (!validation.success) {
      logSecurityEvent('VALIDATION_FAILED', { error: validation.error }, request)
      return createSecureResponse({ error: validation.error }, 400, origin)
    }

    const { type, text } = validation.data

    // 4. Check OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured')
      return createSecureResponse({ error: 'Service temporarily unavailable' }, 503, origin)
    }

    // 5. Prepare grading request
    const model = process.env.TEXT_MODEL || 'gpt-4o-mini'
    const rubric = {
      criteria: [
        { name: 'Grammar', weight: 0.3 },
        { name: 'Vocabulary Range', weight: 0.25 },
        { name: 'Task Fulfillment', weight: 0.2 },
        { name: 'Fluency/Pronunciation', weight: 0.25 },
      ],
      scale: '0-5',
    }

    const systemPrompt = `You are a Spanish language teacher. Grade strictly using the provided rubric. 
Return ONLY JSON with keys: overall (0-5), criterion_scores[], corrections[], next_focus[], srs_add[].
Keep explanations concise and practical.`

    const userPrompt = `Assignment type: ${type}. Student text:\n${text}\nRubric:${JSON.stringify(rubric)}`

    // 6. Make OpenAI request with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1000,
          temperature: 0.1, // Low temperature for consistent grading
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenAI API error:', response.status, errorText)
        logSecurityEvent('OPENAI_API_ERROR', { status: response.status, error: errorText }, request)
        return createSecureResponse({ error: 'Grading service error' }, 502, origin)
      }

      const json = await response.json()
      const content = json?.choices?.[0]?.message?.content

      if (!content) {
        console.error('Empty response from OpenAI')
        return createSecureResponse({ error: 'Empty grading response' }, 502, origin)
      }

      // 7. Validate OpenAI response
      let gradingResult
      try {
        gradingResult = JSON.parse(content)
      } catch (error) {
        console.error('Invalid JSON from OpenAI:', content)
        return createSecureResponse({ error: 'Invalid grading response format' }, 502, origin)
      }

      // 8. Log successful grading
      console.log(`Grading completed for user ${authResult.user.id}`)

      return createSecureResponse({
        success: true,
        result: gradingResult,
        timestamp: new Date().toISOString(),
      }, 200, origin)

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        logSecurityEvent('REQUEST_TIMEOUT', {}, request)
        return createSecureResponse({ error: 'Request timeout' }, 408, origin)
      }
      
      console.error('Grading error:', error)
      logSecurityEvent('GRADING_ERROR', { error: error instanceof Error ? error.message : 'Unknown' }, request)
      return createSecureResponse({ error: 'Grading failed' }, 500, origin)
    }

  } catch (error) {
    console.error('Unexpected error in secure grading:', error)
    logSecurityEvent('UNEXPECTED_ERROR', { error: error instanceof Error ? error.message : 'Unknown' }, request)
    return createSecureResponse({ error: 'Internal server error' }, 500, origin)
  }
}

/**
 * Handle preflight CORS requests
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') ?? undefined
  return createSecureResponse({}, 200, origin)
}