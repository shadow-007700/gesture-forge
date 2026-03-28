import GUI from 'lil-gui';

export class VFXController {
    constructor(renderer, bloomPass) {
        this.renderer = renderer;
        this.bloomPass = bloomPass;
        this.particles = null; // NEW: Holds particle reference
        
        // Turn off the glow by default until we perfect it later!
        this.bloomPass.enabled = false;
        
        // Initialize the master control board
        this.gui = new GUI({ title: '🎬 VFX Director Board' });
        
        // NEW: Store default hex colors
        this.colors = {
            idle: '#00ff88',
            thumbsUp: '#00ffff',
            nebCore: '#19ccff',
            nebEdge: '#cc1999'
        };
        
        this.setupControls();
    }

    // NEW: Link to Particle System
    setParticles(particleSystem) {
        this.particles = particleSystem;
    }

    // NEW: Update color uniformly
    updateColor(uniformName, hexString) {
        if (this.particles && this.particles.uniforms[uniformName]) {
            this.particles.uniforms[uniformName].value.set(hexString);
        }
    }

    setupControls() {
        // --- NEW: Dynamic Colors Folder ---
        const colorFolder = this.gui.addFolder('Dynamic Colors');
        colorFolder.addColor(this.colors, 'idle').name('Idle Ambient').onChange(c => this.updateColor('uColorIdle', c));
        colorFolder.addColor(this.colors, 'thumbsUp').name('Thumbs Up').onChange(c => this.updateColor('uColorThumbsUp', c));
        colorFolder.addColor(this.colors, 'nebCore').name('Nebula Core').onChange(c => this.updateColor('uColorNebulaCore', c));
        colorFolder.addColor(this.colors, 'nebEdge').name('Nebula Edge').onChange(c => this.updateColor('uColorNebulaEdge', c));

        // Create a dedicated folder for Post-Processing
        const bloomFolder = this.gui.addFolder('Cinematic Glow');
        
        // Add a checkbox to easily toggle the entire glow effect on and off
        bloomFolder.add(this.bloomPass, 'enabled').name('Enable Glow');
        
        // Wire the sliders directly to the Bloom Pass properties
        bloomFolder.add(this.bloomPass, 'strength').min(0).max(5).step(0.01).name('Intensity');
        bloomFolder.add(this.bloomPass, 'radius').min(0).max(2).step(0.01).name('Radius');
        bloomFolder.add(this.bloomPass, 'threshold').min(0).max(1).step(0.01).name('Threshold');
        bloomFolder.add(this.renderer, 'toneMappingExposure').min(0.1).max(3).step(0.01).name('Exposure');
        
        // Add a master switch to toggle the entire GUI with the 'H' key
        window.addEventListener('keydown', (event) => {
            if (event.key === 'h' || event.key === 'H') {
                this.gui._hidden ? this.gui.show() : this.gui.hide();
            }
        });
    }
}