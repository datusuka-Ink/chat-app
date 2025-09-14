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
  private attachedVideoTrack: RemoteTrack | null = null;
  private pendingVideoTrack: RemoteTrack | null = null;

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
    console.log('LiveKitClient: Setting video element', {
      elementId: element.id,
      hasExistingElement: !!this.videoElement,
      hasPendingTrack: !!this.pendingVideoTrack
    });

    // 要素を保存
    this.videoElement = element;

    // 保留中のトラックがあればアタッチ
    if (this.pendingVideoTrack) {
      console.log('LiveKitClient: Attaching pending track to video element');
      this.pendingVideoTrack.attach(element);
      this.pendingVideoTrack = null;
    }
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

      // 接続を準備（HeyGenドキュメント推奨）
      await this.room.prepareConnection(url, token);
      console.log('Connection prepared');

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

    // 参加者が追加された時
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('Participant connected:', participant.identity, participant.sid);
    });

    // トラックが公開された時
    this.room.on(RoomEvent.TrackPublished, (publication, participant) => {
      console.log('Track published:', publication.trackName, 'by', participant.identity);
    });

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
        console.log('Track subscribed:', track.kind, 'sid:', track.sid);

        // ビデオトラックの場合、video要素にアタッチ
        if (track.kind === Track.Kind.Video) {
          console.log('LiveKitClient: Received video track', { trackSid: track.sid });

          // 既にトラックがアタッチされている場合はスキップ
          if (this.attachedVideoTrack) {
            console.log('LiveKitClient: Video track already attached, ignoring new track');
            return;
          }

          this.attachedVideoTrack = track;

          // ビデオ要素が既に設定されている場合は即座にアタッチ
          if (this.videoElement) {
            console.log('LiveKitClient: Attaching video track to existing element');
            track.attach(this.videoElement);
          } else {
            // ビデオ要素がない場合は保留（setVideoElementで後からアタッチされる）
            console.log('LiveKitClient: Video element not ready, saving track');
            this.pendingVideoTrack = track;
          }
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
        if (track === this.attachedVideoTrack) {
          this.attachedVideoTrack = null;
        }
        if (track === this.pendingVideoTrack) {
          this.pendingVideoTrack = null;
        }
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

    // 参加者が切断された時
    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log('Participant disconnected:', participant.identity, participant.sid);
    });

    // 切断時
    this.room.on(RoomEvent.Disconnected, (reason) => {
      console.log('Disconnected from room, reason:', reason);
      this.isConnected = false;
    });

    // 再接続中
    this.room.on(RoomEvent.Reconnecting, () => {
      console.log('Reconnecting to room...');
    });

    // 再接続完了
    this.room.on(RoomEvent.Reconnected, () => {
      console.log('Reconnected to room');
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

    // クリーンアップ
    this.attachedVideoTrack = null;
    this.pendingVideoTrack = null;
    this.videoElement = null;

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

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
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