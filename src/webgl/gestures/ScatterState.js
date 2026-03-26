export class ScatterState {
    constructor(particleSystem) {
        this.system = particleSystem;
        this.progress = 0;
        this.isActive = false;
    }

    trigger() {
        // Start just slightly above 0 to trigger the math in the shader
        this.progress = 0.001; 
        this.isActive = true;
    }

    update() {
        if (!this.isActive) {
            this.system.uniforms.uScatterForce.value = 0.0;
            return;
        }

        // We split the progress into two phases: 
        // Phase 1 (0.0 to 1.0): Explode outward rapidly and fade out
        // Phase 2 (1.0 to 2.0): Drift back into existence at idle positions
        if (this.progress < 1.0) {
            this.progress += 0.04; // Fast explosion (~25 frames)
        } else {
            this.progress += 0.015; // Slow, graceful fade back in (~66 frames)
        }

        if (this.progress >= 2.0) {
            this.progress = 0.0;
            this.isActive = false;
        }

        this.system.uniforms.uScatterForce.value = this.progress;
    }
}