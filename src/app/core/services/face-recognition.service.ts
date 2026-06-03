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
      // Play is usually handled by the element or called after assignment
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

  async detectFace(videoElement: HTMLVideoElement): Promise<{ status: FaceValidationStatus, descriptor?: Float32Array }> {
    if (!this.modelsLoaded) {
      return { status: 'INITIALIZING' };
    }

    const detections = await faceapi.detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
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

    // Check face size (Too close or too far)
    // Box area ratio to video area
    const faceArea = box.width * box.height;
    const videoArea = videoWidth * videoHeight;
    const ratio = faceArea / videoArea;

    if (ratio < 0.05) {
      return { status: 'TOO_FAR' };
    }
    if (ratio > 0.4) {
      return { status: 'TOO_CLOSE' };
    }

    // Check if centered
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const diffX = Math.abs(centerX - videoWidth / 2);
    const diffY = Math.abs(centerY - videoHeight / 2);

    // Allow some margin (e.g., 20% of width/height)
    if (diffX > videoWidth * 0.2 || diffY > videoHeight * 0.2) {
      return { status: 'NOT_CENTERED' };
    }

    return { 
      status: 'VALID', 
      descriptor: detection.descriptor 
    };
  }
}
