import GUI from 'lil-gui';

export class VFXController {
    constructor(renderer, bloomPass) {
        this.renderer = renderer;
        this.bloomPass = bloomPass;
        this.particles = null; 
        
        this.bloomPass.enabled = false;
        
        this.gui = new GUI({ title: '🎬 VFX Director Board' });
        
        this.colors = {
            idle: '#00ff88',
            thumbsUp: '#00ffff',
            nebCore: '#19ccff',
            nebEdge: '#cc1999'
        };
        
        // NEW: Store default physics values
        this.physics = {
            nebulaRadius: 26.0,
            thumbBuzz: 0.15,
            thumbMaxSize: 16.0,
            thumbBaseSize: 0.8
        };
        
        this.setupControls();
    }

    setParticles(particleSystem) {
        this.particles = particleSystem;
    }

    updateColor(uniformName, hexString) {
        if (this.particles && this.particles.uniforms[uniformName]) {
            this.particles.uniforms[uniformName].value.set(hexString);
        }
    }

    // NEW: Generic updater for numerical sliders
    updateFloat(uniformName, value) {
        if (this.particles && this.particles.uniforms[uniformName]) {
            this.particles.uniforms[uniformName].value = value;
        }
    }

    setupControls() {
        const colorFolder = this.gui.addFolder('Dynamic Colors');
        colorFolder.addColor(this.colors, 'idle').name('Idle Ambient').onChange(c => this.updateColor('uColorIdle', c));
        colorFolder.addColor(this.colors, 'thumbsUp').name('Thumbs Up').onChange(c => this.updateColor('uColorThumbsUp', c));
        colorFolder.addColor(this.colors, 'nebCore').name('Nebula Core').onChange(c => this.updateColor('uColorNebulaCore', c));
        colorFolder.addColor(this.colors, 'nebEdge').name('Nebula Edge').onChange(c => this.updateColor('uColorNebulaEdge', c));

        // --- NEW: Physics Engine Folder ---
        const physicsFolder = this.gui.addFolder('Physics Engine');
        physicsFolder.add(this.physics, 'nebulaRadius').min(10).max(60).step(0.5).name('Nebula Radius').onChange(v => this.updateFloat('uNebulaRadius', v));
        physicsFolder.add(this.physics, 'thumbBuzz').min(0.0).max(1.0).step(0.01).name('Shape Vibrate').onChange(v => this.updateFloat('uThumbBuzz', v));
        physicsFolder.add(this.physics, 'thumbMaxSize').min(5.0).max(40.0).step(0.5).name('Star Max Size').onChange(v => this.updateFloat('uThumbMaxSize', v));
        physicsFolder.add(this.physics, 'thumbBaseSize').min(0.1).max(5.0).step(0.1).name('Star Min Size').onChange(v => this.updateFloat('uThumbBaseSize', v));

        const bloomFolder = this.gui.addFolder('Cinematic Glow');
        bloomFolder.add(this.bloomPass, 'enabled').name('Enable Glow');
        bloomFolder.add(this.bloomPass, 'strength').min(0).max(5).step(0.01).name('Intensity');
        bloomFolder.add(this.bloomPass, 'radius').min(0).max(2).step(0.01).name('Radius');
        bloomFolder.add(this.bloomPass, 'threshold').min(0).max(1).step(0.01).name('Threshold');
        bloomFolder.add(this.renderer, 'toneMappingExposure').min(0.1).max(3).step(0.01).name('Exposure');
        
        window.addEventListener('keydown', (event) => {
            if (event.key === 'h' || event.key === 'H') {
                this.gui._hidden ? this.gui.show() : this.gui.hide();
            }
        });
    }
}