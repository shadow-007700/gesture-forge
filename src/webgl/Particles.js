import * as THREE from 'three';

// --- GPU SHADER CODE ---
const vertexShader = `
    uniform float uTime;
    attribute float aRandom;
    
    void main() {
        vec3 pos = position;
        
        // Idle floating animation using time and randomness
        pos.x += sin(uTime * 0.5 + aRandom * 10.0) * 0.2;
        pos.y += cos(uTime * 0.3 + aRandom * 10.0) * 0.2;
        pos.z += sin(uTime * 0.4 + aRandom * 10.0) * 0.2;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        
        // Make particles closer to the camera appear larger
        gl_PointSize = (15.0 * aRandom + 5.0) * (1.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    void main() {
        // Cut the square gl_Point into a perfect circle
        float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
        if (distanceToCenter > 0.5) discard;
        
        // Create a soft glowing fade off from the center
        float alpha = 0.5 / distanceToCenter - 1.0;
        
        gl_FragColor = vec4(0.0, 1.0, 0.5, alpha * 0.6); // Glowing Green
    }
`;
// -----------------------

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleCount = 50000; // 50k particles to start!
        this.uniforms = {
            uTime: { value: 0.0 }
        };
        
        this.init();
    }

    init() {
        // 1. Create a single geometry object to hold all vertices
        this.geometry = new THREE.BufferGeometry();
        
        // 2. Create arrays for positions and random offsets
        const positions = new Float32Array(this.particleCount * 3); 
        const randoms = new Float32Array(this.particleCount);
        
        // 3. Fill the arrays
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            // Spread particles over a larger area
            positions[i3] = (Math.random() - 0.5) * 15;     // x
            positions[i3 + 1] = (Math.random() - 0.5) * 15; // y
            positions[i3 + 2] = (Math.random() - 0.5) * 15; // z
            
            randoms[i] = Math.random(); // Random value from 0.0 to 1.0
        }
        
        // 4. Attach data to the geometry
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
        
        // 5. Create the Custom Shader Material
        this.material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: this.uniforms,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        // 6. Combine geometry and material into a Points mesh
        this.points = new THREE.Points(this.geometry, this.material);
        
        // 7. Add it to the main Three.js scene
        this.scene.add(this.points);
    }

    // New update method to pass the current time to the GPU
    update(elapsedTime) {
        this.uniforms.uTime.value = elapsedTime;
    }
}