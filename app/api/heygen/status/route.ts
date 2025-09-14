import { NextRequest, NextResponse } from 'next/server';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_URL = 'https://api.heygen.com/v1/streaming.list';

export async function GET() {
  try {
    if (!HEYGEN_API_KEY) {
      return NextResponse.json(
        { error: 'HeyGen API key not configured' },
        { status: 500 }
      );
    }

    // HeyGenのセッション一覧を取得
    const response = await fetch(HEYGEN_API_URL, {
      method: 'GET',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HeyGen API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get session list', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Active sessions:', data);

    // アクティブなセッションの詳細情報を整形
    const sessions = data.data || [];
    interface SessionData {
      session_id: string;
      status: string;
      created_at?: string;
      duration?: number;
      avatar_id?: string;
      avatar_name?: string;
      quality?: string;
      is_interactive?: boolean;
    }
    const formattedSessions = sessions.map((session: SessionData) => ({
      sessionId: session.session_id,
      status: session.status,
      createdAt: session.created_at,
      avatarId: session.avatar_id,
      avatarName: session.avatar_name,
      quality: session.quality,
      isInteractive: session.is_interactive,
    }));

    return NextResponse.json({
      count: sessions.length,
      sessions: formattedSessions,
      raw: data,
    });
  } catch (error) {
    console.error('Session status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!HEYGEN_API_KEY) {
      return NextResponse.json(
        { error: 'HeyGen API key not configured' },
        { status: 500 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // セッション一覧から特定のセッションを探す（個別取得APIが404のため）
    const response = await fetch(HEYGEN_API_URL, {
      method: 'GET',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HeyGen API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get session info', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const sessions = data.data || [];

    // 指定されたセッションIDの情報を探す
    interface SessionData {
      session_id: string;
      status: string;
      created_at?: string;
      duration?: number;
      avatar_id?: string;
      avatar_name?: string;
      quality?: string;
      is_interactive?: boolean;
    }
    const sessionInfo = sessions.find((s: SessionData) => s.session_id === sessionId);

    if (!sessionInfo) {
      return NextResponse.json(
        { error: 'Session not found', sessionId },
        { status: 404 }
      );
    }

    console.log('Session info:', sessionInfo);
    return NextResponse.json({
      session: sessionInfo,
      allSessions: sessions
    });
  } catch (error) {
    console.error('Session info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}