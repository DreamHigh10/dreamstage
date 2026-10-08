import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { syncBus } from './sync';

export class GestureService {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isTracking = false;
  private lastVideoTime = -1;
  private animationFrameId = 0;

  async initialize(videoElement: HTMLVideoElement) {
    this.video = videoElement;

    // 1. Initialize MediaPipe
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 1
    });

    // 2. Start Camera
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
      });
      this.video.srcObject = this.stream;
      await this.video.play();
    } catch (e) {
      console.error("Camera access denied or failed", e);
      throw e;
    }
  }

  startTracking() {
    if (!this.handLandmarker || !this.video) return;
    this.isTracking = true;
    this.predictWebcam();
  }

  stopTracking() {
    this.isTracking = false;
    cancelAnimationFrame(this.animationFrameId);
    if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
    }
  }

  private predictWebcam = () => {
    if (!this.isTracking || !this.video || !this.handLandmarker) return;

    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;

      const results = this.handLandmarker.detectForVideo(this.video, performance.now());

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];

        // Index finger tip (landmark 8)
        const indexTip = landmarks[8];
        // Thumb tip (landmark 4)
        const thumbTip = landmarks[4];

        // Calculate distance between thumb and index for pinch detection
        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const isPinching = distance < 0.05; // Threshold for pinch

        // Invert X because the webcam is mirrored horizontally
        const xPos = 1 - indexTip.x;
        const yPos = indexTip.y;

        // Emit via syncbus
        syncBus.emit({
            type: 'CURSOR_MOVE',
            payload: { x: xPos, y: yPos, isPinching }
        });
      }
    }

    this.animationFrameId = requestAnimationFrame(this.predictWebcam);
  }
}
