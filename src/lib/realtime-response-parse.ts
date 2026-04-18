/**
 * Defensive parsing of OpenAI Realtime `response.done` payloads.
 * Output item shapes vary by API version; we only need tool names for gates.
 */

const TOOL_NAME_RE =
  /^(add_to_notebook|request_|mark_|remember_student_fact)[a-z_]*$/;

function maybePushName(names: Set<string>, n: unknown): void {
  if (typeof n !== 'string' || n.length === 0) return;
  if (TOOL_NAME_RE.test(n) || n.includes('request_')) names.add(n);
}

function walkUnknown(node: unknown, names: Set<string>, depth: number): void {
  if (depth > 12 || node === null || node === undefined) return;
  if (typeof node === 'string') return;
  if (Array.isArray(node)) {
    for (const el of node) walkUnknown(el, names, depth + 1);
    return;
  }
  if (typeof node !== 'object') return;
  const o = node as Record<string, unknown>;

  const t = o.type;
  if (t === 'function_call' || t === 'function_call_output' || t === 'function') {
    maybePushName(names, o.name);
  }
  if (t === 'tool_calls' && Array.isArray(o.tool_calls)) {
    for (const tc of o.tool_calls) {
      if (tc && typeof tc === 'object') {
        const tcObj = tc as Record<string, unknown>;
        maybePushName(names, tcObj.name);
        if (tcObj.function && typeof tcObj.function === 'object') {
          maybePushName(names, (tcObj.function as Record<string, unknown>).name);
        }
      }
    }
  }

  for (const v of Object.values(o)) walkUnknown(v, names, depth + 1);
}

export function extractToolNamesFromResponseDone(event: {
  response?: Record<string, unknown> | null;
}): string[] {
  const response = event.response;
  if (!response || typeof response !== 'object') return [];

  const names = new Set<string>();

  const output = response.output;
  if (Array.isArray(output)) {
    for (const raw of output) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const t = item.type;
      if (t === 'function_call' || t === 'function_call_output' || t === 'function') {
        maybePushName(names, item.name);
      }
      const fn = item.function;
      if (fn && typeof fn === 'object') {
        maybePushName(names, (fn as Record<string, unknown>).name);
      }
      if (Array.isArray(item.tool_calls)) {
        walkUnknown(item.tool_calls, names, 0);
      }
    }
    walkUnknown(output, names, 0);
  }

  walkUnknown(response, names, 0);

  return Array.from(names);
}
