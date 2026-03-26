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
        this.system.uniforms.uFistProgress.value += (target - this.system.uniforms.uFistProgress.value) * 0.1;
    }
}