import { NextResponse } from 'next/server';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

// Streaming API専用のアバターリストを取得
const STREAMING_AVATARS_URL = 'https://api.heygen.com/v2/avatars?is_streaming=true';

// 既知のInteractive Avatar（フォールバック用）
const KNOWN_INTERACTIVE_AVATARS = [
  { avatar_id: 'Kristin_public_3_20240108', name: 'Kristin', is_interactive: true },
  { avatar_id: 'Anna_public_3_20240108', name: 'Anna', is_interactive: true },
  { avatar_id: 'Susan_public_2_20240328', name: 'Susan', is_interactive: true },
  { avatar_id: 'Wayne_20240711', name: 'Wayne', is_interactive: true },
  { avatar_id: 'josh_lite3_20230714', name: 'Josh', is_interactive: true },
];

export async function GET() {
  try {
    if (!HEYGEN_API_KEY) {
      // API キーがない場合は既知のアバターを返す
      return NextResponse.json({
        totalAvatars: KNOWN_INTERACTIVE_AVATARS.length,
        interactiveAvatars: KNOWN_INTERACTIVE_AVATARS,
        allAvatars: KNOWN_INTERACTIVE_AVATARS,
        source: 'fallback',
      });
    }

    // まずStreaming API専用エンドポイントを試す
    try {
      const streamingResponse = await fetch(STREAMING_AVATARS_URL, {
        method: 'GET',
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
        },
      });

      if (streamingResponse.ok) {
        const streamingData = await streamingResponse.json();
        const streamingAvatars = streamingData.data?.avatars || streamingData.avatars || [];

        if (streamingAvatars.length > 0) {
          return NextResponse.json({
            totalAvatars: streamingAvatars.length,
            interactiveAvatars: streamingAvatars,
            allAvatars: streamingAvatars,
            source: 'streaming_api',
          });
        }
      }
    } catch (err) {
      console.error('Streaming avatars endpoint error:', err);
      console.log('Streaming avatars endpoint not available, trying general endpoint');
    }

    // 通常のアバターエンドポイントを試す
    const response = await fetch('https://api.heygen.com/v2/avatars', {
      method: 'GET',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
      },
    });

    if (!response.ok) {
      // APIエラーの場合は既知のアバターを返す
      console.error('HeyGen API error, using fallback avatars');
      return NextResponse.json({
        totalAvatars: KNOWN_INTERACTIVE_AVATARS.length,
        interactiveAvatars: KNOWN_INTERACTIVE_AVATARS,
        allAvatars: KNOWN_INTERACTIVE_AVATARS,
        source: 'fallback',
      });
    }

    const data = await response.json();
    const avatars = data.data?.avatars || data.avatars || [];

    // Interactive Avatarsのみをフィルタリング
    const interactiveAvatars = avatars.filter((avatar: {
      is_interactive?: boolean;
      type?: string;
      is_streaming?: boolean;
      capabilities?: string[];
    }) =>
      avatar.is_interactive ||
      avatar.type === 'interactive' ||
      avatar.is_streaming ||
      (avatar.capabilities && avatar.capabilities.includes('streaming'))
    );

    // インタラクティブアバターが見つからない場合は既知のアバターを追加
    if (interactiveAvatars.length === 0) {
      return NextResponse.json({
        totalAvatars: KNOWN_INTERACTIVE_AVATARS.length,
        interactiveAvatars: KNOWN_INTERACTIVE_AVATARS,
        allAvatars: KNOWN_INTERACTIVE_AVATARS,
        source: 'fallback_with_api',
      });
    }

    return NextResponse.json({
      totalAvatars: avatars.length,
      interactiveAvatars: interactiveAvatars,
      allAvatars: interactiveAvatars, // Interactive Avatarのみを返す
      source: 'api',
    });
  } catch (error) {
    console.error('Avatars fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}