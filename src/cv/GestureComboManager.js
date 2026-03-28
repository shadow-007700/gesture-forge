export class GestureComboManager {
    constructor(particleSystem) {
        this.particles = particleSystem;
        this.lastFistTime = 0;
    }

    processGestures(hands) {
        if (hands.length === 0) {
            this.particles.resetIdle();
            return;
        }

        // 1. Check for Global Overrides (Fist / Scatter)
        const hasFist = hands.some(h => h.gestureName === "Closed_Fist");
        const hasPalm = hands.some(h => h.gestureName === "Open_Palm");

        if (hasFist) {
            this.lastFistTime = Date.now();
            this.particles.morphToFist();
            return;
        }
        
        if (hasPalm && (Date.now() - this.lastFistTime < 600)) {
            this.particles.triggerScatter();
            this.lastFistTime = 0; 
            return;
        }

        // 2. Map Independent Thumb States
        let thumbConfigs = { left: null, right: null };
        let foundThumb = false;
        
        hands.forEach(hand => {
            if (hand.gestureName === "Thumb_Up" || hand.gestureName === "Thumb_Down") {
                const side = hand.handedness === "Left" ? 'left' : 'right';
                thumbConfigs[side] = { isDown: hand.gestureName === "Thumb_Down" };
                foundThumb = true;
            }
        });

        if (foundThumb) {
            this.particles.morphToHand(thumbConfigs);
        } else {
            this.particles.resetIdle();
        }
    }
}