import { NextResponse } from 'next/server';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_URL = 'https://api.heygen.com/v2/voices';

export async function GET() {
  try {
    if (!HEYGEN_API_KEY) {
      return NextResponse.json(
        { error: 'HeyGen API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(HEYGEN_API_URL, {
      method: 'GET',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('HeyGen API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch voices' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 日本語対応のvoiceをフィルタリング（オプション）
    const voices = data.data?.voices || [];
    const japaneseVoices = voices.filter((voice: {
      language?: string;
    }) =>
      voice.language?.toLowerCase().includes('japanese') ||
      voice.language?.toLowerCase().includes('ja')
    );

    return NextResponse.json({
      voices: voices,
      japaneseVoices: japaneseVoices,
      total: voices.length,
    });
  } catch (error) {
    console.error('Voices fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}