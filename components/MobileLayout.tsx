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

interface MobileLayoutProps {
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
  permissionsReady?: boolean;
  showPermissionSetup?: () => void;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
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
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${interactionMode === 'voice'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <Headphones className="w-4 h-4" />
                会話モード
              </button>
              <button
                onClick={() => setInteractionMode('chat')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${interactionMode === 'chat'
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
                className={`relative flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${interactionMode === 'jobs'
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
                      className={`relative z-10 p-8 rounded-full transition-all transform ${isRecording
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
                            className={`h-2 rounded-full transition-all duration-100 ${audioLevel > 60 ? 'bg-green-500' : audioLevel > 30 ? 'bg-yellow-500' : 'bg-red-500'
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
                        key="mobile-chat-input"
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                        placeholder="メッセージを入力..."
                        className="flex-1 px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
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

export default MobileLayout;