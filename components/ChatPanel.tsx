'use client';

import React, { useEffect, useRef } from 'react';
import JobCard from './JobCard';
import type { JobItem } from '@/lib/tools/search-jobs';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  jobs?: JobItem[];
}

interface ChatPanelProps {
  messages: Message[];
  onJobCardClick?: (job: JobItem) => void;
}

export default function ChatPanel({ messages, onJobCardClick }: ChatPanelProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 新しいメッセージが追加されたら自動スクロール
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">会話ログ</h2>
      </div>

      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>セッションを開始すると会話が表示されます</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id}>
              <div
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === 'user'
                        ? 'text-blue-100'
                        : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString('ja-JP')}
                  </p>
                </div>
              </div>

              {/* 求人カード表示 */}
              {message.jobs && message.jobs.length > 0 && (
                <div className="mt-4 space-y-3">
                  {message.jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onClick={() => onJobCardClick?.(job)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}