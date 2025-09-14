import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_URL = 'https://api.heygen.com/v1/streaming.task';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, text, mode = 'repeat' } = body;

    if (!sessionId || !text) {
      return NextResponse.json(
        { error: 'Session ID and text are required' },
        { status: 400 }
      );
    }

    if (!HEYGEN_API_KEY) {
      return NextResponse.json(
        { error: 'HeyGen API key not configured' },
        { status: 500 }
      );
    }

    const taskPayload = {
      session_id: sessionId,
      text: text,
      task_type: mode,
    };

    console.log('Sending task to HeyGen:', taskPayload);

    const response = await fetch(HEYGEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': HEYGEN_API_KEY,
      },
      body: JSON.stringify(taskPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('HeyGen task error:', error);
      return NextResponse.json(
        { error: 'Failed to send task to HeyGen' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('HeyGen task response:', data);

    return NextResponse.json({
      taskId: data.data?.task_id || 'unknown',
      response: data,
    });
  } catch (error) {
    console.error('Task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}