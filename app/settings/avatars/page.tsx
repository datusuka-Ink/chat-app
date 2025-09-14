'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Check, Loader2, RefreshCw, Save } from 'lucide-react';
import Link from 'next/link';

interface Avatar {
  avatar_id: string;
  name?: string;
  avatar_name?: string;
  type?: string;
  is_interactive?: boolean;
  preview_url?: string;
}

export default function AvatarsPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [saved, setSaved] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      loadAvatars();
      // ローカルストレージから選択済みアバターを取得
      const savedAvatar = localStorage.getItem('selectedAvatarId');
      if (savedAvatar) {
        setSelectedAvatar(savedAvatar);
      }
    }
  }, []);

  const loadAvatars = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/heygen/avatars');
      if (!response.ok) {
        throw new Error('Failed to fetch avatars');
      }

      const data = await response.json();
      console.log('Avatars data:', data);

      // すべてのアバターを表示（インタラクティブを優先）
      const allAvatars = data.allAvatars || [];
      const sortedAvatars = allAvatars.sort((a: Avatar, b: Avatar) => {
        // インタラクティブアバターを上に
        if (a.is_interactive && !b.is_interactive) return -1;
        if (!a.is_interactive && b.is_interactive) return 1;
        return 0;
      });

      setAvatars(sortedAvatars);
    } catch (err) {
      console.error('Error loading avatars:', err);
      setError('アバターの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const saveSelection = () => {
    if (selectedAvatar && typeof window !== 'undefined') {
      localStorage.setItem('selectedAvatarId', selectedAvatar);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const getAvatarName = (avatar: Avatar) => {
    return avatar.name || avatar.avatar_name || 'Unnamed Avatar';
  };

  const filteredAvatars = avatars.filter(avatar => {
    const name = getAvatarName(avatar).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  // Rumiまたは推奨アバター
  const recommendedAvatars = avatars.filter(avatar => {
    const name = getAvatarName(avatar).toLowerCase();
    return name.includes('rumi') || name.includes('kristin') || name.includes('anna');
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/settings"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                設定に戻る
              </Link>
              <h1 className="ml-4 text-xl font-semibold text-gray-900">アバター選択</h1>
            </div>
            <button
              onClick={loadAvatars}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 検索バー */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <input
            type="text"
            placeholder="アバターを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* ローディング */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">アバターを読み込み中...</span>
          </div>
        )}

        {/* 推奨アバター */}
        {!loading && recommendedAvatars.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">推奨アバター</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recommendedAvatars.map((avatar) => (
                <div
                  key={avatar.avatar_id}
                  onClick={() => setSelectedAvatar(avatar.avatar_id)}
                  className={`relative bg-white rounded-lg shadow cursor-pointer transition-all hover:shadow-lg ${
                    selectedAvatar === avatar.avatar_id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : ''
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <User className="w-12 h-12 text-gray-400" />
                      {selectedAvatar === avatar.avatar_id && (
                        <Check className="w-6 h-6 text-blue-500" />
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      {getAvatarName(avatar)}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2 font-mono break-all">
                      {avatar.avatar_id.substring(0, 16)}...
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {avatar.is_interactive && (
                        <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Interactive
                        </span>
                      )}
                      <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                        推奨
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 全アバター */}
        {!loading && avatars.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              すべてのアバター ({filteredAvatars.length}件)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAvatars.map((avatar) => (
                <div
                  key={avatar.avatar_id}
                  onClick={() => setSelectedAvatar(avatar.avatar_id)}
                  className={`relative bg-white rounded-lg shadow cursor-pointer transition-all hover:shadow-lg ${
                    selectedAvatar === avatar.avatar_id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : ''
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <User className="w-12 h-12 text-gray-400" />
                      {selectedAvatar === avatar.avatar_id && (
                        <Check className="w-6 h-6 text-blue-500" />
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      {getAvatarName(avatar)}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2 font-mono break-all">
                      {avatar.avatar_id.substring(0, 16)}...
                    </p>
                    {avatar.is_interactive && (
                      <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        Interactive
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 選択されたアバターの詳細 */}
        {selectedAvatar && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-20">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">選択中のアバターID:</p>
                <p className="font-mono text-sm">{selectedAvatar}</p>
              </div>
              <button
                onClick={saveSelection}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4 inline mr-2" />
                保存
              </button>
            </div>
          </div>
        )}

        {/* 保存完了メッセージ */}
        {saved && (
          <div className="fixed bottom-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
            アバターを保存しました
          </div>
        )}
      </main>
    </div>
  );
}