/**
 * Defensive parsing of OpenAI Realtime `response.done` payloads.
 * Output item shapes vary by API version; we only need tool names for gates.
 */

export function extractToolNamesFromResponseDone(event: {
  response?: Record<string, unknown> | null;
}): string[] {
  const response = event.response;
  if (!response || typeof response !== 'object') return [];

  const output = response.output;
  if (!Array.isArray(output)) return [];

  const names: string[] = [];
  for (const raw of output) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const t = item.type;
    if (t === 'function_call' || t === 'function_call_output') {
      const n = item.name;
      if (typeof n === 'string' && n.length > 0) names.push(n);
    }
    const fn = item.function;
    if (fn && typeof fn === 'object') {
      const fnName = (fn as Record<string, unknown>).name;
      if (typeof fnName === 'string' && fnName.length > 0) names.push(fnName);
    }
  }
  return names;
}
