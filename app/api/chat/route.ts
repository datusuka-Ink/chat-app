import { z } from 'zod';
import { openai, type OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import {
  streamText,
  stepCountIs,
  type UIMessage,
  createUIMessageStream,
  convertToModelMessages,
  JsonToSseTransformStream,
} from 'ai';

export const maxDuration = 300;

// 全てのUIMessage-like parts (text, reasoning, tool-*, step-start, etc.)を受け取る
const genericPartSchema = z.object({ type: z.string() }).passthrough();
const clientMessageSchema = z.object({
  id: z.string().optional(),
  role: z.union([z.literal('user'), z.literal('assistant'), z.literal('system')]),
  parts: z.array(genericPartSchema),
});

const postBodySchema = z.object({
  // クライアントから任意の文字列のidを受け取る 必要に応じてDBのuuidにマッピングする
  id: z.string().optional(),
  model: z.string(),
  webSearch: z.boolean(),
  messages: z.array(clientMessageSchema).min(1),
  trigger: z.string(),
});

const isTextPart = (p: unknown): p is { type: 'text'; text: string } =>
  typeof p === 'object' &&
  p !== null &&
  (p as { type?: unknown }).type === 'text' &&
  typeof (p as { text?: unknown }).text === 'string';

export async function POST(req: Request) {
  const json = await req.json();
  console.log(json);
  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response('Bad Request', { status: 400 });
  }

  const { messages, model } = parsed.data;

  const uiStream = createUIMessageStream({
    execute: async ({ writer }) => {
      // 最初に作成/確定されたセッションIDをクライアントに通知（transient: messageには保持しない）
      writer.write({ type: 'data-session', data: { id: 'testId' }, transient: true });

      // textのみにする。
      const uiMessages: UIMessage[] = messages.map((m) => {
        const textParts = m.parts
          .filter(isTextPart)
          .map((p) => ({ type: 'text' as const, text: p.text }));
        return { id: m.id ?? crypto.randomUUID(), role: m.role, parts: textParts };
      });

      const stream = streamText({
        model: openai(model),
        system:
          'Your are a helpful assistant.',
        messages: convertToModelMessages(uiMessages),
        stopWhen: stepCountIs(10),
        providerOptions: {
          openai: {
            reasoningSummary: 'auto',
            reasoningEffort: 'low',
          } satisfies OpenAIResponsesProviderOptions,
        },
      });

      writer.merge(stream.toUIMessageStream({ sendReasoning: true }));
    },
  });

  return new Response(uiStream.pipeThrough(new JsonToSseTransformStream()));
}