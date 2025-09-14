'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, PhoneOff, Settings, Subtitles, Send, Volume2, MessageSquare, Headphones, Briefcase, Loader2 } from 'lucide-react';
import VideoPanel from './VideoPanel';
import ChatPanel from './ChatPanel';
import JobCard from './JobCard';
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
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('voice');
  const [unreadJobsCount, setUnreadJobsCount] = useState(0);
  const [viewedJobIds, setViewedJobIds] = useState<Set<string>>(new Set());
  const [currentTranscript, setCurrentTranscript] = useState('');

  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const livekitClientRef = useRef<LiveKitClient | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // セッション開始
  const startSession = async () => {
    try {
      setIsConnecting(true);

      // 保存されたアバターIDを取得（デフォルトは指定しない）
      const savedAvatarId = localStorage.getItem('selectedAvatarId');

      // HeyGen セッション作成
      const sessionResponse = await fetch('/api/heygen/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          savedAvatarId ? { avatarId: savedAvatarId } : {}
        ),
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
      await livekitClientRef.current.connect(livekitUrl, accessToken);
      console.log('LiveKit connected successfully');

      // 音声レコーダー初期化
      audioRecorderRef.current = new AudioRecorder();
      audioRecorderRef.current.onAudioLevel = setAudioLevel;

      setIsSessionActive(true);
      setIsConnecting(false);

      // トラックが安定するまで待機（2秒）
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 初回挨拶
      const greetingMessage = 'こんにちは！新卒キャリアエージェントAIです。今日はキャリア相談をしながら、最後にあなたに合った求人を紹介させていただきます。まずは大学・学部や専攻、就活の進捗状況を教えていただけますか？';

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
        alert('マイクへのアクセスが許可されていません。');
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

  // video要素はReact管理外になったので、参照の安定化は不要

  // モバイルレイアウト
  const MobileLayout = () => (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-semibold text-gray-900">
              新卒キャリア相談AI
            </h1>
            <div className="flex items-center gap-2">
              {isSessionActive && (
                <button
                  onClick={checkSessionStatus}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  title="セッション状態を確認"
                >
                  🔍
                </button>
              )}
              <button
                onClick={() => window.location.href = '/settings'}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* アバター表示部分（上半分） - プレースホルダー */}
        <div className="h-1/2 relative">
          {/* 共通VideoPanelが背後に表示される */}
        </div>

        {/* インタラクション部分（下半分） */}
        <div className="h-1/2 flex flex-col bg-white">
          {!isSessionActive ? (
            /* セッション開始ボタン */
            <div className="flex-1 flex items-center justify-center p-6">
              <button
                onClick={startSession}
                disabled={isConnecting}
                className="w-full max-w-sm py-4 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg transition-colors"
              >
                {isConnecting ? '接続中...' : 'キャリア相談を開始する'}
              </button>
            </div>
          ) : (
            <>
              {/* モード切り替えタブ */}
              <div className="flex border-b bg-gray-50">
                <button
                  onClick={() => setInteractionMode('voice')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    interactionMode === 'voice'
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Headphones className="w-4 h-4" />
                  会話モード
                </button>
                <button
                  onClick={() => setInteractionMode('chat')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    interactionMode === 'chat'
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  チャット
                </button>
                <button
                  onClick={() => {
                    setInteractionMode('jobs');
                    setUnreadJobsCount(0);  // 求人タブを開いたら通知をクリア
                    // 現在表示されているすべての求人を既読にする
                    const allJobs = messages
                      .filter(m => m.jobs && m.jobs.length > 0)
                      .flatMap(m => m.jobs || []);
                    setViewedJobIds(new Set(allJobs.map(job => job.id)));
                  }}
                  className={`relative flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    interactionMode === 'jobs'
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  求人情報
                  {unreadJobsCount > 0 && (
                    <>
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center animate-pulse">
                        {unreadJobsCount}
                      </span>
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center animate-ping opacity-75">
                        {unreadJobsCount}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* コンテンツエリア */}
              <div className="flex-1 overflow-hidden">
                {interactionMode === 'voice' ? (
                  /* 会話モード - シンプルで洗練されたUI */
                  <div className="h-full flex flex-col justify-center items-center p-6 bg-gradient-to-b from-white to-gray-50">
                    {/* 現在の状態表示 */}
                    <div className="mb-8 text-center">
                      {currentTranscript && (
                        <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200 animate-fade-in">
                          <p className="text-gray-700">{currentTranscript}</p>
                        </div>
                      )}
                      {!currentTranscript && !isRecording && (
                        <p className="text-gray-500 text-sm">マイクボタンをタップして話しかけてください</p>
                      )}
                    </div>

                    {/* 録音ボタン - 中央に大きく配置 */}
                    <div className="relative">
                      {/* 音声レベル表示（録音中のみ） */}
                      {isRecording && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div
                            className="rounded-full bg-blue-500 opacity-20 animate-pulse"
                            style={{
                              width: `${120 + audioLevel * 1.5}px`,
                              height: `${120 + audioLevel * 1.5}px`,
                            }}
                          />
                        </div>
                      )}

                      <button
                        onClick={toggleRecording}
                        disabled={!isSessionActive || isProcessing}
                        className={`relative z-10 p-8 rounded-full transition-all transform ${
                          isRecording
                            ? 'bg-red-500 hover:bg-red-600 scale-110'
                            : isProcessing
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
                        } text-white shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed`}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-12 h-12 animate-spin" />
                        ) : isRecording ? (
                          <MicOff className="w-12 h-12" />
                        ) : (
                          <Mic className="w-12 h-12" />
                        )}
                      </button>
                    </div>

                    {/* 状態テキスト */}
                    <div className="mt-6 text-center">
                      <p className="text-sm font-medium text-gray-700">
                        {isProcessing ? '処理中...' : isRecording ? '録音中（タップで停止）' : 'タップして話す'}
                      </p>
                      {isRecording && (
                        <div className="mt-3 flex items-center justify-center space-x-2">
                          <Volume2 className="w-4 h-4 text-gray-500" />
                          <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-100 ${
                                audioLevel > 60 ? 'bg-green-500' : audioLevel > 30 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${audioLevel}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{Math.round(audioLevel)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : interactionMode === 'chat' ? (
                  /* チャットモード */
                  <div className="h-full flex flex-col">
                    {/* メッセージ一覧 */}
                    <div className="flex-1 overflow-y-auto">
                      <ChatPanel
                        messages={messages}
                        onJobCardClick={(job) => window.open(job.url, '_blank')}
                      />
                    </div>

                    {/* テキスト入力 */}
                    <div className="p-4 border-t bg-gray-50">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                          placeholder="メッセージを入力..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleTextSubmit}
                          disabled={!inputText.trim()}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 求人情報モード */
                  <div className="h-full overflow-y-auto p-4">
                    {(() => {
                      const allJobs = messages
                        .filter(m => m.jobs && m.jobs.length > 0)
                        .flatMap(m => m.jobs || []);

                      if (allJobs.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center text-gray-500">
                              <Briefcase className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                              <p>まだ求人情報がありません</p>
                              <p className="text-sm mt-1">会話を進めると求人が紹介されます</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <h3 className="font-medium text-gray-900 mb-3">
                            紹介された求人 ({allJobs.length}件)
                          </h3>
                          {allJobs.map((job, index) => (
                            <div key={`${job.id}-${index}`} className="relative">
                              {!viewedJobIds.has(job.id) && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 z-10 animate-bounce">
                                  NEW
                                </span>
                              )}
                              <JobCard
                                job={job}
                                onClick={() => window.open(job.url, '_blank')}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* セッション終了ボタン */}
              <div className="p-4 border-t bg-gray-50">
                <button
                  onClick={endSession}
                  className="w-full py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <PhoneOff className="w-5 h-5" />
                  終了
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );

  // PCレイアウト
  const DesktopLayout = () => (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              新卒キャリア相談AI
            </h1>
            <div className="flex items-center space-x-4">
              {isSessionActive && (
                <>
                  <button
                    onClick={checkSessionStatus}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                    title="セッション状態を確認"
                  >
                    🔍
                  </button>
                  <button
                    onClick={endSession}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    <PhoneOff className="w-5 h-5" />
                    終了
                  </button>
                </>
              )}
              <button
                onClick={() => window.location.href = '/settings'}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {!isSessionActive ? (
          // セッション開始画面 - 右半分のみ使用
          <>
            {/* 左側：アバタープレースホルダー */}
            <div className="w-1/2 relative border-r border-gray-200 bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">AIアバター待機中</p>
              </div>
            </div>

            {/* 右側：セッション開始画面 */}
            <div className="w-1/2 flex items-center justify-center p-8 bg-white">
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  新卒向けキャリア相談を始めましょう
                </h2>
                <p className="text-gray-600 mb-8">
                  AIアバターがあなたのキャリア相談に対応し、あらゆる業界から最適な求人をご紹介します
                </p>
                <button
                  onClick={startSession}
                  disabled={isConnecting}
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg transition-colors"
                >
                  {isConnecting ? '接続中...' : 'キャリア相談を開始する'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 左側：アバター表示 - プレースホルダー */}
            <div className="w-1/2 relative border-r border-gray-200">
              {/* 共通VideoPanelが背後に表示される */}
            </div>

            {/* 右側：インタラクション部分 */}
            <div className="w-1/2 flex flex-col bg-white">
              {/* モード切り替えタブ */}
              <div className="flex border-b bg-gray-50">
                <button
                  onClick={() => setInteractionMode('voice')}
                  className={`flex-1 py-4 px-6 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    interactionMode === 'voice'
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Headphones className="w-4 h-4" />
                  会話モード
                </button>
                <button
                  onClick={() => setInteractionMode('chat')}
                  className={`flex-1 py-4 px-6 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    interactionMode === 'chat'
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  チャット
                </button>
                <button
                  onClick={() => {
                    setInteractionMode('jobs');
                    setUnreadJobsCount(0);
                    const allJobs = messages
                      .filter(m => m.jobs && m.jobs.length > 0)
                      .flatMap(m => m.jobs || []);
                    setViewedJobIds(new Set(allJobs.map(job => job.id)));
                  }}
                  className={`relative flex-1 py-4 px-6 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    interactionMode === 'jobs'
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  求人情報
                  {unreadJobsCount > 0 && (
                    <span className="absolute top-2 right-4 bg-red-500 text-white text-xs rounded-full px-2 py-1 animate-pulse">
                      {unreadJobsCount}
                    </span>
                  )}
                </button>
              </div>

              {/* コンテンツエリア */}
              <div className="flex-1 overflow-hidden">
                {interactionMode === 'voice' ? (
                  /* 会話モード */
                  <div className="h-full flex flex-col justify-center items-center p-8 bg-gradient-to-b from-white to-gray-50">
                    <div className="mb-8 text-center">
                      {currentTranscript && (
                        <div className="bg-white rounded-lg px-6 py-4 shadow-sm border border-gray-200 animate-fade-in">
                          <p className="text-gray-700 text-lg">{currentTranscript}</p>
                        </div>
                      )}
                      {!currentTranscript && !isRecording && (
                        <p className="text-gray-500">マイクボタンをクリックして話しかけてください</p>
                      )}
                    </div>

                    <div className="relative">
                      {isRecording && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div
                            className="rounded-full bg-blue-500 opacity-20 animate-pulse"
                            style={{
                              width: `${150 + audioLevel * 2}px`,
                              height: `${150 + audioLevel * 2}px`,
                            }}
                          />
                        </div>
                      )}

                      <button
                        onClick={toggleRecording}
                        disabled={!isSessionActive || isProcessing}
                        className={`relative z-10 p-10 rounded-full transition-all transform ${
                          isRecording
                            ? 'bg-red-500 hover:bg-red-600 scale-110'
                            : isProcessing
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
                        } text-white shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed`}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-16 h-16 animate-spin" />
                        ) : isRecording ? (
                          <MicOff className="w-16 h-16" />
                        ) : (
                          <Mic className="w-16 h-16" />
                        )}
                      </button>
                    </div>

                    <div className="mt-8 text-center">
                      <p className="text-lg font-medium text-gray-700">
                        {isProcessing ? '処理中...' : isRecording ? '録音中（クリックで停止）' : 'クリックして話す'}
                      </p>
                      {isRecording && (
                        <div className="mt-4 flex items-center justify-center space-x-3">
                          <Volume2 className="w-5 h-5 text-gray-500" />
                          <div className="w-48 bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-3 rounded-full transition-all duration-100 ${
                                audioLevel > 60 ? 'bg-green-500' : audioLevel > 30 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${audioLevel}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500">{Math.round(audioLevel)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : interactionMode === 'chat' ? (
                  /* チャットモード */
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                      <ChatPanel
                        messages={messages}
                        onJobCardClick={(job) => window.open(job.url, '_blank')}
                      />
                    </div>

                    <div className="p-4 border-t bg-gray-50">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                          placeholder="メッセージを入力..."
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleTextSubmit}
                          disabled={!inputText.trim()}
                          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 求人情報モード */
                  <div className="h-full overflow-y-auto p-6">
                    {(() => {
                      const allJobs = messages
                        .filter(m => m.jobs && m.jobs.length > 0)
                        .flatMap(m => m.jobs || []);

                      if (allJobs.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center text-gray-500">
                              <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                              <p className="text-lg">まだ求人情報がありません</p>
                              <p className="mt-2">会話を進めると求人が紹介されます</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">
                            紹介された求人 ({allJobs.length}件)
                          </h3>
                          {allJobs.map((job, index) => (
                            <div key={`${job.id}-${index}`} className="relative">
                              {!viewedJobIds.has(job.id) && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 z-10 animate-bounce">
                                  NEW
                                </span>
                              )}
                              <JobCard
                                job={job}
                                onClick={() => window.open(job.url, '_blank')}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );

  // レスポンシブレイアウトの選択
  // useEffectを使用してクライアントサイドでのみレンダリング
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    // 初期チェック
    checkScreenSize();

    // リサイズイベントリスナー
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // VideoPanelを共通化して、レイアウト切り替えで再マウントされないようにする
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* 共通のVideoPanel - レスポンシブクリップで表示エリアを制御 */}
      <div className={`fixed z-20 bg-black ${
        isMobile
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
              className={`p-2 rounded-lg transition-colors ${
                showSubtitles
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Subtitles className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* レスポンシブレイアウト */}
      <div className="relative z-10 h-full">
        {isMobile ? <MobileLayout /> : <DesktopLayout />}
      </div>
    </div>
  );
}