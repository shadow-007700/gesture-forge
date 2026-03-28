import { ParticleSystem } from './webgl/Particles.js';
import { WebGLScene } from './webgl/Scene.js';
import { HandTracker } from './cv/HandTracker.js';
import { GestureComboManager } from './cv/GestureComboManager.js';
import './style.css'; 

async function bootApp() {
    const statusElement = document.getElementById('status');
    const gestureOutputElement = document.getElementById('gesture-output');
    const videoElement = document.getElementById('webcam');

    const webgl = new WebGLScene();
    const particles = new ParticleSystem(webgl.scene);

    if (webgl.vfxController) {
        webgl.vfxController.setParticles(particles);
    }

    webgl.onTick = (elapsedTime) => {
        particles.update(elapsedTime);
    };
    webgl.start();

    const comboManager = new GestureComboManager(particles);
    const tracker = new HandTracker(videoElement);
    
    statusElement.innerText = "Loading AI Model...";
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

    // NEW: Receive the 'handedness' variable
    tracker.onGestureDetected = (gestureName, landmarks, handedness) => {
        gestureOutputElement.innerText = gestureName;
        gestureOutputElement.style.opacity = gestureName === "None" ? 0.3 : 1.0;
        
        // Pass everything cleanly into the state machine
        comboManager.processGesture(gestureName, landmarks, handedness);
    };
}

bootApp();