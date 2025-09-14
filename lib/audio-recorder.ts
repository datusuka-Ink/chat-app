export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationId: number | null = null;

  // コールバック
  public onAudioLevel?: (level: number) => void;
  public onRecordingStop?: (blob: Blob) => void;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext(): void {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  async startRecording(): Promise<boolean> {
    try {
      // マイクへのアクセス許可を要求
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // MediaRecorder初期化
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType,
      });

      this.audioChunks = [];

      // データ受信時の処理
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // 録音停止時の処理
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm',
        });
        this.onRecordingStop?.(audioBlob);
      };

      // 音声レベル監視開始
      this.startAudioLevelMonitoring();

      // 録音開始
      this.mediaRecorder.start(100); // 100ms毎にデータを取得
      this.isRecording = true;

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  async stopRecording(): Promise<Blob | null> {
    if (!this.mediaRecorder || !this.isRecording) {
      return null;
    }

    return new Promise((resolve) => {
      // 録音停止時にBlobを返す
      this.mediaRecorder!.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm',
        });
        resolve(audioBlob);
      };

      // 録音停止
      this.mediaRecorder.stop();
      this.isRecording = false;

      // 音声レベル監視停止
      this.stopAudioLevelMonitoring();

      // ストリームクリーンアップ
      if (this.audioStream) {
        this.audioStream.getTracks().forEach((track) => track.stop());
        this.audioStream = null;
      }
    });
  }

  private startAudioLevelMonitoring(): void {
    if (!this.audioContext || !this.audioStream) return;

    try {
      // オーディオソースとアナライザーを作成
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // 音声レベルを定期的に計算
      const updateLevel = () => {
        if (!this.analyser || !this.isRecording) return;

        this.analyser.getByteFrequencyData(dataArray);

        // RMS（二乗平均平方根）を計算
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        const level = Math.min(100, (rms / 128) * 100);

        this.onAudioLevel?.(level);

        this.animationId = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error('Failed to start audio level monitoring:', error);
    }
  }

  private stopAudioLevelMonitoring(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  cleanup(): void {
    this.stopAudioLevelMonitoring();

    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.mediaRecorder = null;
    this.isRecording = false;
    this.audioChunks = [];
  }

  getRecordingState(): boolean {
    return this.isRecording;
  }

  // VAD（Voice Activity Detection）簡易実装
  async detectSilence(
    durationMs: number = 2000,
    threshold: number = 10
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let silenceStart: number | null = null;
      const checkInterval = 100;

      const checkSilence = setInterval(() => {
        if (!this.isRecording) {
          clearInterval(checkSilence);
          resolve(false);
          return;
        }

        // 現在の音声レベルをチェック
        let currentLevel = 0;
        this.onAudioLevel = (level) => {
          currentLevel = level;
        };

        if (currentLevel < threshold) {
          if (!silenceStart) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart > durationMs) {
            clearInterval(checkSilence);
            resolve(true);
          }
        } else {
          silenceStart = null;
        }
      }, checkInterval);
    });
  }
}