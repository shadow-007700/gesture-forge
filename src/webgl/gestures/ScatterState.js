export class ScatterState {
    constructor(particleSystem) {
        this.system = particleSystem;
    }

    trigger() {
        this.system.uniforms.uScatterForce.value = 1.0;
    }

    update() {
        this.system.uniforms.uScatterForce.value *= 0.95;
    }
}