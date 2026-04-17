const SENSITIVE_KEY = new Set(
  [
    'password',
    'currentpassword',
    'newpassword',
    'confirmpassword',
    'oldpassword',
    'current_password',
    'new_password',
    'confirm_password',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'apikey',
    'api_key',
    'authorization',
    'service_role',
    'service_role_key',
    'secret',
    'client_secret',
    'private_key',
  ]
)

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[\s-]/g, '')
  return SENSITIVE_KEY.has(k)
}

/**
 * Deep-clone plain JSON-ish values and replace known secret fields so
 * objects are safe to pass to console / analytics.
 */
export function redactSensitiveForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value
  const t = typeof value
  if (t !== 'object') return value
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(redactSensitiveForLog)

  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      out[key] = '[REDACTED]'
      continue
    }
    out[key] = redactSensitiveForLog(v)
  }
  return out
}
