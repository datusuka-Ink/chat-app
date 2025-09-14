'use client';

import React from 'react';
import { Mic, MicOff, Chrome, Globe, Settings } from 'lucide-react';

interface MicrophonePermissionGuideProps {
  onRetry: () => void;
  onClose: () => void;
}

export default function MicrophonePermissionGuide({ onRetry, onClose }: MicrophonePermissionGuideProps) {
  const [browserType, setBrowserType] = React.useState<'chrome' | 'safari' | 'firefox' | 'other'>('other');

  React.useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome') && !userAgent.includes('edge')) {
      setBrowserType('chrome');
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      setBrowserType('safari');
    } else if (userAgent.includes('firefox')) {
      setBrowserType('firefox');
    }
  }, []);

  const getBrowserInstructions = () => {
    switch (browserType) {
      case 'chrome':
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Chrome className="w-5 h-5 mr-2" />
              Chrome でマイクを許可する方法
            </h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex">
                <span className="font-bold mr-2">1.</span>
                <span>アドレスバーの左側にある🔒アイコンをクリック</span>
              </li>
              <li className="flex">
                <span className="font-bold mr-2">2.</span>
                <span>「サイトの設定」をクリック</span>
              </li>
              <li className="flex">
                <span className="font-bold mr-2">3.</span>
                <span>「マイク」を「許可」に変更</span>
              </li>
              <li className="flex">
                <span className="font-bold mr-2">4.</span>
                <span>ページを再読み込み</span>
              </li>
            </ol>
          </div>
        );
      case 'safari':
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Safari でマイクを許可する方法
            </h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex">
                <span className="font-bold mr-2">1.</span>
                <span>Safari メニュー → 「設定」を開く</span>
              </li>
              <li className="flex">
                <span className="font-bold mr-2">2.</span>
                <span>「Webサイト」タブを選択</span>
              </li>
              <li className="flex">
                <span className="font-bold mr-2">3.</span>
                <span>左側で「マイク」を選択</span>
              </li>
              <li className="flex">
                <span className="font-bold mr-2">4.</span>
                <span>このサイトを「許可」に設定</span>
              </li>
            </ol>
          </div>
        );
      case 'firefox':
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Firefox でマイクを許可する方法
            </h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex">
                <span className="font-bold mr-2">1.</span>
                <span>アドレスバーの左側にある🔒アイコンをクリック</span>
              </li>
              <li className="flex">
                <span className="font-bold mr-2">2.</span>
                <span>「接続は安全です」の右の「{'>'} 」をクリック</span>
              </li>
              <li className="flex">
                <span className="font-bold mr-2">3.</span>
                <span>「詳細を表示」→「サイト別設定」</span>
              </li>
              <li className="flex">
                <span className="font-bold mr-2">4.</span>
                <span>「マイクの使用」を「許可」に変更</span>
              </li>
            </ol>
          </div>
        );
      default:
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              マイクを許可する方法
            </h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex">
                <span className="font-bold mr-2">1.</span>
                <span>ブラウザの設定を開く</span>
              </li>
              <li className="flex">
                <span className="font-bold mr-2">2.</span>
                <span>プライバシー/セキュリティ設定を確認</span>
              </li>
              <li className="flex">
                <span className="font-bold mr-2">3.</span>
                <span>このサイトのマイクアクセスを許可</span>
              </li>
              <li className="flex">
                <span className="font-bold mr-2">4.</span>
                <span>ページを再読み込み</span>
              </li>
            </ol>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="bg-red-50 border-b border-red-200 p-4 rounded-t-lg">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-full p-2 mr-3">
              <MicOff className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                マイクへのアクセスが必要です
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                音声での会話を行うためにマイクの使用許可が必要です
              </p>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-4">
          {/* クイックアクション */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 mb-3">
              まずは、もう一度マイクの許可をリクエストしてみてください：
            </p>
            <button
              onClick={onRetry}
              className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Mic className="w-5 h-5 mr-2" />
              マイクアクセスを再リクエスト
            </button>
          </div>

          {/* ブラウザ別の手順 */}
          <div className="border border-gray-200 rounded-lg p-4">
            {getBrowserInstructions()}
          </div>

          {/* トラブルシューティング */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              それでも動作しない場合
            </h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• 他のタブやアプリがマイクを使用していないか確認</li>
              <li>• ブラウザを完全に再起動してみる</li>
              <li>• システム設定でマイクが有効になっているか確認</li>
              <li>• 別のブラウザで試してみる</li>
            </ul>
          </div>
        </div>

        {/* フッター */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              後で設定する
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-green-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              設定完了（再読み込み）
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}