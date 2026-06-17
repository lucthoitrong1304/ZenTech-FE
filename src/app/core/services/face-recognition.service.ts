import { Injectable, signal } from '@angular/core';
import * as faceapi from 'face-api.js';

export type FaceValidationStatus = 
  | 'INITIALIZING'
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'TOO_CLOSE'
  | 'TOO_FAR'
  | 'NOT_CENTERED'
  | 'VALID';

export type HeadPose = 
  | 'STRAIGHT' 
  | 'LEFT' 
  | 'RIGHT' 
  | 'UP_LEFT' 
  | 'UP_RIGHT' 
  | 'DOWN_LEFT' 
  | 'DOWN_RIGHT'
  | 'UP'
  | 'DOWN'
  | 'UNKNOWN';

export interface FaceDetectionResult {
  status: FaceValidationStatus;
  descriptor?: Float32Array;
  liveness?: {
    earLeft: number;
    earRight: number;
    turnRatio: number;
    tiltRatio: number;
    detectedPose: HeadPose;
    isBlinking: boolean;
  };
}

export interface FaceBaseline {
  turnRatio: number;
  tiltRatio: number;
}

@Injectable({
  providedIn: 'root'
})
export class FaceRecognitionService {
  private modelsLoaded = false;
  readonly isReady = signal(false);

  constructor() {}

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;
    const modelPath = '/assets/models';
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
      ]);
      this.modelsLoaded = true;
      this.isReady.set(true);
    } catch (error) {
      console.error('Error loading face-api models', error);
      throw error;
    }
  }

  async startCamera(videoElement: HTMLVideoElement): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      videoElement.srcObject = stream;
      return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play();
          resolve();
        };
      });
    } catch (error) {
      console.error('Error accessing camera', error);
      throw error;
    }
  }

  stopCamera(videoElement: HTMLVideoElement): void {
    const stream = videoElement.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      videoElement.srcObject = null;
    }
  }

  private calculateEAR(eyePoints: faceapi.Point[]): number {
    if (eyePoints.length < 6) return 0.0;
    const p1 = eyePoints[0];
    const p2 = eyePoints[1];
    const p3 = eyePoints[2];
    const p4 = eyePoints[3];
    const p5 = eyePoints[4];
    const p6 = eyePoints[5];

    const distVertical1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
    const distVertical2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
    const distHorizontal = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));

    return (distVertical1 + distVertical2) / (2.0 * distHorizontal);
  }

  async detectFace(videoElement: HTMLVideoElement, baseline?: FaceBaseline): Promise<FaceDetectionResult> {
    if (!this.modelsLoaded) {
      return { status: 'INITIALIZING' };
    }

    const detections = await faceapi.detectAllFaces(
      videoElement, 
      new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.35 })
    )
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length === 0) {
      return { status: 'NO_FACE' };
    }

    if (detections.length > 1) {
      return { status: 'MULTIPLE_FACES' };
    }

    const detection = detections[0];
    const box = detection.detection.box;
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;

    const faceArea = box.width * box.height;
    const videoArea = videoWidth * videoHeight;
    const ratio = faceArea / videoArea;

    if (ratio < 0.03) {
      return { status: 'TOO_FAR' };
    }
    if (ratio > 0.7) {
      return { status: 'TOO_CLOSE' };
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const diffX = Math.abs(centerX - videoWidth / 2);
    const diffY = Math.abs(centerY - videoHeight / 2);

    if (diffX > videoWidth * 0.3 || diffY > videoHeight * 0.3) {
      return { status: 'NOT_CENTERED' };
    }

    // Liveness & Pose Calculation
    const positions = detection.landmarks.positions;
    const jawLeft = positions[0];
    const jawRight = positions[16];
    const chin = positions[8];
    const noseTip = positions[30];
    const noseBridge = positions[27];

    const distLeft = noseTip.x - jawLeft.x;
    const distRight = jawRight.x - noseTip.x;
    const turnRatio = distLeft / distRight;

    const distTop = noseTip.y - noseBridge.y;
    const distBottom = chin.y - noseTip.y;
    const tiltRatio = distTop / distBottom;

    // Use baseline if provided to normalize ratios
    const normTurn = baseline ? (turnRatio / baseline.turnRatio) : turnRatio;
    const normTilt = baseline ? (tiltRatio / baseline.tiltRatio) : (tiltRatio / 0.60);

    let detectedPose: HeadPose = 'STRAIGHT';

    // Xoay sang PHẢI (vật lý) -> Mũi lệch sang TRÁI của ảnh -> distLeft giảm -> turnRatio giảm
    if (normTurn < 0.88) {
      if (normTilt < 0.88) {
        detectedPose = 'UP_RIGHT';
      } else if (normTilt > 1.12) {
        detectedPose = 'DOWN_RIGHT';
      } else {
        detectedPose = 'RIGHT';
      }
    } 
    // Xoay sang TRÁI (vật lý) -> Mũi lệch sang PHẢI của ảnh -> distLeft tăng -> turnRatio tăng
    else if (normTurn > 1.12) {
      if (normTilt < 0.88) {
        detectedPose = 'UP_LEFT';
      } else if (normTilt > 1.12) {
        detectedPose = 'DOWN_LEFT';
      } else {
        detectedPose = 'LEFT';
      }
    } 
    // Nhìn THẲNG theo trục ngang
    else {
      if (normTilt < 0.88) {
        detectedPose = 'UP';
      } else if (normTilt > 1.12) {
        detectedPose = 'DOWN';
      } else {
        detectedPose = 'STRAIGHT';
      }
    }

    const leftEyePoints = detection.landmarks.getLeftEye();
    const rightEyePoints = detection.landmarks.getRightEye();
    const earLeft = this.calculateEAR(leftEyePoints);
    const earRight = this.calculateEAR(rightEyePoints);
    const isBlinking = earLeft < 0.22 && earRight < 0.22;

    return { 
      status: 'VALID', 
      descriptor: detection.descriptor,
      liveness: {
        earLeft,
        earRight,
        turnRatio,
        tiltRatio,
        detectedPose,
        isBlinking
      }
    };
  }
}
