export class NebulaState {
    constructor(particleSystem) {
        this.system = particleSystem;
        this.isActive = false;
    }

    trigger() {
        this.isActive = true;
    }

    release() {
        this.isActive = false;
    }

    update() {
        const target = this.isActive ? 1.0 : 0.0;
        // BUG FIX: Increased speed from 0.03 to 0.06 to make the transition snappier, 
        // resolving the sluggish feeling while keeping the fade smooth.
        this.system.uniforms.uFistProgress.value += (target - this.system.uniforms.uFistProgress.value) * 0.06;
    }
}