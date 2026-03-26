import { ParticleSystem } from './webgl/Particles.js';
import { WebGLScene } from './webgl/Scene.js';
import { HandTracker } from './cv/HandTracker.js';
import './style.css';

async function bootApp() {
    const statusElement = document.getElementById('status');
    const gestureOutputElement = document.getElementById('gesture-output');
    const videoElement = document.getElementById('webcam');

    // 1. Initialize WebGL Scene
    const webgl = new WebGLScene();
    const particles = new ParticleSystem(webgl.scene);

    webgl.onTick = (elapsedTime) => {
        particles.update(elapsedTime);
    };
    webgl.start();

    // 2. Initialize Computer Vision
    const tracker = new HandTracker(videoElement);
    
    statusElement.innerText = "Loading AI Model...";
    await tracker.init();
    
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

    // Keep track of state outside the loop
    let isMorphed = false;
    let lastFistTime = 0;

    tracker.onGestureDetected = (gestureName, landmarks) => {
        gestureOutputElement.innerText = gestureName;
        
        if (gestureName === "None") {
            gestureOutputElement.style.opacity = 0.3;
            particles.resetIdle();
            isMorphed = false;
        } else {
            gestureOutputElement.style.opacity = 1.0;

            if (gestureName === "Closed_Fist") {
                lastFistTime = Date.now();
                particles.morphToFist();
                isMorphed = false;
            }
            else if (gestureName === "Open_Palm" && (Date.now() - lastFistTime < 600)) {
                particles.triggerScatter();
                lastFistTime = 0; // Reset combo timer
                isMorphed = false; 
            }
            else if (gestureName === "Thumb_Up") {
                if (!isMorphed) {
                    particles.morphToHand(landmarks);
                    isMorphed = true;
                }
            }
            else {
                // BUG FIX: Catch-all for Pointing_Up, ILoveYou, or Open_Palm (no combo).
                // This guarantees the nebula never gets "stuck"
                particles.resetIdle();
                isMorphed = false;
            }
        }
    };
}

bootApp();