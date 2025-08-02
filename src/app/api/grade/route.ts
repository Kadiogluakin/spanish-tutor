export const runtime = 'nodejs';

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.TEXT_MODEL || 'gpt-4o-mini';
  if (!apiKey) return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 500 });
  const body = await req.json();
  const { type, text } = body || {};
  const rubric = {
    criteria: [
      { name: 'Grammar', weight: 0.3 },
      { name: 'Vocabulary Range', weight: 0.25 },
      { name: 'Task Fulfillment', weight: 0.2 },
      { name: 'Fluency/Pronunciation', weight: 0.25 },
    ],
    scale: '0-5',
  };

  const system = `You are a Spanish language teacher. Grade strictly using the provided rubric. 
Return ONLY JSON with keys: overall (0-5), criterion_scores[], corrections[], next_focus[], srs_add[].
Keep explanations concise and practical.`;

  const user = `Assignment type: ${type}. Student text:\n${text}\nRubric:${JSON.stringify(rubric)}`;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    const json = await r.json();
    const content = json?.choices?.[0]?.message?.content;
    return new Response(content || '{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), { status: 500 });
  }
}
