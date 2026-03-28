export class GestureComboManager {
    constructor(particleSystem) {
        this.particles = particleSystem;
        
        // Internal State tracking
        this.isMorphed = false;
        this.lastFistTime = 0;
    }

    processGesture(gestureName, landmarks) {
        if (gestureName === "None") {
            this.particles.resetIdle();
            this.isMorphed = false;
            return;
        }

        if (gestureName === "Closed_Fist") {
            this.lastFistTime = Date.now();
            this.particles.morphToFist();
            this.isMorphed = false;
        }
        else if (gestureName === "Open_Palm" && (Date.now() - this.lastFistTime < 600)) {
            // Combo successful: Fist -> Open Palm within 600ms!
            this.particles.triggerScatter();
            this.lastFistTime = 0; // Reset combo timer
            this.isMorphed = false; 
        }
        else if (gestureName === "Thumb_Up") {
            if (!this.isMorphed) {
                this.particles.morphToHand(landmarks);
                this.isMorphed = true;
            }
        }
        else {
            // Catch-all for Pointing_Up, ILoveYou, or an Open_Palm with no combo.
            // Guarantees the nebula never gets "stuck"
            this.particles.resetIdle();
            this.isMorphed = false;
        }
    }
}