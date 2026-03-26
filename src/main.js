import { HandTracker } from './cv/HandTracker.js';

const videoElement = document.getElementById('webcam');
const statusElement = document.getElementById('status');
const gestureOutputElement = document.getElementById('gesture-output');

const tracker = new HandTracker(videoElement);

async function bootApp() {
    statusElement.innerText = "Loading AI Model from local files...";
    const modelLoaded = await tracker.init();
    
    if (!modelLoaded) {
        statusElement.innerText = "Error: Could not load AI model.";
        return;
    }

    statusElement.innerText = "Model loaded. Please allow webcam access...";
    try {
        await tracker.startWebcam();
        statusElement.innerText = "Tracking Active - Show your hand!";
        statusElement.style.color = "#00ff88";
    } catch (err) {
        statusElement.innerText = "Error: Webcam access denied.";
        statusElement.style.color = "#ff4444";
        return;
    }

    tracker.onGestureDetected = (gestureName, landmarks) => {
        gestureOutputElement.innerText = gestureName;
        
        if (gestureName === "None") {
            gestureOutputElement.style.opacity = 0.3;
        } else {
            gestureOutputElement.style.opacity = 1.0;
        }
    };
}

bootApp();