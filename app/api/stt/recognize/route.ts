import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { toFile } from 'openai/uploads';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const lang = formData.get('lang') as string || 'ja';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // 音声ファイルを一時ファイルとして保存
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ファイル拡張子を決定（webmファイルとして保存）
    const extension = 'webm';
    tempFilePath = join(tmpdir(), `audio-${Date.now()}.${extension}`);

    await writeFile(tempFilePath, buffer);

    // OpenAI Whisper APIで音声認識
    const fileContent = await readFile(tempFilePath);
    const file = await toFile(fileContent, `audio.${extension}`, {
      type: 'audio/webm',
    });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: lang === 'ja-JP' ? 'ja' : lang,
      response_format: 'json',
    });

    // 一時ファイルを削除
    if (tempFilePath) {
      await unlink(tempFilePath).catch(console.error);
    }

    return NextResponse.json({
      text: transcription.text,
      confidence: 0.95, // Whisperは信頼度を返さないため固定値
    });

  } catch (error) {
    // エラー時も一時ファイルを削除
    if (tempFilePath) {
      await unlink(tempFilePath).catch(console.error);
    }

    console.error('STT recognition error:', error);
    return NextResponse.json(
      { error: 'Failed to recognize speech' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';