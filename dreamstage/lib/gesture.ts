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

    console.log("GestureService: Initializing MediaPipe Vision...");

    try {
      // 1. Initialize MediaPipe
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      console.log("GestureService: WASM loaded, creating HandLandmarker...");
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });

      console.log("GestureService: HandLandmarker created. Requesting camera access...");

      // 2. Start Camera
      this.stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
      });
      this.video.srcObject = this.stream;

      // Wait for the video to be ready before playing to avoid DOM exceptions
      await new Promise<void>((resolve) => {
        if (!this.video) return;
        this.video.onloadedmetadata = () => {
          resolve();
        };
      });

      await this.video.play();
      console.log("GestureService: Camera ready.");

    } catch (e) {
      console.error("GestureService Error:", e);
      throw e;
    }
  }

  startTracking() {
    if (!this.handLandmarker || !this.video) {
        console.warn("GestureService: Cannot start tracking. Not initialized.");
        return;
    }
    this.isTracking = true;
    console.log("GestureService: Tracking started.");
    this.predictWebcam();
  }

  stopTracking() {
    this.isTracking = false;
    cancelAnimationFrame(this.animationFrameId);
    if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
    }
    console.log("GestureService: Tracking stopped.");
  }

  private predictWebcam = () => {
    if (!this.isTracking || !this.video || !this.handLandmarker) return;

    if (this.video.currentTime !== this.lastVideoTime && this.video.readyState >= 2) {
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

    if (this.isTracking) {
        this.animationFrameId = requestAnimationFrame(this.predictWebcam);
    }
  }
}
