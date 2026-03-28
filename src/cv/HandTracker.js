import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";

export class HandTracker {
    constructor(videoElement) {
        this.video = videoElement;
        this.recognizer = null;
        this.lastVideoTime = -1;
        this.currentGesture = "None";
        this.handedness = "None"; // NEW: Track Left/Right hand
        this.landmarks = [];
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
                numHands: 1 
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

            if (results.gestures.length > 0) {
                this.currentGesture = results.gestures[0][0].categoryName;
                this.landmarks = results.landmarks[0]; 
                
                // NEW: Extract which hand the user is holding up
                if (results.handednesses && results.handednesses.length > 0) {
                    this.handedness = results.handednesses[0][0].categoryName; 
                }
            } else {
                this.currentGesture = "None";
                this.handedness = "None";
                this.landmarks = [];
            }

            if (this.onGestureDetected) {
                // NEW: Pass handedness to our application loop
                this.onGestureDetected(this.currentGesture, this.landmarks, this.handedness);
            }
        }
        
        requestAnimationFrame(() => this.predictLoop());
    }
}