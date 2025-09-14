'use client';

import React, { useState } from 'react';
import { Volume2, Mic, Check, X, Smartphone, Monitor, AlertCircle } from 'lucide-react';

interface PermissionSetupGuideProps {
  onComplete: () => void;
  onSkip?: () => void;
}

type PermissionStatus = 'pending' | 'checking' | 'granted' | 'denied';

interface PermissionState {
  audio: PermissionStatus;
  microphone: PermissionStatus;
}

export default function PermissionSetupGuide({ onComplete, onSkip }: PermissionSetupGuideProps) {
  const [permissions, setPermissions] = useState<PermissionState>({
    audio: 'pending',
    microphone: 'pending',
  });
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    // モバイルデバイスの検出
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobile = /iphone|ipad|ipod|android/i.test(userAgent);
      setIsMobile(mobile);
    };
    checkMobile();
  }, []);

  // 音声再生とマイクの許可を同時にリクエスト
  const requestPermissions = async () => {
    setIsChecking(true);
    setError(null);

    // 1. 音声再生の許可（AudioContext初期化）
    let audioGranted = false;
    try {
      // AudioContextの初期化（音声再生を可能にする）
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

        // AudioContextの状態を確認
        if (audioContext.state === 'running') {
          audioGranted = true;
          setPermissions(prev => ({ ...prev, audio: 'granted' }));
        } else if (audioContext.state === 'suspended') {
          // suspended状態の場合はresumeを試みる
          try {
            await audioContext.resume();
            audioGranted = true;
            setPermissions(prev => ({ ...prev, audio: 'granted' }));
          } catch {
            setPermissions(prev => ({ ...prev, audio: 'denied' }));
          }
        } else {
          setPermissions(prev => ({ ...prev, audio: 'denied' }));
        }
      }
    } catch (err) {
      console.error('Audio permission error:', err);
      setPermissions(prev => ({ ...prev, audio: 'denied' }));
    }

    // 2. マイクの許可（getUserMedia）
    let micGranted = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // ストリームを取得できたら許可された
      micGranted = true;
      setPermissions(prev => ({ ...prev, microphone: 'granted' }));

      // ストリームを停止（リソースを解放）
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Microphone permission error:', err);
      setPermissions(prev => ({ ...prev, microphone: 'denied' }));

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('マイクへのアクセスが拒否されました。ブラウザの設定から許可してください。');
        } else if (err.name === 'NotFoundError') {
          setError('マイクが見つかりません。デバイスが接続されているか確認してください。');
        }
      }
    }

    setIsChecking(false);

    // 両方の許可が取得できた場合は完了
    if (audioGranted && micGranted) {
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  };

  const getStatusIcon = (status: PermissionStatus) => {
    switch (status) {
      case 'granted':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'denied':
        return <X className="w-5 h-5 text-red-600" />;
      case 'checking':
        return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusText = (status: PermissionStatus) => {
    switch (status) {
      case 'granted':
        return '許可されました';
      case 'denied':
        return '拒否されました';
      case 'checking':
        return '確認中...';
      default:
        return '未設定';
    }
  };

  const allPermissionsGranted = permissions.audio === 'granted' && permissions.microphone === 'granted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center mb-2">
            {isMobile ? <Smartphone className="w-8 h-8 mr-3" /> : <Monitor className="w-8 h-8 mr-3" />}
            <h1 className="text-2xl font-bold">初期セットアップ</h1>
          </div>
          <p className="text-blue-100">
            快適な会話体験のために、音声とマイクの許可が必要です
          </p>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          {/* 許可項目リスト */}
          <div className="space-y-4 mb-6">
            {/* 音声再生 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Volume2 className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">音声再生</h3>
                  <p className="text-sm text-gray-600">AIアシスタントの声を聞くために必要</p>
                </div>
              </div>
              <div className="flex items-center">
                {getStatusIcon(permissions.audio)}
                <span className="ml-2 text-sm text-gray-700">
                  {getStatusText(permissions.audio)}
                </span>
              </div>
            </div>

            {/* マイク入力 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Mic className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">マイク入力</h3>
                  <p className="text-sm text-gray-600">音声で会話するために必要</p>
                </div>
              </div>
              <div className="flex items-center">
                {getStatusIcon(permissions.microphone)}
                <span className="ml-2 text-sm text-gray-700">
                  {getStatusText(permissions.microphone)}
                </span>
              </div>
            </div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* モバイル向けの追加説明 */}
          {isMobile && !allPermissionsGranted && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                📱 モバイルブラウザでは、ボタンをタップした時にブラウザから許可を求められます。
                「許可」を選択してください。
              </p>
            </div>
          )}

          {/* アクションボタン */}
          {!allPermissionsGranted ? (
            <div className="space-y-3">
              <button
                onClick={requestPermissions}
                disabled={isChecking}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                  isChecking
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105'
                }`}
              >
                {isChecking ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    設定中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Check className="w-5 h-5 mr-2" />
                    音声とマイクを有効にする
                  </span>
                )}
              </button>

              {onSkip && (
                <button
                  onClick={onSkip}
                  className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  後で設定する
                </button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">設定完了！</h3>
                <p className="text-sm text-gray-600 mt-1">
                  すべての許可が正常に設定されました
                </p>
              </div>
            </div>
          )}

          {/* デバッグ情報（開発用） */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
              <p>Audio: {permissions.audio}</p>
              <p>Microphone: {permissions.microphone}</p>
              <p>Mobile: {isMobile ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}