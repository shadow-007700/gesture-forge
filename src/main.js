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

// Connect the Scene's animation loop to the Particle System
scene.onTick = (elapsedTime) => {
    particles.update(elapsedTime);
};

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

    // Keep track of state so we don't recalculate the hand map 60 times a second
    let isMorphed = false;
    let lastFistTime = 0; // NEW: Tracks the exact timestamp a fist was seen

    tracker.onGestureDetected = (gestureName, landmarks) => {
        gestureOutputElement.innerText = gestureName;
        
        if (gestureName === "None") {
            gestureOutputElement.style.opacity = 0.3;
            
            // If they drop their hand, return to idle
            if (isMorphed || particles.targetFist > 0) {
                particles.resetIdle();
                isMorphed = false;
            }
        } else {
            gestureOutputElement.style.opacity = 1.0;

            // NEW: Handle Fist / Nebula Cluster
            if (gestureName === "Closed_Fist") {
                lastFistTime = Date.now(); // Record the exact time we saw the fist
                particles.morphToFist();   // Trigger the dense nebula cluster!
                isMorphed = false;
            }

            // Trigger the Morph ONLY ONCE when a thumbs up is recognized!
            if (gestureName === "Thumb_Up" && !isMorphed) {
                particles.morphToHand(landmarks);
                isMorphed = true;
            }
            
            // NEW: The Time-Window Combo Trigger!
            // If Open Palm is detected AND a Fist was seen within the last 600ms (0.6s)
            if (gestureName === "Open_Palm" && (Date.now() - lastFistTime < 600)) {
                particles.triggerScatter();
                isMorphed = false; 
                lastFistTime = 0; // Reset timer so it doesn't double-trigger
            } else if (gestureName === "Open_Palm") {
                // If they just hold an open palm without a combo, clear other states
                particles.resetIdle();
                isMorphed = false;
            }
        }
    };
}

bootApp();