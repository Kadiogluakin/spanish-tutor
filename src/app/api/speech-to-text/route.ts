import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }

    // Get the audio file from form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('Processing audio file:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    // Prepare form data for OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'es'); // Spanish
    whisperFormData.append('response_format', 'json');

    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }

    const whisperData = await whisperResponse.json();
    const transcript = whisperData.text;

    console.log('Transcription successful:', {
      originalLength: audioFile.size,
      transcriptLength: transcript.length,
      transcript: transcript.substring(0, 100) + '...'
    });

    return NextResponse.json({ 
      transcript,
      success: true 
    });

  } catch (error) {
    console.error('Speech-to-text error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      success: false 
    }, { status: 500 });
  }
}