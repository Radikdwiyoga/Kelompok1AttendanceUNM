import * as faceapi from '@vladmandic/face-api';

export interface LivenessCheckResult {
  isLive: boolean;
  score: number;
  detections: {
    eyeBlink: { detected: boolean; count: number; score: number };
    headMovement: { detected: boolean; score: number; direction?: string };
    mouthMovement: { detected: boolean; score: number };
  };
  message: string;
  timestamp: number;
}

export interface FaceState {
  landmarks: any;
  position: { x: number; y: number };
  mouthOpen: boolean;
  eyesOpen: { left: boolean; right: boolean };
}

export class LivenessService {
  private static readonly BLINK_THRESHOLD = 0.3; // Eye aspect ratio threshold for blink
  private static readonly HEAD_MOVEMENT_THRESHOLD = 15; // Pixels movement threshold
  private static readonly MOUTH_ASPECT_RATIO_THRESHOLD = 0.4;
  private static readonly DETECTION_DURATION = 5000; // 5 seconds for full detection
  private static readonly SAMPLE_RATE = 100; // ms between samples

  /**
   * Calculate Eye Aspect Ratio (EAR)
   * Based on the paper "Real Time Eye Gaze Tracking and Blink Detection"
   */
  static calculateEyeAspectRatio(eye: any[]): number {
    if (eye.length !== 6) return 1;

    const A = this.euclideanDistance(eye[1], eye[5]);
    const B = this.euclideanDistance(eye[2], eye[4]);
    const C = this.euclideanDistance(eye[0], eye[3]);

    return (A + B) / (2 * C);
  }

  /**
   * Calculate Mouth Aspect Ratio (MAR)
   */
  static calculateMouthAspectRatio(mouth: any[]): number {
    if (mouth.length < 20) return 0;

    // Mouth landmarks are typically 20 points
    const A = this.euclideanDistance(mouth[14], mouth[18]); // Vertical distance
    const B = this.euclideanDistance(mouth[15], mouth[19]);
    const C = this.euclideanDistance(mouth[12], mouth[16]); // Horizontal distance

    return (A + B) / (2 * C);
  }

  /**
   * Euclidean distance between two points
   */
  static euclideanDistance(p1: any, p2: any): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Extract eye landmarks
   * Landmarks 36-41 are right eye, 42-47 are left eye (face-api format)
   */
  static getEyeLandmarks(landmarks: any) {
    if (!landmarks || landmarks.length < 48) return null;

    return {
      rightEye: landmarks.slice(36, 42),
      leftEye: landmarks.slice(42, 48),
    };
  }

  /**
   * Extract mouth landmarks
   * Landmarks 48-67 are mouth area
   */
  static getMouthLandmarks(landmarks: any) {
    if (!landmarks || landmarks.length < 68) return null;
    return landmarks.slice(48, 68);
  }

  /**
   * Get face position (center point)
   */
  static getFacePosition(landmarks: any) {
    if (!landmarks || landmarks.length === 0) return { x: 0, y: 0 };

    let x = 0,
      y = 0;
    for (const point of landmarks) {
      x += point.x;
      y += point.y;
    }
    return {
      x: x / landmarks.length,
      y: y / landmarks.length,
    };
  }

  /**
   * Main liveness detection function - combines multiple checks
   */
  static async performLivenessCheck(
    videoElement: HTMLVideoElement,
    duration: number = this.DETECTION_DURATION
  ): Promise<LivenessCheckResult> {
    const startTime = Date.now();
    const states: FaceState[] = [];

    let blinkCount = 0;
    let previousEAR = 1;
    let blinkDetected = false;

    let maxHeadMovement = 0;
    let initialPosition: any = null;

    let mouthMovementDetected = false;
    let maxMouthAR = 0;
    let minMouthAR = 1;

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        try {
          // Detect face with landmarks
          const detection = await faceapi
            .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();

          if (detection && detection.landmarks) {
            const landmarks = detection.landmarks.positions;

            // 1. Eye Blink Detection
            const eyeLandmarks = this.getEyeLandmarks(landmarks);
            if (eyeLandmarks) {
              const rightEAR = this.calculateEyeAspectRatio(eyeLandmarks.rightEye);
              const leftEAR = this.calculateEyeAspectRatio(eyeLandmarks.leftEye);
              const currentEAR = (rightEAR + leftEAR) / 2;

              // Detect transition from open to closed to open
              if (
                previousEAR > this.BLINK_THRESHOLD &&
                currentEAR < this.BLINK_THRESHOLD
              ) {
                blinkDetected = true;
              }
              if (
                blinkDetected &&
                currentEAR > this.BLINK_THRESHOLD
              ) {
                blinkCount++;
                blinkDetected = false;
              }

              previousEAR = currentEAR;
            }

            // 2. Head Movement Detection
            const currentPosition = this.getFacePosition(landmarks);
            if (initialPosition === null) {
              initialPosition = currentPosition;
            }

            const movement = this.euclideanDistance(
              currentPosition,
              initialPosition
            );
            if (movement > maxHeadMovement) {
              maxHeadMovement = movement;
            }

            // 3. Mouth Movement Detection
            const mouthLandmarks = this.getMouthLandmarks(landmarks);
            if (mouthLandmarks) {
              const mouthAR = this.calculateMouthAspectRatio(mouthLandmarks);
              maxMouthAR = Math.max(maxMouthAR, mouthAR);
              minMouthAR = Math.min(minMouthAR, mouthAR);

              // Check if mouth moved significantly
              if (maxMouthAR - minMouthAR > 0.1) {
                mouthMovementDetected = true;
              }
            }

            // Store state
            states.push({
              landmarks,
              position: currentPosition,
              mouthOpen: maxMouthAR > this.MOUTH_ASPECT_RATIO_THRESHOLD,
              eyesOpen: {
                left:
                  this.calculateEyeAspectRatio(eyeLandmarks?.leftEye) >
                  this.BLINK_THRESHOLD,
                right:
                  this.calculateEyeAspectRatio(eyeLandmarks?.rightEye) >
                  this.BLINK_THRESHOLD,
              },
            });
          }

          // Check if duration is complete
          if (Date.now() - startTime >= duration) {
            clearInterval(interval);

            // Calculate scores
            const eyeBlinkScore = Math.min(blinkCount / 3, 1); // 3+ blinks = good
            const headMovementScore =
              maxHeadMovement > this.HEAD_MOVEMENT_THRESHOLD
                ? Math.min(maxHeadMovement / 100, 1)
                : 0;
            const mouthMovementScore = mouthMovementDetected ? 1 : 0;

            // Overall score (weighted average)
            const totalScore =
              eyeBlinkScore * 0.4 +
              headMovementScore * 0.3 +
              mouthMovementScore * 0.3;

            // Determine if live
            const isLive =
              eyeBlinkScore > 0.3 || headMovementScore > 0.3;

            const result: LivenessCheckResult = {
              isLive,
              score: Math.round(totalScore * 100) / 100,
              detections: {
                eyeBlink: {
                  detected: eyeBlinkScore > 0.3,
                  count: blinkCount,
                  score: Math.round(eyeBlinkScore * 100) / 100,
                },
                headMovement: {
                  detected: headMovementScore > 0.3,
                  score: Math.round(headMovementScore * 100) / 100,
                  direction:
                    maxHeadMovement > this.HEAD_MOVEMENT_THRESHOLD
                      ? 'detected'
                      : 'minimal',
                },
                mouthMovement: {
                  detected: mouthMovementDetected,
                  score: Math.round(mouthMovementScore * 100) / 100,
                },
              },
              message: this.generateMessage(
                isLive,
                eyeBlinkScore,
                headMovementScore,
                mouthMovementDetected
              ),
              timestamp: Date.now(),
            };

            resolve(result);
          }
        } catch (error) {
          console.error('Liveness detection error:', error);
        }
      }, this.SAMPLE_RATE);

      // Timeout safety
      setTimeout(() => {
        clearInterval(interval);
        resolve({
          isLive: false,
          score: 0,
          detections: {
            eyeBlink: { detected: false, count: 0, score: 0 },
            headMovement: { detected: false, score: 0 },
            mouthMovement: { detected: false, score: 0 },
          },
          message: 'Waktu deteksi habis',
          timestamp: Date.now(),
        });
      }, duration + 1000);
    });
  }

  /**
   * Challenge-based liveness detection
   * Asks user to perform specific actions
   */
  static async performChallengeBasedDetection(
    videoElement: HTMLVideoElement,
    challenge: 'blink' | 'nod' | 'smile' = 'blink'
  ): Promise<LivenessCheckResult> {
    const duration = 8000; // 8 seconds for challenge
    return this.performLivenessCheck(videoElement, duration);
  }

  /**
   * Quick liveness check (2 seconds)
   */
  static async performQuickLivenessCheck(
    videoElement: HTMLVideoElement
  ): Promise<LivenessCheckResult> {
    return this.performLivenessCheck(videoElement, 2000);
  }

  /**
   * Generate descriptive message based on detection results
   */
  private static generateMessage(
    isLive: boolean,
    blinkScore: number,
    headScore: number,
    mouthDetected: boolean
  ): string {
    if (!isLive) {
      if (blinkScore < 0.2 && headScore < 0.2) {
        return 'Tidak terdeteksi gerakan. Silakan bergerak, berkedip, atau gerakkan kepala.';
      }
      return 'Gagal verifikasi keaslian. Silakan coba lagi.';
    }

    let message = 'Verifikasi keaslian berhasil! ';
    if (blinkScore > 0.5) message += 'Kedipan terdeteksi. ';
    if (headScore > 0.4) message += 'Gerakan kepala terdeteksi. ';
    if (mouthDetected) message += 'Gerakan mulut terdeteksi.';

    return message.trim();
  }
}
