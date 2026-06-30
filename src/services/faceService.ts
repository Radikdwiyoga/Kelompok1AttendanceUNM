import * as faceapi from '@vladmandic/face-api';
import { LivenessService, LivenessCheckResult } from './livenessService';

export class FaceService {
  private static isModelsLoaded = false;

  static async loadModels() {
    if (this.isModelsLoaded) return;

    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    this.isModelsLoaded = true;
  }

  static async getFaceDescriptor(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ) {
    await this.loadModels();
    const detection = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detection ? detection.descriptor : null;
  }

  static async matchFace(descriptor: Float32Array, labeledDescriptors: any[]) {
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    const bestMatch = faceMatcher.findBestMatch(descriptor);
    return bestMatch;
  }

  /**
   * Get face detection with landmarks
   * Useful for liveness detection and facial expression analysis
   */
  static async getFaceDetectionWithLandmarks(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ) {
    await this.loadModels();
    const detection = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    return detection;
  }

  /**
   * Perform liveness detection check
   */
  static async performLivenessCheck(
    videoElement: HTMLVideoElement,
    duration: number = 5000
  ): Promise<LivenessCheckResult> {
    await this.loadModels();
    return LivenessService.performLivenessCheck(videoElement, duration);
  }

  /**
   * Perform quick liveness check (2 seconds)
   */
  static async performQuickLivenessCheck(
    videoElement: HTMLVideoElement
  ): Promise<LivenessCheckResult> {
    await this.loadModels();
    return LivenessService.performQuickLivenessCheck(videoElement);
  }

  /**
   * Perform challenge-based liveness detection
   */
  static async performChallengeBasedDetection(
    videoElement: HTMLVideoElement,
    challenge: 'blink' | 'nod' | 'smile' = 'blink'
  ): Promise<LivenessCheckResult> {
    await this.loadModels();
    return LivenessService.performChallengeBasedDetection(
      videoElement,
      challenge
    );
  }

  /**
   * Validate face with liveness check before recognition
   */
  static async validateFaceWithLiveness(
    videoElement: HTMLVideoElement,
    descriptor: Float32Array,
    labeledDescriptors: any[]
  ): Promise<{
    isValid: boolean;
    isLive: boolean;
    livenessScore: number;
    matchResult?: any;
    error?: string;
  }> {
    try {
      // First, check liveness
      const livenessResult = await this.performQuickLivenessCheck(videoElement);

      if (!livenessResult.isLive) {
        return {
          isValid: false,
          isLive: false,
          livenessScore: livenessResult.score,
          error: 'Gagal verifikasi keaslian wajah',
        };
      }

      // Then perform face recognition
      const matchResult = this.matchFace(descriptor, labeledDescriptors);

      return {
        isValid: true,
        isLive: true,
        livenessScore: livenessResult.score,
        matchResult,
      };
    } catch (error) {
      return {
        isValid: false,
        isLive: false,
        livenessScore: 0,
        error: 'Terjadi kesalahan saat validasi wajah',
      };
    }
  }

  /**
   * Get continuous face analysis stream
   * Useful for real-time liveness feedback
   */
  static async getStreamAnalysis(
    videoElement: HTMLVideoElement,
    callback: (analysis: any) => void,
    interval: number = 100
  ): Promise<() => void> {
    await this.loadModels();

    const intervalId = setInterval(async () => {
      try {
        const detection = await this.getFaceDetectionWithLandmarks(videoElement);

        if (detection && detection.landmarks) {
          const landmarks = detection.landmarks.positions;

          // Calculate eye and mouth metrics
          const eyeLandmarks = LivenessService.getEyeLandmarks(landmarks);
          const mouthLandmarks = LivenessService.getMouthLandmarks(landmarks);

          let analysis: any = {
            detected: true,
            timestamp: Date.now(),
          };

          if (eyeLandmarks) {
            const rightEAR = LivenessService.calculateEyeAspectRatio(
              eyeLandmarks.rightEye
            );
            const leftEAR = LivenessService.calculateEyeAspectRatio(
              eyeLandmarks.leftEye
            );

            analysis.eyesOpen =
              rightEAR > 0.3 && leftEAR > 0.3;
            analysis.eyeAspectRatio = (rightEAR + leftEAR) / 2;
          }

          if (mouthLandmarks) {
            const mouthAR =
              LivenessService.calculateMouthAspectRatio(mouthLandmarks);
            analysis.mouthOpen = mouthAR > 0.4;
            analysis.mouthAspectRatio = mouthAR;
          }

          analysis.facePosition = LivenessService.getFacePosition(landmarks);

          callback(analysis);
        } else {
          callback({ detected: false, timestamp: Date.now() });
        }
      } catch (error) {
        console.error('Stream analysis error:', error);
      }
    }, interval);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}
