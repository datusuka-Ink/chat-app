'use client';

import React, { useState, useRef } from 'react';
import { Mic, PhoneOff, Settings, Subtitles, Send, Volume2, MessageSquare, Headphones, Briefcase } from 'lucide-react';
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
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('voice');
  const [unreadJobsCount, setUnreadJobsCount] = useState(0);
  const [viewedJobIds, setViewedJobIds] = useState<Set<string>>(new Set());

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

      // 少し待機してからLiveKit接続
      await new Promise(resolve => setTimeout(resolve, 1000));

      // LiveKit接続
      livekitClientRef.current = new LiveKitClient();
      await livekitClientRef.current.connect(livekitUrl, accessToken);

      // 音声レコーダー初期化
      audioRecorderRef.current = new AudioRecorder();
      audioRecorderRef.current.onAudioLevel = setAudioLevel;

      setIsSessionActive(true);
      setIsConnecting(false);

      // さらに少し待機してトラックが来るのを待つ
      await new Promise(resolve => setTimeout(resolve, 3000));

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

  // PTT録音開始/停止（マウスダウン/アップ用）
  const startRecording = async () => {
    if (!audioRecorderRef.current || isRecording) return;

    const success = await audioRecorderRef.current.startRecording();
    if (success) {
      setIsRecording(true);
    } else {
      alert('マイクへのアクセスが許可されていません。');
    }
  };

  const stopRecording = async () => {
    if (!audioRecorderRef.current || !isRecording) return;

    const audioBlob = await audioRecorderRef.current.stopRecording();
    setIsRecording(false);
    setAudioLevel(0);

    if (audioBlob) {
      // 処理中メッセージを追加
      const processingMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: '音声を認識中...',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, processingMessage]);

      await processAudioInput(audioBlob);

      // 処理中メッセージを削除
      setMessages(prev => prev.filter(m => m.id !== processingMessage.id));
    }
  };

  // 音声入力処理
  const processAudioInput = async (audioBlob: Blob) => {
    try {
      // ファイルサイズチェック
      const sizeMB = audioBlob.size / (1024 * 1024);
      console.log(`Audio size: ${sizeMB.toFixed(2)} MB`);

      if (sizeMB < 0.01) {
        alert('録音が短すぎます。もう少し長く話してください。');
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
        alert('音声が認識できませんでした。もう一度お試しください。');
        return;
      }

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
      alert('音声認識に失敗しました。ネットワーク接続を確認してください。');
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

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-semibold text-gray-900">
              キャリア相談AI
            </h1>
            <button
              onClick={() => window.location.href = '/settings'}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* アバター表示部分（上半分） */}
        <div className="h-1/2 relative bg-gray-900">
          <VideoPanel
            isActive={isSessionActive}
            showSubtitles={showSubtitles}
            subtitle={currentSubtitle}
            livekitClient={livekitClientRef.current}
          />

          {/* 字幕トグル */}
          {isSessionActive && (
            <button
              onClick={() => setShowSubtitles(!showSubtitles)}
              className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
                showSubtitles
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Subtitles className="w-5 h-5" />
            </button>
          )}
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
                  /* 会話モード */
                  <div className="h-full flex flex-col">
                    {/* 最新のメッセージ表示 */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {messages.slice(-3).map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-blue-50 text-blue-900 ml-auto max-w-[80%]'
                              : message.role === 'assistant'
                              ? 'bg-gray-100 text-gray-900 mr-auto max-w-[80%]'
                              : 'bg-yellow-50 text-yellow-900 text-center text-sm'
                          }`}
                        >
                          {message.content}
                        </div>
                      ))}
                    </div>

                    {/* Push-to-Talk ボタン */}
                    <div className="p-6 border-t bg-gray-50">
                      {/* 音声レベルメーター */}
                      {isRecording && (
                        <div className="mb-4 bg-white rounded-lg p-3 border-2 border-red-200">
                          <div className="flex items-center space-x-2">
                            <Volume2 className="w-4 h-4 text-gray-600" />
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-100 ${
                                  audioLevel > 60 ? 'bg-green-500' : audioLevel > 30 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${audioLevel}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{Math.round(audioLevel)}%</span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col items-center">
                        <button
                          onMouseDown={startRecording}
                          onMouseUp={stopRecording}
                          onTouchStart={startRecording}
                          onTouchEnd={stopRecording}
                          disabled={!isSessionActive}
                          className={`relative p-8 rounded-full transition-all transform ${
                            isRecording
                              ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
                              : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
                          } text-white shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed`}
                        >
                          {isRecording ? (
                            <>
                              <Mic className="w-10 h-10" />
                              <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-600 rounded-full animate-ping"></span>
                            </>
                          ) : (
                            <Mic className="w-10 h-10" />
                          )}
                        </button>
                        <span className="mt-3 text-sm text-gray-600">
                          {isRecording ? '話しています...' : '押しながら話す'}
                        </span>
                      </div>
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
}