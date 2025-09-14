'use client';

import React, { useEffect, useRef } from 'react';
import { LiveKitClient } from '@/lib/livekit-client';

interface VideoPanelProps {
  isActive: boolean;
  showSubtitles: boolean;
  subtitle: string;
  livekitClient?: LiveKitClient | null;
}

export default function VideoPanel({ isActive, showSubtitles, subtitle, livekitClient }: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // LiveKitのビデオストリームが来たらvideoRefに設定する処理
    if (isActive && livekitClient && videoRef.current) {
      // 少し待ってからセット（DOMが完全にレンダリングされるのを待つ）
      setTimeout(() => {
        if (videoRef.current) {
          livekitClient.setVideoElement(videoRef.current);
        }
      }, 500);
    }
  }, [isActive, livekitClient]);

  return (
    <div className="relative h-full bg-black overflow-hidden" ref={containerRef}>
      <div className="h-full w-full">
        {isActive ? (
          <video
            ref={videoRef}
            id="avatar-video"
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-gray-600"
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
              <p className="text-gray-400">セッションを開始してください</p>
            </div>
          </div>
        )}
      </div>

      {/* 字幕表示 */}
      {isActive && showSubtitles && subtitle && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="bg-black/60 backdrop-blur-sm rounded px-4 py-2 max-w-4xl mx-auto">
            <p className="text-white text-center text-sm sm:text-base">
              {subtitle}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}