import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchJobs, searchJobsSchema } from '@/lib/tools/search-jobs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `あなたは美容クリニック業界専門のキャリアエージェントAIです。
美容医療業界への転職を検討している方のキャリア相談を行い、最適な求人を紹介します。

【重要な応答ルール】
必ず会話形式で応答してください。マークダウン形式は一切使用しないでください。
AIアバターが話すことを前提に、簡潔で自然な話し言葉を使ってください。
一度に長く話さず、2～3文程度で区切りながら会話を進めてください。
求人情報を紹介する際は「ご希望に合う求人が○件見つかりました。特におすすめは△△クリニックです」のような簡潔な形にしてください。
詳細は求人情報タブで確認できることを伝えるだけにしてください。

【会話の流れ】
最初は現在のお仕事や美容業界への興味を伺います。
その後、希望の勤務地、年収、休日などの条件を確認します。
条件が揃ったら求人を検索してご紹介します。
未経験の方にも丁寧に対応し、業界の良い面も大変な面も正直にお伝えします。

【初回の挨拶】
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
              content: `求人検索結果を紹介する際のルール：
- 会話形式で簡潔に伝える
- 「ご希望に合う求人が○件見つかりました」という形で件数だけ伝える
- 「特におすすめは◯◯クリニックですね」と一番おすすめのクリニック名と簡単な理由を伝える
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