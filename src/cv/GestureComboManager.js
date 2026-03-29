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

        const hasFist = hands.some(h => h.gestureName === "Closed_Fist");
        const hasPalm = hands.some(h => h.gestureName === "Open_Palm");

        // Global overrides still take precedence
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

        // Independent state tracking objects
        let thumbConfigs = { left: null, right: null };
        let tornadoConfigs = { left: null, right: null };
        let foundAnyShape = false;
        
        hands.forEach(hand => {
            const side = hand.handedness === "Left" ? 'left' : 'right';
            
            if (hand.gestureName === "Thumb_Up" || hand.gestureName === "Thumb_Down") {
                thumbConfigs[side] = { isDown: hand.gestureName === "Thumb_Down" };
                foundAnyShape = true;
            } else if (hand.gestureName === "Pointing_Up") {
                tornadoConfigs[side] = { active: true };
                foundAnyShape = true;
            }
        });

        if (foundAnyShape) {
            // We pass both configs. The respective State classes 
            // will safely turn themselves off if their config is null!
            this.particles.morphToHand(thumbConfigs);
            this.particles.morphToTornado(tornadoConfigs);
        } else {
            this.particles.resetIdle();
        }
    }
}