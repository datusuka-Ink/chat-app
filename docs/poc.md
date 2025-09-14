# HeyGen × OpenAI API（Next.js）音声アバターデモ 要件定義書

最終更新: 2025-09-13

---

## 1. プロジェクト概要

**目的**: HeyGen の Streaming Avatar（LiveKit）と **OpenAI API（Responses API 推奨）** を用いて、**音声で会話できるアバター**＋**tool（求人検索）呼び出し**を備えた **最小デモ** を Next.js で構築する。

> 本デモでは **音声入力（マイク）を必須要件** とし、テキスト入力は補助とする。

**ゴール**:

* ブラウザ上で **低遅延の話すアバター映像**を表示し、ユーザー入力（音声/テキスト）に対して応答を返す。
* 会話の文脈で **求人検索 tool を自動実行**し、結果を会話に織り込む。
* セッションの開始/終了、簡易ログ取得ができる。

**スコープ（In）**:

* Next.js アプリ（App Router）
* HeyGen Streaming API（LiveKit 統合）との接続
* **音声入力（マイク→STT）必須** / テキスト入力は補助
* **OpenAI API 直使用**での会話制御（音声中心、tool 呼び出し対応）
* tool（求人検索ダミー）実装
* 最小 UI（動画パネル、チャット欄、\*\*PTT（押して話す）\*\*ボタン、ミュート/終了、字幕ON/OFF）

**スコープ（Out）**:

* 本番運用の認証/課金、履歴保存、管理画面、推薦ロジック高度化
* 実在求人API連携の本実装（本書ではモック/ダミー）

---

## 2. 想定ユーザー / シナリオ

* **ユーザー**: 転職/就活者がブラウザでアバターに話しかける。
* **デモの流れ（必須実装）**:

  1. 画面の\*\*「キャリア相談を開始する」\*\*ボタンを押す。
  2. AIアバター（HeyGen）が接続・表示され、**音声でキャリア相談がスタート**（挨拶→希望の職種/勤務地/スキル年数など簡単なヒアリング）。ユーザーはPTTで応答。
  3. 収集した条件で **tool（search\_jobs）** を実行し、\*\*その人に合った求人（デモデータ）\*\*を上位3件紹介。アバターが音声で要約、画面にカード表示。

---

## 3. 成果物一覧

* 画面

  * **/ (Conversation)**: 動画パネル、会話ログ、入力欄、開始/終了、ミュート、字幕ON/OFF
  * **/settings**: 音声デバイス選択、発話速度/声質、字幕の有無（任意）
* サーバーAPI(Route Handlers)

  * **POST /api/heygen/session**: セッション作成（streaming.new → join情報返却）
  * **POST /api/heygen/start**: セッション開始（streaming.start）
  * **POST /api/heygen/task**: アバターに発話指示（`task_type:"repeat"`）
  * **POST /api/llm/respond**: OpenAI API による応答生成＋tool実行 → 応答テキスト返却

---

## 4. 機能要件

### 4.1 会話制御（OpenAI API 直使用）

* 入力: **音声（必須）** / テキスト（補助）
* 出力: 応答テキスト（字幕表示用）
* **tool 呼び出し**: OpenAI **Responses API** の `tools`（function calling）で `search_jobs` を宣言し、必要時に自動実行
* **構造化**: 必要に応じて **Structured Outputs**（JSON Schema / strict）を利用し、tool引数や結果の整合性を高める
* システムプロンプトでロール/口調を指定（丁寧、日本語）

### 4.2 tool（求人検索・ダミー）

* `name: search_jobs`
* **入力**: `{ q?: string; location?: string; skills?: string[]; seniority?: "junior"|"mid"|"senior" }`
* **処理**: デモデータをスコアリング（例: 位置一致 + スキル一致の重み付け）。閾値以上を上位3件返す
* **出力**: `{ items: Array<{id:string,title:string,company:string,location:string,url:string,score:number}> }`
* 会話へは上位3件を簡潔に要約、リンクは UI にカード表示

### 4.3 音声入出力 / アバター

* **出力**: HeyGen Streaming（LiveKit）で動画＋音声を受信・再生
* **入力（必須）**: マイク録音→STT（短文PTT方式）。音声権限取得/ミュート/レベルメータ/無音自動停止（VAD）を実装
* **字幕**: AI応答テキストを動画下に表示（ON/OFF）

### 4.4 音声入力 詳細（必須）

* **方式**: PTT（Push-To-Talk）で 1発話ごとに録音→サーバーへ送信→STT→テキスト化
* **STT実装**: v1はサーバーで STT API を呼ぶ（OpenAI もしくは代替）。ブラウザWeb Speechはフォールバック扱い
* **VAD**: 簡易無音検出（音量RMSしきい値 + 最低発話長）で自動停止。ユーザーの手動停止も可
* **割り込み**: 応答音声の途中でもユーザーPTTで割り込み可（HeyGen発話の一時停止/中断はv2で検討）
* **デバイス**: 入力デバイス選択（将来）、エコーキャンセリング/ノイズ抑制ON

### 4.5 会話フロー（デモ要件）

1. **開始**: 「キャリア相談を開始する」を押下 → `/api/heygen/session` → WebRTC接続 → `/api/heygen/start` → **アバターが挨拶**（固定テンプレ or AI生成）
2. **ヒアリング**: アバター「ご希望の職種・勤務地・ご経験年数を教えてください」→ ユーザーPTT → `/api/stt/recognize` → テキスト化
3. **理解/要約**: AI SDKがユーザー発話を要約し、足りない項目は追加ヒアリング（最大2ターン）
4. **求人検索(tool)**: `search_jobs` を実行（入力: 収集条件）。デモデータからスコア上位3件を取得
5. **提示**: `/api/heygen/task` で音声要約、UIにカード表示（タイトル/会社/場所/リンク）。「他にも見ますか？」と追い質問

### 4.6 セッション/状態

* セッション開始・終了（サーバーで管理）
* アイドル時は keep-alive 呼び出し（任意）
* 同時接続上限の簡易保護（環境変数で上限）

### 4.7 ログ/メトリクス（簡易）

* request/response のメタ（時刻、userId=匿名UUID、latency）
* 例外時のエラーログ（サーバー側）

---

## 5. 非機能要件

* **UX**: 1クリックで開始、音声/字幕の切替は1タップ、応答まで 2〜4 秒目標
* **性能**: 初回接続 < 3s、以後の発話タスク開始 < 1.5s 目安
* **セキュリティ**: APIキーはサーバーで保持。CORS 制御、Rate Limit（IP/UUID）
* **互換**: Chrome/Edge 最新、Safari 16+ を目標（モバイルは縦向き推奨）

---

## 6. アーキテクチャ

```
[Browser] --(POST /api/heygen/session)--> [Server] --HeyGen API--> [HeyGen]
    |<----------- LiveKit join info ------------|
    |-- WebRTC connect --> [LiveKit/HeyGen media] (video/audio)
    |
    |-- (PTT録音 音声blob) --> POST /api/stt/recognize --> [Server] -- STT --> [Provider]
    |-- (POST /api/llm/respond: text from STT) --> [Server] -- OpenAI API (Responses) --(tools)--> search_jobs
    |                                                                  |<----- results -----|
    |<---------------------------- response text ----------------------|
    |-- POST /api/heygen/task (mode:"repeat") -----------------------> [HeyGen]
```

### 6.1 データフロー（標準）

1. 「キャリア相談を開始する」→ セッション作成 → WebRTC接続 → アバターの挨拶
2. ユーザーPTT → STT → **OpenAI API**で要約/不足質問
3. `search_jobs` 実行 → 上位3件
4. アバターが音声で要約し、カードを表示

---

## 7. API 仕様（最小） API 仕様（最小）

### 7.1 POST `/api/heygen/session`

**req**: `{ avatarId?: string }`
**res**: `{ sessionId: string; livekitUrl: string; accessToken: string }`

### 7.2 POST `/api/heygen/start`

**req**: `{ sessionId: string }`
**res**: `{ ok: true }`

### 7.3 POST `/api/heygen/task`

**req**: `{ sessionId: string; text: string; mode?: "repeat"|"talk" }`
**res**: `{ taskId: string }`

### 7.4 POST `/api/llm/respond`

**req**: `{ userId?: string; input: string; context?: any }`
**res**: `{ text: string; toolCalls?: any[]; data?: any }`

### 7.5 POST `/api/stt/recognize`

**用途**: PTTで録音した短文音声をサーバーに送信し、STTでテキスト化
**req**: `multipart/form-data` で `audio` (audio/webm または audio/wav), 任意で `lang`（例: "ja-JP"）
**res**: `{ text: string; confidence?: number }`

### 7.6 WS `/api/stt/stream`（将来）

## **用途**: 連続音声のリアルタイムSTT（部分結果/確定結果）。v2以降で追加予定

## 8. データモデル（デモ）

```ts
export type JobItem = {
  id: string;
  title: string;
  company: string;
  location: string;        // 例: 東京/大阪/リモート
  url: string;
  skills?: string[];       // 例: ['React','Next.js','Node']
  seniority?: 'junior'|'mid'|'senior';
};

export type UserSessionProfile = {
  desiredRole?: string;    // 例: Webエンジニア
  location?: string;       // 例: 東京/フルリモート
  skills?: string[];       // 例: TypeScript, React
  years?: number;          // 経験年数
};
```

* スタブ: `jobs.json` に10件ほど（title, company, location, url, skills, seniority）
* マッチング: location一致を加点、skills一致は部分一致で加点、seniorityはyearsで推定

---

## 9. 画面仕様（簡易）

* **Conversation**

  * ヘッダー: タイトル／設定ボタン
  * メイン: 左=動画（16:9, 720p想定）、右=会話ログ
  * フッター: **「キャリア相談を開始する」ボタン（Primary）**、その後は **PTTボタン（押して話す）**、テキスト入力（補助）、送信、開始/終了、ミュート、字幕ON/OFF、**入力レベルメータ**
  * 求人結果: 会話内カード（タイトル/会社/場所/リンク）
* **Settings**

  * 入出力デバイス選択、音量、エコーキャンセル/ノイズ抑制、声質/速度（将来）

---

## 10. 環境変数

* `HEYGEN_API_KEY`
* `OPENAI_API_KEY`
* `STT_PROVIDER` (例: `openai` / `azure` / `google`)
* `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION`（Azure利用時）
* `APP_BASE_URL`（コールバックやWSで使用する場合）
* `DEMO_MAX_CONCURRENCY`（同時接続上限）

---

## 11. ライブラリ / 技術

* Next.js (App Router), TypeScript
* LiveKit client SDK（HeyGen から返却される join 情報で接続）
* **OpenAI API 公式 Node クライアント（`openai`）** または `fetch` 直叩き
* **MediaRecorder / getUserMedia（PTT録音）**
* Zod（tool 入力バリデーション）
* Tailwind or MUI（UI 任意）

---

## 12. セキュリティ / 運用

* API キーは**サーバーのみ**に格納
* Rate Limit（IP/UUID）: 例) 1分あたり 10 リクエスト
* マイク権限の明示的な同意ダイアログと**権限エラー時の案内**
* 例外/失敗時: ユーザーへ簡潔なトースト表示、再試行ボタン
* ログ: Cloud ログに requestId でトレース

---

## 13. テスト観点（抜粋）

* **接続**: セッション作成 → WebRTC 接続 → 映像/音声表示
* **会話**: **PTTで録音→STT→AI応答→HeyGen 発話**（字幕一致）
* **tool**: 「求人」キーワードで search\_jobs が呼ばれる（ログ検証）
* **音声**: マイク権限拒否時のリカバリ、ノイズ下でのVAD、音量メータ動作
* **異常系**: セッション切断・タイムアウト・API鍵不備
* **UX**: 応答までの体感時間、字幕の読みやすさ

---

## 14. リスク / 制約

* 企業ネットワークで WebRTC が遮断される可能性（フォールバック検討）
* API レート/課金上限（短時間に多数の発話で上限到達）
* 音声入力（将来導入時）のブラウザ互換性

---

## 15. ロードマップ（段階導入）

* **v1**: **音声入力（PTT）**＋短文STT（/api/stt/recognize）→ AI 応答 → HeyGen 発話、求人 tool（ダミー）
* **v2**: **連続音声のストリーミングSTT（WS）**、割り込み（barge-in）制御、字幕スタイル改善、keep-alive
* **v3**: 外部求人API接続、セッション履歴保存、A/B（声質/話速）

---

## 16. 受け入れ基準（DoD）

* 画面から\*\*「キャリア相談を開始する」\*\*を押すと WebRTC 接続が成立し、**アバターが音声で挨拶**する
* ユーザーがPTTで回答→ **STT結果がチャット欄に表示** される
* 収集条件に基づき **search\_jobs tool** が実行され、**上位3件の求人（デモデータ）がカード表示** され、アバターが音声で要約する
* セッション終了で接続がクリーンに閉じる（ログに記録）

---

## 17. 参考ドキュメント（設計・実装の参照元）

### HeyGen / LiveKit

* Streaming API 概要: [https://docs.heygen.com/docs/streaming-api](https://docs.heygen.com/docs/streaming-api)
* Streaming API v2（LiveKit 連携）: [https://docs.heygen.com/docs/streaming-api-integration-with-livekit-v2](https://docs.heygen.com/docs/streaming-api-integration-with-livekit-v2)
* チュートリアル/ガイド（更新情報）: [https://docs.heygen.com/changelog/new-streaming-apisdk-guides](https://docs.heygen.com/changelog/new-streaming-apisdk-guides)
* LiveKit JS クイックスタート: [https://docs.livekit.io/home/quickstarts/javascript/](https://docs.livekit.io/home/quickstarts/javascript/)
* LiveKit 接続/Room: [https://docs.livekit.io/home/client/connect/](https://docs.livekit.io/home/client/connect/)
* LiveKit 認証とトークン: [https://docs.livekit.io/home/get-started/authentication/](https://docs.livekit.io/home/get-started/authentication/)

### OpenAI（API 直使用）

* Voice Agents ガイド（音声アーキテクチャ）: [https://platform.openai.com/docs/guides/voice-agents](https://platform.openai.com/docs/guides/voice-agents)
* Responses API リファレンス: [https://platform.openai.com/docs/api-reference/responses](https://platform.openai.com/docs/api-reference/responses)
* Function Calling / Tools ガイド（Responses での利用）: [https://platform.openai.com/docs/guides/function-calling?api-mode=responses](https://platform.openai.com/docs/guides/function-calling?api-mode=responses)
* Structured Outputs ガイド: [https://platform.openai.com/docs/guides/structured-outputs](https://platform.openai.com/docs/guides/structured-outputs)
* Realtime / 音声ストリーミング（必要に応じて）: [https://platform.openai.com/docs/guides/realtime](https://platform.openai.com/docs/guides/realtime)
* Speech-to-Text（Whisper など）ガイド: [https://platform.openai.com/docs/guides/speech-to-text](https://platform.openai.com/docs/guides/speech-to-text)
* Audio Transcriptions API: [https://platform.openai.com/docs/api-reference/audio/createTranscription](https://platform.openai.com/docs/api-reference/audio/createTranscription)
* 公式 Node クライアント（openai）: [https://github.com/openai/openai-node](https://github.com/openai/openai-node)

### Next.js / ブラウザAPI

* Next.js App Router: [https://nextjs.org/docs/app](https://nextjs.org/docs/app)
* Route Handlers: [https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware](https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware)
* Route ファイル仕様: [https://nextjs.org/docs/app/api-reference/file-conventions/route](https://nextjs.org/docs/app/api-reference/file-conventions/route)
* MediaRecorder API（PTT録音）: [https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
