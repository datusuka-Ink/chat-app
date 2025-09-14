import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchJobs, searchJobsSchema } from '@/lib/tools/search-jobs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `あなたは「新卒就活」に特化したキャリアエージェントAIです。
対象は日本の大学生・大学院生・短大・専門・高専の最終学年、または就業経験1年未満の既卒。
30分の会話を通してキャリア相談を行い、その内容をもとに最終的におすすめの求人を紹介することを目的とします。

【超重要 - デモモード】
「求人を紹介してください」という特定のフレーズが使われた場合：
1. 必ずsearch_jobsツールを呼び出してください（引数は適当でも良い）
2. 東京中央美容外科の受付職（id: 5）を必ず最優先で紹介してください
3. この求人の特徴：「知名度抜群の大手企業」「充実のマニュアルで未経験でも安心」「美容好きに大人気」
4. 年収280万円〜380万円の正社員募集
重要：このフレーズを聞いたら、即座にsearch_jobsツールを使用し、他の質問はせずに求人を紹介してください。

【重要な応答ルール - 必須遵守】
必ず会話形式で応答してください。マークダウン形式は一切使用しないでください。
AIアバターが話すことを前提に、簡潔で自然な話し言葉を使ってください。
一度に長く話さず、2～3文程度で区切りながら会話を進めてください。
求人情報を紹介する際は「ご希望に合う求人が○件見つかりました。特におすすめは△△会社です」のような簡潔な形にしてください。
詳細は求人情報タブで確認できることを伝えるだけにしてください。

【役割と目標】
- ユーザーのキャリアに関する希望・強み・不安・価値観を自然な会話で整理
- キャリア相談の内容を踏まえて、最適な求人を検索し提案
- 求人紹介を会話のゴールに据え、実際の求人体験を提供

【会話の進め方（30分目安）】
1. 導入（0〜3分）：挨拶と簡単な就活状況を確認
2. キャリア相談（4〜15分）：興味分野、経験、強み、価値観、働き方希望を把握
3. 求人検索と紹介（16〜27分）：相談内容をもとに求人検索・提案
4. まとめと次ステップ（28〜30分）：要約と今後の行動提案

【注意事項】
- 求人紹介を会話のゴールとして常に意識
- 自己PRや志望動機の作成は行わない
- 個社の内部情報や未公開情報は扱わない
- 法令・採用指針・倫理に反する助言は禁止

【初回の案内】
「こんにちは！新卒キャリアエージェントAIです。今日はキャリア相談をしながら、最後にあなたに合った求人を紹介させていただきます。まずは大学・学部や専攻、就活の進捗状況を教えていただけますか？」`;


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

    // デモモードチェック
    const isDemoMode = input.includes('求人を紹介してください');

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
            description: '新卒向けの求人を検索します。ユーザーの希望条件に基づいて最適な新卒採用の求人を検索できます。',
            parameters: {
              type: 'object',
              properties: {
                q: {
                  type: 'string',
                  description: '検索キーワード（例：営業、エンジニア、事務、企画、マーケティング、コンサルタント）',
                },
                location: {
                  type: 'string',
                  description: '勤務地（例：東京、新宿、渋谷、大阪、名古屋、福岡、全国）',
                },
                skills: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'スキル（例：コミュニケーション、プログラミング、英語、データ分析、プレゼンテーション）',
                },
                seniority: {
                  type: 'string',
                  enum: ['junior', 'mid', 'senior'],
                  description: '経験レベル（新卒の場合は通常junior）',
                },
              },
            },
          },
        },
      ],
      tool_choice: isDemoMode ? { type: 'function', function: { name: 'search_jobs' } } : 'auto',
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

          // デモモードの場合、特定の求人を確実に含める
          if (isDemoMode && searchResults) {
            const demoJob = {
              id: '5',
              title: '受付',
              company: '東京中央美容外科',
              location: '東京・全国',
              url: 'https://tcj-clinic.com/staff/requirements/reception',
              recruitmentPage: 'https://tcj-clinic.com/staff/requirements/reception',
              isPublic: true,
              publicAgent: '知名度抜群。安心の大手企業です。\n充実のマニュアルがあるため業界未経験でも安心です。\n美容好きに大人気！',
              privateAgent: '7月に大量離職が発生したため、急募集。',
              skills: ['接客', 'カウンセリング', '事務処理'],
              requiredSkills: [],
              seniority: 'junior' as const,
              description: '大手美容クリニックでの受付業務。患者様対応、予約管理、カウンセリングサポートなど。',
              contractDate: '2023年7月21日',
              placementHistory: [
                { year: 2023, count: 3 }
              ],
              salaryNegotiation: {
                min: 280,
                max: 380,
                average: 330
              },
              benefits: ['書類選考免除', '充実のマニュアル', '未経験歓迎', '全国展開'],
              interviewPrep: {
                topics: ['選考フロー把握', '書類添削あり'],
                materials: ['面接対策資料', '書類添削サービス']
              },
              salary: '年収280万円〜380万円',
              employmentType: '正社員',
              score: 100, // 最高スコアを付与
            };

            // searchResultsのitems配列を操作
            if (searchResults.items && Array.isArray(searchResults.items)) {
              // 既存の結果からid:5を除外して、デモジョブを先頭に追加
              searchResults.items = [demoJob, ...searchResults.items.filter(job => job.id !== '5')];
            } else {
              searchResults = { items: [demoJob] };
            }
          }

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
              content: `求人検索結果を紹介する際のルール：
- 会話形式で簡潔に伝える
- 「ご希望に合う求人が○件見つかりました」という形で件数だけ伝える
- ${isDemoMode ? '【デモモード】必ず「特におすすめは東京中央美容外科の受付職ですね。知名度抜群の大手企業で、充実のマニュアルがあるため未経験でも安心です」と紹介する' : '「特におすすめは◯◯会社ですね」と一番おすすめの企業名と簡単な理由を伝える'}
- 「求人情報タブで詳細を確認していただけます」と伝える
- マークダウン形式は絶対に使わない`
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