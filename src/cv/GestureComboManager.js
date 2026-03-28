export class GestureComboManager {
    constructor(particleSystem) {
        this.particles = particleSystem;
        
        // NEW: Track the highly specific state of the hand
        this.currentThumbState = null; 
        this.lastFistTime = 0;
    }

    processGesture(gestureName, landmarks, handedness) {
        if (gestureName === "None") {
            this.particles.resetIdle();
            this.currentThumbState = null;
            return;
        }

        if (gestureName === "Closed_Fist") {
            this.lastFistTime = Date.now();
            this.particles.morphToFist();
            this.currentThumbState = null;
        }
        else if (gestureName === "Open_Palm" && (Date.now() - this.lastFistTime < 600)) {
            this.particles.triggerScatter();
            this.lastFistTime = 0; 
            this.currentThumbState = null; 
        }
        else if (gestureName === "Thumb_Up" || gestureName === "Thumb_Down") {
            // NEW: Create a unique signature, e.g., "Thumb_Up_Right"
            const stateId = `${gestureName}_${handedness}`;
            
            // Only trigger the WebGL particles if the state actually changed!
            if (this.currentThumbState !== stateId) {
                // Setup the config flags for the shader
                const isLeftHand = handedness === "Left";
                const isDown = gestureName === "Thumb_Down";
                
                // Fire the particles with the specific config!
                this.particles.morphToHand({ isLeftHand, isDown }, landmarks);
                this.currentThumbState = stateId;
            }
        }
        else {
            this.particles.resetIdle();
            this.currentThumbState = null;
        }
    }
}