import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  VideoPresets,
  createLocalTracks,
} from 'livekit-client';

export class LiveKitClient {
  private room: Room | null = null;
  private isConnected = false;
  private videoElement: HTMLVideoElement | null = null;
  private audioElement: HTMLAudioElement | null = null;

  constructor() {
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    });
  }

  setVideoElement(element: HTMLVideoElement): void {
    this.videoElement = element;
    console.log('Video element set for LiveKit');
  }

  async connect(url: string, token: string): Promise<void> {
    if (!this.room) {
      throw new Error('Room not initialized');
    }

    try {
      // イベントリスナー設定（接続前に設定）
      this.setupEventListeners();

      console.log('Connecting to LiveKit with URL:', url);
      console.log('Token:', token.substring(0, 50) + '...');

      // LiveKitルームに接続
      await this.room.connect(url, token);
      this.isConnected = true;

      console.log('Connected to LiveKit room');
    } catch (error) {
      console.error('Failed to connect to LiveKit:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.room) return;

    // トラック受信時
    this.room.on(
      RoomEvent.TrackSubscribed,
      (
        track: RemoteTrack,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _publication: RemoteTrackPublication,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _participant: RemoteParticipant
      ) => {
        console.log('Track subscribed:', track.kind);

        // ビデオトラックの場合、video要素にアタッチ
        if (track.kind === Track.Kind.Video) {
          console.log('Received video track, attaching to element');
          // 少し待ってからビデオエレメントを探す
          setTimeout(() => {
            const videoElement = document.getElementById('avatar-video') as HTMLVideoElement;
            if (videoElement) {
              track.attach(videoElement);
              console.log('Video track attached to element by ID');
            } else if (this.videoElement) {
              track.attach(this.videoElement);
              console.log('Video track attached to stored element');
            } else {
              console.error('No video element found to attach track');
            }
          }, 100);
        }

        // オーディオトラックの場合、audio要素にアタッチ
        if (track.kind === Track.Kind.Audio) {
          console.log('Received audio track');
          if (!this.audioElement) {
            this.audioElement = document.createElement('audio');
            this.audioElement.autoplay = true;
            this.audioElement.style.display = 'none';
            document.body.appendChild(this.audioElement);
          }
          track.attach(this.audioElement);
          console.log('Audio track attached');
        }
      }
    );

    // トラック解除時
    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (
        track: RemoteTrack,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _publication: RemoteTrackPublication,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _participant: RemoteParticipant
      ) => {
        console.log('Track unsubscribed:', track.kind);
        track.detach();
      }
    );

    // 接続状態変更
    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log('Connection state changed:', state);
    });

    // エラー処理
    this.room.on(RoomEvent.RoomMetadataChanged, (metadata) => {
      console.log('Room metadata changed:', metadata);
    });

    // 切断時
    this.room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from room');
      this.isConnected = false;
    });
  }

  async disconnect(): Promise<void> {
    if (this.room && this.isConnected) {
      try {
        await this.room.disconnect();
      } catch (error) {
        console.error('Error disconnecting from room:', error);
      }
      this.isConnected = false;
    }

    // オーディオエレメントのクリーンアップ
    if (this.audioElement) {
      this.audioElement.remove();
      this.audioElement = null;
    }
  }

  getRoom(): Room | null {
    return this.room;
  }

  getConnectionState(): boolean {
    return this.isConnected;
  }

  // ローカルトラック（マイク・カメラ）を有効化
  async enableLocalTracks(): Promise<void> {
    if (!this.room || !this.isConnected) {
      throw new Error('Not connected to room');
    }

    try {
      const tracks = await createLocalTracks({
        audio: true,
        video: false, // 音声のみ有効化
      });

      await Promise.all(
        tracks.map((track) => this.room!.localParticipant.publishTrack(track))
      );
    } catch (error) {
      console.error('Failed to enable local tracks:', error);
      throw error;
    }
  }

  // ミュート切り替え
  async toggleMute(muted: boolean): Promise<void> {
    if (!this.room || !this.isConnected) {
      throw new Error('Not connected to room');
    }

    await this.room.localParticipant.setMicrophoneEnabled(!muted);
  }
}