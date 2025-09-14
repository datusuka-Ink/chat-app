'use client';

import React, { useEffect, useRef, memo } from 'react';
import { LiveKitClient } from '@/lib/livekit-client';

interface VideoPanelProps {
  isActive: boolean;
  showSubtitles: boolean;
  subtitle: string;
  livekitClient?: LiveKitClient | null;
}

const VideoPanel = memo(function VideoPanel({ isActive, showSubtitles, subtitle, livekitClient }: VideoPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const setupDoneRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // video要素を動的に作成（React管理外）
    if (!videoElementRef.current) {
      console.log('VideoPanel: Creating video element outside React');

      const videoElement = document.createElement('video');
      videoElement.id = 'avatar-video';
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      // 初期状態では全環境でmutedにして自動再生を確実にする
      // LiveKitが後で音声トラックを適切に処理する
      videoElement.muted = false;  // LiveKitが音声トラックを管理するのでfalseでOK
      videoElement.volume = 1.0; // 音量を最大に設定
      videoElement.className = 'w-full h-full object-contain';
      videoElement.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';

      console.log('VideoPanel: Video element created with autoplay enabled');


      // スマホブラウザでの自動再生のためのエラーハンドリング
      videoElement.addEventListener('canplay', () => {
        videoElement.play().catch(e => {
          console.warn('Video autoplay was prevented:', e);
        });
      });

      // コンテナに追加
      containerRef.current.appendChild(videoElement);
      videoElementRef.current = videoElement;

      console.log('VideoPanel: Video element created and added to DOM');
    }

    // LiveKitセットアップ
    if (isActive && livekitClient && videoElementRef.current && !setupDoneRef.current) {
      console.log('VideoPanel: Setting up LiveKit connection');

      livekitClient.setVideoElement(videoElementRef.current);
      setupDoneRef.current = true;

      // ストリーム状態を監視
      const monitorInterval = setInterval(() => {
        if (videoElementRef.current) {
          const hasStream = !!videoElementRef.current.srcObject;
          if (!hasStream && setupDoneRef.current) {
            console.log('VideoPanel: Stream lost, attempting recovery');
            // 必要に応じて復旧処理を追加可能
          }
        }
      }, 5000);

      return () => {
        clearInterval(monitorInterval);
      };
    }
  }, [isActive, livekitClient]);

  // クリーンアップ
  useEffect(() => {
    const container = containerRef.current;
    const videoElement = videoElementRef.current;

    return () => {
      if (videoElement && container) {
        console.log('VideoPanel: Cleaning up video element');
        container.removeChild(videoElement);
        videoElementRef.current = null;
      }
      setupDoneRef.current = false;
    };
  }, []);

  return (
    <div className="relative h-full bg-black overflow-hidden" ref={containerRef}>
      {/* プレースホルダー（セッション未開始時） */}
      {!isActive && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
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
}, (prevProps, nextProps) => {
  // video要素はReact管理外なので、基本的な変更のみをチェック
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.livekitClient === nextProps.livekitClient
  );
});

export default VideoPanel;