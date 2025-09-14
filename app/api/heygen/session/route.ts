import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_URL = 'https://api.heygen.com/v1/streaming.new';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { avatarId } = body;

    if (!HEYGEN_API_KEY) {
      return NextResponse.json(
        { error: 'HeyGen API key not configured' },
        { status: 500 }
      );
    }

    // アバターパラメータを設定（streaming.newはavatar_idのみサポート）
    let avatarParams = {};

    if (avatarId && avatarId !== 'default') {
      console.log(`Using avatar_id: ${avatarId}`);
      avatarParams = { avatar_id: avatarId };
    }

    const requestBody = {
      quality: 'high',
      ...avatarParams,
      voice: {
        rate: 1.0,
      },
      version: 'v2',
    };

    console.log('HeyGen API request body:', requestBody);

    const response = await fetch(HEYGEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': HEYGEN_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HeyGen API error:', errorText);

      let errorMessage = 'Failed to create HeyGen session';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('HeyGen session created:', data.data);

    return NextResponse.json({
      sessionId: data.data.session_id,
      livekitUrl: data.data.url,
      accessToken: data.data.access_token,
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}