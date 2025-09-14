'use client';

import React, { useEffect, useState } from 'react';
import { Trash2, Check } from 'lucide-react';
import Link from 'next/link';

export default function ClearAvatarPage() {
  const [cleared, setCleared] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const avatar = localStorage.getItem('selectedAvatarId');
      setCurrentAvatar(avatar);
    }
  }, []);

  const clearAvatar = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedAvatarId');
      setCleared(true);
      setCurrentAvatar(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          アバター設定をクリア
        </h1>

        {currentAvatar && !cleared && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">現在設定中のアバター:</p>
            <p className="font-mono text-xs mt-1">{currentAvatar}</p>
          </div>
        )}

        {!cleared ? (
          <button
            onClick={clearAvatar}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            <span>アバター設定をクリア</span>
          </button>
        ) : (
          <div className="text-center">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-green-700 font-medium">
              アバター設定をクリアしました
            </p>
            <p className="text-gray-600 text-sm mt-2">
              デフォルトのアバターが使用されます
            </p>
          </div>
        )}

        <div className="mt-8 space-y-2">
          <Link
            href="/"
            className="block w-full text-center py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            メイン画面へ戻る
          </Link>
          <a
            href="/test-avatar"
            className="block w-full text-center py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            アバターをテスト
          </a>
        </div>
      </div>
    </div>
  );
}