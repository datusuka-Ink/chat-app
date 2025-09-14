'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mic, Speaker, Save } from 'lucide-react';
import Link from 'next/link';

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export default function SettingsPage() {
  const [audioInputDevices, setAudioInputDevices] = useState<AudioDevice[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<AudioDevice[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('default');
  const [selectedOutput, setSelectedOutput] = useState<string>('default');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [echoCancellation, setEchoCancellation] = useState<boolean>(true);
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(true);
  const [autoGainControl, setAutoGainControl] = useState<boolean>(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // 音声デバイスリストを取得
    const getDevices = async () => {
      try {
        // 権限を要求
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const devices = await navigator.mediaDevices.enumerateDevices();

        const inputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `マイク ${device.deviceId.substring(0, 5)}`,
            kind: 'audioinput' as const,
          }));

        const outputs = devices
          .filter(device => device.kind === 'audiooutput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `スピーカー ${device.deviceId.substring(0, 5)}`,
            kind: 'audiooutput' as const,
          }));

        setAudioInputDevices(inputs);
        setAudioOutputDevices(outputs);

        // 保存された設定を読み込み
        const savedSettings = localStorage.getItem('audioSettings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setSelectedInput(settings.selectedInput || 'default');
          setSelectedOutput(settings.selectedOutput || 'default');
          setSpeechRate(settings.speechRate || 1.0);
          setShowSubtitles(settings.showSubtitles !== false);
          setEchoCancellation(settings.echoCancellation !== false);
          setNoiseSuppression(settings.noiseSuppression !== false);
          setAutoGainControl(settings.autoGainControl !== false);
        }
      } catch (error) {
        console.error('Failed to get audio devices:', error);
      }
    };

    getDevices();

    // デバイス変更の監視
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, []);

  const saveSettings = () => {
    const settings = {
      selectedInput,
      selectedOutput,
      speechRate,
      showSubtitles,
      echoCancellation,
      noiseSuppression,
      autoGainControl,
    };

    localStorage.setItem('audioSettings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedInput !== 'default' ? { exact: selectedInput } : undefined,
          echoCancellation,
          noiseSuppression,
          autoGainControl,
        },
      });

      // 音声レベル表示（簡易テスト）
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 256;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let maxLevel = 0;
      const checkLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        maxLevel = Math.max(maxLevel, average);
      };

      const interval = setInterval(checkLevel, 100);

      // 3秒後に停止
      setTimeout(() => {
        clearInterval(interval);
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        alert(`マイクテスト完了。最大音量レベル: ${Math.round(maxLevel)}%`);
      }, 3000);

      alert('マイクテスト中... 3秒間話してください。');
    } catch (error) {
      console.error('Microphone test failed:', error);
      alert('マイクテストに失敗しました。');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/"
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              戻る
            </Link>
            <h1 className="ml-4 text-xl font-semibold text-gray-900">設定</h1>
            <Link
              href="/settings/avatars"
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              アバター選択
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            {/* 音声入力デバイス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mic className="inline w-4 h-4 mr-1" />
                入力デバイス（マイク）
              </label>
              <select
                value={selectedInput}
                onChange={(e) => setSelectedInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="default">デフォルト</option>
                {audioInputDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
              <button
                onClick={testMicrophone}
                className="mt-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                マイクをテスト
              </button>
            </div>

            {/* 音声出力デバイス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Speaker className="inline w-4 h-4 mr-1" />
                出力デバイス（スピーカー）
              </label>
              <select
                value={selectedOutput}
                onChange={(e) => setSelectedOutput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="default">デフォルト</option>
                {audioOutputDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 音声処理設定 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">音声処理</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={echoCancellation}
                    onChange={(e) => setEchoCancellation(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">エコーキャンセリング</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={noiseSuppression}
                    onChange={(e) => setNoiseSuppression(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">ノイズ抑制</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoGainControl}
                    onChange={(e) => setAutoGainControl(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">自動ゲイン調整</span>
                </label>
              </div>
            </div>

            {/* 発話速度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                発話速度
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-12 text-right">
                  {speechRate.toFixed(1)}x
                </span>
              </div>
            </div>

            {/* 字幕設定 */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showSubtitles}
                  onChange={(e) => setShowSubtitles(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  字幕を表示
                </span>
              </label>
            </div>

            {/* 保存ボタン */}
            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={saveSettings}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                設定を保存
              </button>
            </div>

            {/* 保存完了メッセージ */}
            {saved && (
              <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
                設定を保存しました
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}