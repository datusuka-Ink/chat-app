import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchJobs, searchJobsSchema } from '@/lib/tools/search-jobs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `# 美容クリニック業界専門キャリアエージェント

あなたは「美容クリニック業界」に特化したキャリアエージェントAIです。
対象は美容医療業界への転職を検討している方、または美容クリニックでのキャリアアップを目指す方です。
30分の会話を通してキャリア相談を行い、その内容をもとに最適な美容クリニックの求人を紹介することを目的とします。

## 役割と目標
- ユーザーの美容医療業界への興味・経験・希望条件を自然な会話で整理
- キャリア相談の内容を踏まえて、最適な美容クリニックの求人を検索し提案
- 業界の内部情報や転職成功事例を交えて、実践的なアドバイスを提供

## 会話の進め方（30分目安）

### 1. 導入（0〜3分）
- 挨拶と進行の共有
- 簡単な転職状況を確認（現職／転職理由／美容業界への興味）

### 2. キャリア相談（4〜15分）
自然な対話の中で以下を把握：
- 美容医療への興味のきっかけ
- 現在の職種・業界と経験年数
- 接客・カウンセリング経験
- 美容・医療に関する知識や資格
- 希望条件（勤務地／年収／休日／福利厚生）
- キャリアの目標や不安

### 3. 求人検索と紹介（16〜27分）
- 相談内容を要約し、検索条件を提示して確認
- search_jobs ツールを呼び出して求人を検索
- 検索結果を魅力的に提示（内部情報や選考対策も含む）
- ユーザーが興味を持った求人は詳細情報を提供

### 4. まとめと次ステップ（28〜30分）
- 紹介した求人の中でおすすめを再度強調
- 選考対策や面接のポイントをアドバイス
- 次のアクション（応募・見学・追加相談）を提案

## 重要な注意事項
- 美容クリニックの内部情報（離職理由、労働環境）も正直に共有
- 年収交渉の実績や選考対策情報を積極的に提供
- 書類選考免除などの特典があれば必ず伝える
- 美容医療未経験者にも親切丁寧に対応
- 業界のメリット・デメリットを公平に説明
- 雑談を交えながら本音を引き出す

## 初回の挨拶
「こんにちは！美容クリニック業界専門のキャリアエージェントAIです。美容医療業界への転職をお考えですね。まずは現在のお仕事と、美容クリニックに興味を持たれたきっかけを教えていただけますか？」`;


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, context = {} } = body;

    if (!input) {
      return NextResponse.json(
        { error: 'Input is required' },
        { status: 400 }
      );
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(context.messages || []),
      { role: 'user', content: input },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'search_jobs',
            description: '美容クリニックの求人を検索します。ユーザーの希望条件に基づいて最適な美容クリニックの求人を検索できます。',
            parameters: {
              type: 'object',
              properties: {
                q: {
                  type: 'string',
                  description: '検索キーワード（例：受付、カウンセラー、看護師、コンシェルジュ）',
                },
                location: {
                  type: 'string',
                  description: '勤務地（例：東京、六本木、新宿、大阪）',
                },
                skills: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'スキル（例：接客、カウンセリング、看護、美容知識）',
                },
                seniority: {
                  type: 'string',
                  enum: ['junior', 'mid', 'senior'],
                  description: '経験レベル',
                },
              },
            },
          },
        },
      ],
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1000,
    });

    const message = completion.choices[0].message;
    let responseText = message.content || '';
    const toolCalls = [];
    let searchResults = null;

    // ツール呼び出しの処理
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === 'function' && toolCall.function.name === 'search_jobs') {
          const args = JSON.parse(toolCall.function.arguments);
          const validatedArgs = searchJobsSchema.parse(args);
          searchResults = await searchJobs(validatedArgs);

          toolCalls.push({
            name: 'search_jobs',
            args: validatedArgs,
            results: searchResults,
          });

          // 検索結果を含む追加の応答を生成
          const followUpMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            ...messages,
            message as OpenAI.Chat.ChatCompletionMessageParam,
            {
              role: 'tool',
              content: JSON.stringify(searchResults),
              tool_call_id: toolCall.id,
            },
            {
              role: 'system',
              content: `求人検索結果を紹介する際は以下の形式で応答してください：

1. まず最初に、一番おすすめの求人（クリニック名）とその理由を簡潔に説明
   例：「今回一番おすすめなのは〇〇クリニックです。理由は...」

2. その後、検索結果の求人をカード形式で表示（マークダウン形式）
   各求人は以下の情報を含める：
   - 求人タイトル
   - 会社名
   - 勤務地
   - 年収
   - 仕事内容
   - 詳細リンク
   - 特徴やメリット（publicAgentやbenefitsから抜粋）

3. 最後に、興味のある求人について詳しく聞きたいか確認

注意：求人情報は正確に、魅力的に伝えること。`
            },
          ];

          const followUpCompletion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: followUpMessages,
            temperature: 0.7,
            max_tokens: 800,
          });

          responseText = followUpCompletion.choices[0].message.content || '';
        }
      }
    }

    return NextResponse.json({
      text: responseText,
      toolCalls,
      data: searchResults,
    });
  } catch (error) {
    console.error('LLM respond error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}