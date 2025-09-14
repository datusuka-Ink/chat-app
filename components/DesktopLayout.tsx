'use client';

import React from 'react';
import { Mic, MicOff, PhoneOff, Settings, Send, Volume2, MessageSquare, Headphones, Briefcase, Loader2 } from 'lucide-react';
import ChatPanel from './ChatPanel';
import JobCard from './JobCard';
import type { JobItem } from '@/lib/tools/search-jobs';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  jobs?: JobItem[];
}

type InteractionMode = 'chat' | 'voice' | 'jobs';

interface DesktopLayoutProps {
  isSessionActive: boolean;
  isConnecting: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  messages: Message[];
  inputText: string;
  interactionMode: InteractionMode;
  unreadJobsCount: number;
  viewedJobIds: Set<string>;
  currentTranscript: string;
  audioLevel: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  checkSessionStatus: () => Promise<void>;
  toggleRecording: () => Promise<void>;
  handleTextSubmit: () => Promise<void>;
  setInputText: (text: string) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  setUnreadJobsCount: (count: number) => void;
  setViewedJobIds: (ids: Set<string>) => void;
}

const DesktopLayout: React.FC<DesktopLayoutProps> = ({
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
}) => (
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
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${interactionMode === 'voice'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Headphones className="w-4 h-4" />
                会話モード
              </button>
              <button
                onClick={() => setInteractionMode('chat')}
                className={`flex-1 py-4 px-6 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${interactionMode === 'chat'
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
                className={`relative flex-1 py-4 px-6 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${interactionMode === 'jobs'
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
                      className={`relative z-10 p-10 rounded-full transition-all transform ${isRecording
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
                            className={`h-3 rounded-full transition-all duration-100 ${audioLevel > 60 ? 'bg-green-500' : audioLevel > 30 ? 'bg-yellow-500' : 'bg-red-500'
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
                        key="desktop-chat-input"
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                        placeholder="メッセージを入力..."
                        className="flex-1 px-4 py-3 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
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

export default DesktopLayout;