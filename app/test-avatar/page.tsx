'use client';

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TestAvatarPage() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');

  // 推奨アバターリスト
  const recommendedAvatars = [
    { id: 'Kristin_public_3_20240108', name: 'Kristin (推奨)' },
    { id: 'Anna_public_3_20240108', name: 'Anna' },
    { id: 'Susan_public_2_20240328', name: 'Susan' },
    { id: 'Wayne_20240711', name: 'Wayne' },
    { id: 'josh_lite3_20230714', name: 'Josh' },
  ];

  const testAvatar = async (avatarId: string) => {
    setLoading(true);
    setTestResult('テスト中...');
    setSelectedAvatar(avatarId);

    try {
      // セッション作成をテスト
      const response = await fetch('/api/heygen/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult(`✅ 成功！このアバターは使用可能です。\nセッションID: ${data.sessionId}`);

        // 成功したら自動的に保存
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedAvatarId', avatarId);
        }
      } else {
        setTestResult(`❌ エラー: ${data.error || 'アバターが使用できません'}`);
      }
    } catch (error) {
      setTestResult(`❌ エラー: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const saveAndUse = (avatarId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedAvatarId', avatarId);
      alert(`${avatarId} を保存しました。メイン画面で使用できます。`);
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
            <h1 className="ml-4 text-xl font-semibold text-gray-900">アバターテスト</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">推奨アバターをテスト</h2>

          <div className="space-y-3 mb-6">
            {recommendedAvatars.map(avatar => (
              <div key={avatar.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div>
                  <p className="font-medium">{avatar.name}</p>
                  <p className="text-sm text-gray-500 font-mono">{avatar.id}</p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => testAvatar(avatar.id)}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    テスト
                  </button>
                  <button
                    onClick={() => saveAndUse(avatar.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    使用する
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* カスタムアバターID入力 */}
          <div className="border-t pt-6">
            <h3 className="font-medium mb-3">カスタムアバターIDをテスト</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="アバターIDを入力..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="custom-avatar-id"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('custom-avatar-id') as HTMLInputElement;
                  if (input?.value) {
                    testAvatar(input.value);
                  }
                }}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                テスト
              </button>
            </div>
          </div>

          {/* テスト結果 */}
          {testResult && (
            <div className={`mt-6 p-4 rounded-lg ${
              testResult.includes('✅') ? 'bg-green-50 text-green-800' :
              testResult.includes('❌') ? 'bg-red-50 text-red-800' :
              'bg-gray-50 text-gray-800'
            }`}>
              <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
            </div>
          )}

          {/* 選択中のアバター */}
          {selectedAvatar && testResult.includes('✅') && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800">
                現在選択中: <strong>{selectedAvatar}</strong>
              </p>
              <p className="text-sm text-blue-600 mt-1">
                このアバターはメイン画面で使用されます。
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}