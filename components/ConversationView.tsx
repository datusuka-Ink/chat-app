'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Subtitles } from 'lucide-react';
import VideoPanel from './VideoPanel';
import MobileLayout from './MobileLayout';
import DesktopLayout from './DesktopLayout';
import MicrophonePermissionGuide from './MicrophonePermissionGuide';
import PermissionSetupGuide from './PermissionSetupGuide';
import { AudioRecorder } from '@/lib/audio-recorder';
import { LiveKitClient } from '@/lib/livekit-client';
import type { JobItem } from '@/lib/tools/search-jobs';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  jobs?: JobItem[];
}

type InteractionMode = 'chat' | 'voice' | 'jobs';

export default function ConversationView() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('voice');
  const [unreadJobsCount, setUnreadJobsCount] = useState(0);
  const [viewedJobIds, setViewedJobIds] = useState<Set<string>>(new Set());
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [showMicGuide, setShowMicGuide] = useState(false);
  const [showPermissionSetup, setShowPermissionSetup] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);

  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const livekitClientRef = useRef<LiveKitClient | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // セッション開始
  const startSession = async () => {
    // 権限が未取得の場合はセットアップを表示
    if (!permissionsReady) {
      setShowPermissionSetup(true);
      return;
    }
    try {
      setIsConnecting(true);

      // スマホブラウザでの音声再生を有効化（ユーザーインタラクション時）
      // AudioContextを初期化して音声の自動再生を許可
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        // webkit prefixを持つブラウザのための型定義
        interface WindowWithWebkit extends Window {
          webkitAudioContext?: typeof AudioContext;
        }
        const AudioContextClass = window.AudioContext || (window as WindowWithWebkit).webkitAudioContext;
        if (AudioContextClass) {
          const audioContext = new AudioContextClass();
          // サイレント音声を再生して音声出力を有効化
          const buffer = audioContext.createBuffer(1, 1, 22050);
          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContext.destination);
          source.start(0);
          console.log('Audio context initialized for mobile playback');
        }
      }

      // Monicaアバターを固定で使用（アジア系女性アバター）
      const savedAvatarId = 'June_HR_public';

      // HeyGen セッション作成
      console.log('Using avatar ID:', savedAvatarId);
      const sessionResponse = await fetch('/api/heygen/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId: savedAvatarId }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        console.error('Session creation failed:', errorData);
        throw new Error(errorData.error || 'Failed to create session');
      }

      const sessionData = await sessionResponse.json();
      const { sessionId, livekitUrl, accessToken } = sessionData;
      console.log('Session created, data:', sessionData);
      sessionIdRef.current = sessionId;

      // セッション開始（LiveKit接続前に必要）
      const startResponse = await fetch('/api/heygen/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        console.error('Session start failed:', errorData);
        throw new Error(errorData.error || 'Failed to start session');
      }

      const startData = await startResponse.json();
      console.log('Session started, response:', startData);

      // セッションが完全に開始されるまで待機（2秒）
      await new Promise(resolve => setTimeout(resolve, 2000));

      // LiveKit接続
      livekitClientRef.current = new LiveKitClient();
      console.log('Attempting LiveKit connection...');

      // 音声再生状態の監視を設定
      livekitClientRef.current.onAudioPlaybackStatusChanged((canPlayback) => {
        if (!canPlayback) {
          console.warn('Audio playback blocked - user interaction required');
          setAudioBlocked(true);
        } else {
          console.log('Audio playback enabled');
          setAudioBlocked(false);
        }
      });

      await livekitClientRef.current.connect(livekitUrl, accessToken);
      console.log('LiveKit connected successfully');

      // スマホブラウザでの音声再生を有効化
      livekitClientRef.current.enableAudioPlayback();

      // 音声レコーダー初期化
      audioRecorderRef.current = new AudioRecorder();
      audioRecorderRef.current.onAudioLevel = setAudioLevel;

      setIsSessionActive(true);
      setIsConnecting(false);

      // トラックが安定するまで待機（2秒）
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 初回挨拶
      const greetingMessage = 'こんにちは！新卒キャリアエージェントのささきです。今日はキャリア相談をしながら、最後にあなたに合った求人を紹介させていただきます。まずは大学・学部や専攻、就活の進捗状況を教えていただけますか？';

      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: greetingMessage,
        timestamp: new Date(),
      }]);

      await sendToAvatar(greetingMessage);

    } catch (error) {
      console.error('Failed to start session:', error);
      setIsConnecting(false);
      alert('セッションの開始に失敗しました。');
    }
  };

  // セッション終了
  const endSession = async () => {
    try {
      if (livekitClientRef.current) {
        await livekitClientRef.current.disconnect();
        livekitClientRef.current = null;
      }

      if (audioRecorderRef.current) {
        audioRecorderRef.current.cleanup();
        audioRecorderRef.current = null;
      }

      setIsSessionActive(false);
      setMessages([]);
      sessionIdRef.current = null;
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  // デバッグ: セッション状態確認
  const checkSessionStatus = async () => {
    try {
      // 全セッション一覧を取得
      const listResponse = await fetch('/api/heygen/status');
      const listData = await listResponse.json();
      console.log('Active sessions:', listData);

      // 現在のセッション情報を取得
      if (sessionIdRef.current) {
        const infoResponse = await fetch('/api/heygen/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        });
        const infoData = await infoResponse.json();
        console.log('Current session info:', infoData);
      }
    } catch (error) {
      console.error('Failed to check session status:', error);
    }
  };

  // アバターに発話させる
  const sendToAvatar = async (text: string) => {
    if (!sessionIdRef.current) return;

    try {
      setCurrentSubtitle(text);

      await fetch('/api/heygen/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          text,
          mode: 'repeat',
        }),
      });

      // 字幕を一定時間後にクリア
      setTimeout(() => setCurrentSubtitle(''), text.length * 100);
    } catch (error) {
      console.error('Failed to send to avatar:', error);
    }
  };

  // 録音トグル（押すと開始/停止）
  const toggleRecording = async () => {
    if (!audioRecorderRef.current || isProcessing) return;

    if (isRecording) {
      // 録音停止
      setIsProcessing(true);
      const audioBlob = await audioRecorderRef.current.stopRecording();
      setIsRecording(false);
      setAudioLevel(0);
      setCurrentTranscript('');

      if (audioBlob) {
        await processAudioInput(audioBlob);
      }
      setIsProcessing(false);
    } else {
      // 録音開始
      const success = await audioRecorderRef.current.startRecording();
      if (success) {
        setIsRecording(true);
        setCurrentTranscript('録音中...');
      } else {
        // マイク許可ガイドを表示
        setShowMicGuide(true);
      }
    }
  };

  // 音声入力処理
  const processAudioInput = async (audioBlob: Blob) => {
    try {
      setCurrentTranscript('音声を認識中...');

      // ファイルサイズチェック
      const sizeMB = audioBlob.size / (1024 * 1024);
      console.log(`Audio size: ${sizeMB.toFixed(2)} MB`);

      if (sizeMB < 0.01) {
        setCurrentTranscript('録音が短すぎます');
        setTimeout(() => setCurrentTranscript(''), 2000);
        return;
      }

      // STT変換
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('lang', 'ja-JP');

      const sttResponse = await fetch('/api/stt/recognize', {
        method: 'POST',
        body: formData,
      });

      if (!sttResponse.ok) {
        const error = await sttResponse.json();
        console.error('STT error:', error);
        throw new Error('STT failed');
      }

      const { text } = await sttResponse.json();

      if (!text || text.trim().length === 0) {
        setCurrentTranscript('音声が認識できませんでした');
        setTimeout(() => setCurrentTranscript(''), 2000);
        return;
      }

      setCurrentTranscript('');

      // ユーザーメッセージ追加
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // AI応答生成
      await processUserInput(text);

    } catch (error) {
      console.error('Failed to process audio:', error);
      setCurrentTranscript('音声認識に失敗しました');
      setTimeout(() => setCurrentTranscript(''), 2000);
    }
  };

  // テキスト入力送信
  const handleTextSubmit = async () => {
    if (!inputText.trim() || !isSessionActive) return;

    const text = inputText.trim();
    setInputText('');

    // ユーザーメッセージ追加
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    await processUserInput(text);
  };

  // ユーザー入力処理
  const processUserInput = async (input: string) => {
    try {
      // コンテキスト準備
      const context = {
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      };

      // AI応答取得
      const response = await fetch('/api/llm/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, context }),
      });

      if (!response.ok) throw new Error('LLM response failed');

      const { text, data } = await response.json();

      // アシスタントメッセージ追加
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: text,
        timestamp: new Date(),
        jobs: data?.items,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // 新しい求人がある場合、求人情報タブ以外にいれば通知カウントを増やす
      if (data?.items && data.items.length > 0 && interactionMode !== 'jobs') {
        setUnreadJobsCount(prev => prev + data.items.length);
      }

      // アバターに発話させる
      await sendToAvatar(text);

    } catch (error) {
      console.error('Failed to process input:', error);
      alert('応答の生成に失敗しました。');
    }
  };

  // 音声を有効化する関数（ユーザーインタラクション時に呼び出す）
  const enableAudio = async () => {
    if (livekitClientRef.current) {
      try {
        await livekitClientRef.current.startAudio();
        setAudioBlocked(false);
        console.log('Audio enabled successfully');
      } catch (error) {
        console.error('Failed to enable audio:', error);
        alert('音声の有効化に失敗しました。');
      }
    }
  };

  // レスポンシブレイアウトの選択
  // Hydration errorを防ぐため、クライアント側でのみ判定
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  React.useEffect(() => {
    // クライアント側でのみ実行
    setIsMobile(window.innerWidth < 1024);
  }, []);

  // 初回訪問時に権限セットアップを表示
  useEffect(() => {
    // localStorage で権限取得済みかチェック
    const permissionsGranted = localStorage.getItem('permissionsGranted');
    if (!permissionsGranted && !isSessionActive) {
      // 初回訪問または権限未取得の場合
      setShowPermissionSetup(true);
    } else {
      setPermissionsReady(true);
    }
  }, [isSessionActive]);

  // 権限セットアップ完了時の処理
  const handlePermissionSetupComplete = () => {
    localStorage.setItem('permissionsGranted', 'true');
    setPermissionsReady(true);
    setShowPermissionSetup(false);
  };

  // 権限セットアップをスキップ
  const handlePermissionSetupSkip = () => {
    setShowPermissionSetup(false);
    // スキップした場合は、セッション開始時に個別に権限を要求
  };

  // レイアウトコンポーネントに渡すprops
  const layoutProps = {
    isSessionActive,
    isConnecting,
    isRecording,
    isProcessing,
    messages,
    inputText,
    interactionMode,
    unreadJobsCount,
    viewedJobIds,
    currentTranscript,
    audioLevel,
    inputRef,
    startSession,
    endSession,
    checkSessionStatus,
    toggleRecording,
    handleTextSubmit,
    setInputText,
    setInteractionMode,
    setUnreadJobsCount,
    setViewedJobIds,
    permissionsReady,
    showPermissionSetup: () => setShowPermissionSetup(true),
  };

  // マイクアクセスの再リクエスト
  const retryMicrophoneAccess = async () => {
    if (!audioRecorderRef.current) return;

    const success = await audioRecorderRef.current.startRecording();
    if (success) {
      // 成功したらすぐに停止（テスト目的）
      await audioRecorderRef.current.stopRecording();
      setShowMicGuide(false);
      // 再度録音ボタンを押してもらう
      alert('マイクの許可が確認できました！録音ボタンを押して会話を始めてください。');
    } else {
      // まだブロックされている
      console.log('Microphone access still blocked');
    }
  };

  // VideoPanelを共通化して、レイアウト切り替えで再マウントされないようにする
  // isMobileがnullの間は何も表示しない（Hydration errorを防ぐ）
  if (isMobile === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* 共通のVideoPanel - レスポンシブクリップで表示エリアを制御 */}
      <div className={`fixed z-20 bg-black ${isMobile
        ? 'top-16 left-0 right-0' // モバイル: ヘッダー下から
        : 'top-20 left-0 w-1/2'   // PC: ヘッダー下から左半分
        }`} style={{
          height: isMobile ? 'calc(50vh - 4rem)' : 'calc(100vh - 5rem)'
        }}>
        <VideoPanel
          isActive={isSessionActive}
          showSubtitles={showSubtitles}
          subtitle={currentSubtitle}
          livekitClient={livekitClientRef.current}
        />

        {/* 字幕トグルボタン */}
        {isSessionActive && (
          <div className="absolute top-4 right-4 z-30">
            <button
              onClick={() => setShowSubtitles(!showSubtitles)}
              className={`p-2 rounded-lg transition-colors ${showSubtitles
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
            >
              <Subtitles className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 音声ブロック警告 */}
        {audioBlocked && isSessionActive && (
          <div className="absolute top-0 left-0 right-0 z-40 bg-yellow-500 text-white p-3 md:p-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <span className="text-sm md:text-base font-medium">
                    音声がブロックされています
                  </span>
                  <span className="hidden md:inline text-sm ml-2">
                    ブラウザの設定により音声再生が制限されています
                  </span>
                </div>
              </div>
              <button
                onClick={enableAudio}
                className="bg-white text-yellow-600 font-bold px-3 py-1 md:px-5 md:py-2 rounded text-sm md:text-base hover:bg-yellow-50 transition-colors shadow-sm"
              >
                音声を有効にする
              </button>
            </div>
          </div>
        )}
      </div>

      {/* レスポンシブレイアウト */}
      <div className="relative z-10 h-full">
        {isMobile ? <MobileLayout {...layoutProps} /> : <DesktopLayout {...layoutProps} />}
      </div>

      {/* マイク許可ガイド */}
      {showMicGuide && (
        <MicrophonePermissionGuide
          onRetry={retryMicrophoneAccess}
          onClose={() => setShowMicGuide(false)}
        />
      )}

      {/* 初期権限セットアップ */}
      {showPermissionSetup && (
        <PermissionSetupGuide
          onComplete={handlePermissionSetupComplete}
          onSkip={handlePermissionSetupSkip}
        />
      )}
    </div>
  );
}