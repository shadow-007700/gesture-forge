import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleCount = 50000; // 50k particles to start!
        
        this.init();
    }

    init() {
        // 1. Create a single geometry object to hold all vertices
        this.geometry = new THREE.BufferGeometry();
        
        // 2. Create a flat Float32Array to hold x, y, z coordinates
        const positions = new Float32Array(this.particleCount * 3); 
        
        // 3. Fill the array with random positions (creating a large cube of particles)
        for (let i = 0; i < this.particleCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 10; // Random spread from -5 to +5
        }
        
        // 4. Attach the position data to the geometry
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // 5. Create the material (How the points look)
        this.material = new THREE.PointsMaterial({
            size: 0.02,
            color: 0x00ff88,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending, // Makes overlapping particles glow brightly
            depthWrite: false // Optimization: prevents particles from hiding each other incorrectly
        });
        
        // 6. Combine geometry and material into a Points mesh
        this.points = new THREE.Points(this.geometry, this.material);
        
        // 7. Add it to the main Three.js scene
        this.scene.add(this.points);
    }
}