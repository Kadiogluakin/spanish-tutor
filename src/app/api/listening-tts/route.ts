import { NextRequest, NextResponse } from 'next/server';
import { OPENAI_LESSON_VOICE } from '@/lib/openai-lesson-voice';

export const runtime = 'nodejs';

const MAX_INPUT_CHARS = 4000;

/**
 * OpenAI Text-to-Speech for the listening modal — same voice as Realtime (`OPENAI_LESSON_VOICE`).
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[listening-tts] OPENAI_API_KEY not configured');
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text =
    typeof body === 'object' &&
    body !== null &&
    'text' in body &&
    typeof (body as { text: unknown }).text === 'string'
      ? (body as { text: string }).text.trim()
      : '';

  if (!text.length) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }
  if (text.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `Text too long (max ${MAX_INPUT_CHARS} characters)` },
      { status: 400 }
    );
  }

  async function requestSpeech(body: Record<string, unknown>) {
    return fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  let response = await requestSpeech({
    model: 'gpt-4o-mini-tts',
    voice: OPENAI_LESSON_VOICE,
    input: text,
    instructions:
      'Speak the text in clear Spanish (Latin American pronunciation), natural classroom pace — same character as an encouraging Spanish tutor.',
    response_format: 'mp3',
  });

  // Older accounts / models may reject `instructions`; fall back to `tts-1` (same voice id).
  if (!response.ok && response.status === 400) {
    const errPreview = await response.clone().text();
    console.warn('[listening-tts] mini-tts fallback to tts-1', errPreview.slice(0, 200));
    response = await requestSpeech({
      model: 'tts-1',
      voice: OPENAI_LESSON_VOICE,
      input: text,
    });
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error('[listening-tts] OpenAI speech error', response.status, errText);
    return NextResponse.json(
      { error: 'Could not generate speech' },
      { status: response.status >= 500 ? 502 : response.status }
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
