import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

export class HandTracker {
    constructor(videoElement) {
        this.video = videoElement;
        this.recognizer = null;
        this.lastVideoTime = -1;
        this.onGestureDetected = null; 
    }

    async init() {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.19/wasm"
            );

            this.recognizer = await GestureRecognizer.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "/models/gesture_recognizer.task", 
                    delegate: "GPU" 
                },
                runningMode: "VIDEO",
                numHands: 2 // UPGRADED: Now tracks up to 2 hands!
            });

            return true;
        } catch (error) {
            console.error("Failed to initialize MediaPipe:", error);
            return false;
        }
    }

    async startWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.video.srcObject = stream;
            
            return new Promise((resolve) => {
                this.video.addEventListener("loadeddata", () => {
                    this.predictLoop(); 
                    resolve();
                });
            });
        } catch (error) {
            console.error("Webcam access denied:", error);
            throw error;
        }
    }

    predictLoop() {
        if (this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;
            
            const results = this.recognizer.recognizeForVideo(this.video, performance.now());
            const detectedHands = [];

            // UPGRADED: Extract data for ALL detected hands into an array
            if (results.gestures && results.gestures.length > 0) {
                for (let i = 0; i < results.gestures.length; i++) {
                    detectedHands.push({
                        gestureName: results.gestures[i][0].categoryName,
                        landmarks: results.landmarks[i],
                        handedness: results.handednesses[i][0].categoryName
                    });
                }
            }

            if (this.onGestureDetected) {
                this.onGestureDetected(detectedHands);
            }
        }
        
        requestAnimationFrame(() => this.predictLoop());
    }
}