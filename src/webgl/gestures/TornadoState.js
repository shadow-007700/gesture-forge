export class TornadoState {
    constructor(particleSystem) {
        this.system = particleSystem;
        this.isActive = { left: false, right: false };
    }

    trigger(configs) {
        // If the config exists for a side, activate it. Otherwise, deactivate.
        this.isActive.left = configs.left !== null;
        this.isActive.right = configs.right !== null;
    }

    release() {
        this.isActive.left = false;
        this.isActive.right = false;
    }

    update() {
        ['left', 'right'].forEach(side => {
            const vecKey = side === 'left' ? 'x' : 'y';
            const target = this.isActive[side] ? 1.0 : 0.0;
            
            // Smoothly interpolate the Tornado activation variable in the shader
            this.system.uniforms.uTornadoActive.value[vecKey] += (target - this.system.uniforms.uTornadoActive.value[vecKey]) * 0.1;
        });
    }
}