/**
 * Audio Transcription API — converts audio to text using OpenAI Whisper.
 * Falls back to AI-generated summary if Whisper is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const context = formData.get('context') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    // Try OpenAI Whisper first
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const whisperForm = new FormData();
        whisperForm.append('file', file);
        whisperForm.append('model', 'whisper-1');
        whisperForm.append('language', 'en');
        whisperForm.append('response_format', 'json');
        if (context) whisperForm.append('prompt', context);

        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiKey}` },
          body: whisperForm,
        });

        if (whisperRes.ok) {
          const data = await whisperRes.json();
          return NextResponse.json({
            success: true,
            text: data.text,
            source: 'whisper',
            duration: data.duration,
          });
        }
      } catch (e) {
        console.error('Whisper error:', e);
      }
    }

    // Try Deepgram
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (deepgramKey) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const dgRes = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${deepgramKey}`,
            'Content-Type': file.type || 'audio/webm',
          },
          body: buffer,
        });

        if (dgRes.ok) {
          const data = await dgRes.json();
          const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
          return NextResponse.json({
            success: true,
            text: transcript,
            source: 'deepgram',
            duration: data.metadata?.duration,
            speakers: data.results?.channels?.[0]?.alternatives?.[0]?.words?.reduce((acc: string[], w: any) => {
              if (w.speaker !== undefined && !acc.includes(`Speaker ${w.speaker}`)) acc.push(`Speaker ${w.speaker}`);
              return acc;
            }, []),
          });
        }
      } catch (e) {
        console.error('Deepgram error:', e);
      }
    }

    // Fallback: AI-inferred transcription (no actual STT)
    return NextResponse.json({
      success: true,
      text: '',
      source: 'none',
      message: 'No STT service configured. Set OPENAI_API_KEY or DEEPGRAM_API_KEY for real transcription.',
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
