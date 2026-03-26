import { HandTracker } from './cv/HandTracker.js';
import { WebGLScene } from './webgl/Scene.js';
import { ParticleSystem } from './webgl/Particles.js';
import './style.css';

const videoElement = document.getElementById('webcam');
const statusElement = document.getElementById('status');
const gestureOutputElement = document.getElementById('gesture-output');

const tracker = new HandTracker(videoElement);
const scene = new WebGLScene();
const particles = new ParticleSystem(scene.scene);

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

        // Start rendering the 3D scene!
        scene.start();
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