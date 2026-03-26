import * as THREE from 'three';

// --- GPU SHADER CODE ---
const vertexShader = `
    uniform float uTime;
    uniform float uMorphProgress;
    
    attribute float aRandom;
    attribute vec3 aTargetPosition;
    
    // Pass visibility to the fragment shader
    varying float vVisibility;
    
    void main() {
        // STATE A: Idle floating
        vec3 idlePos = position;
        idlePos.x += sin(uTime * 0.5 + aRandom * 10.0) * 0.2;
        idlePos.y += cos(uTime * 0.3 + aRandom * 10.0) * 0.2;
        idlePos.z += sin(uTime * 0.4 + aRandom * 10.0) * 0.2;

        // STATE B: Target Shape (The Hand)
        vec3 targetPos = aTargetPosition;
        targetPos.x += sin(uTime * 2.0 + aRandom * 100.0) * 0.3;
        targetPos.y += cos(uTime * 2.3 + aRandom * 100.0) * 0.3;
        targetPos.z += sin(uTime * 1.8 + aRandom * 100.0) * 0.3;

        // THE MAGIC: Smoothly blend between State A and State B
        vec3 finalPos = mix(idlePos, targetPos, uMorphProgress);

        // Determine if this particle should fade out.
        // If aRandom > 0.2 (80% of particles), isExtra is 1.0. Else 0.0.
        float isExtra = step(0.2, aRandom);
        
        // When morphed (uMorphProgress = 1.0), 80% of particles drop to 0.0 visibility.
        // This ensures a smooth transition from 50k to 10k particles.
        float visibility = 1.0 - (isExtra * uMorphProgress);
        vVisibility = visibility;

        vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
        
        // Scale size down to 0 for extra particles as they morph
        gl_PointSize = (15.0 * aRandom + 5.0) * (1.0 / -mvPosition.z) * visibility;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    varying float vVisibility;

    void main() {
        float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
        if (distanceToCenter > 0.5) discard;
        
        // Multiply alpha by our visibility factor
        float alpha = (0.5 / distanceToCenter - 1.0) * vVisibility;
        
        // If the particle is fully faded, don't draw it at all (saves GPU power)
        if (alpha <= 0.0) discard;
        
        gl_FragColor = vec4(0.0, 1.0, 0.5, alpha * 0.6); 
    }
`;
// -----------------------

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleCount = 50000;
        this.uniforms = {
            uTime: { value: 0.0 },
            uMorphProgress: { value: 0.0 } // 0 = idle, 1 = hand shape
        };
        this.targetMorph = 0.0; // What we want to lerp towards
        this.thumbsUpPoints = []; // Will hold the boundary pixel coordinates
        
        this.createShapeData();
        this.init();
    }

    // New Method: Extract pixel coordinates from an emoji
    createShapeData() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Draw a giant thumbs up in the center
        ctx.font = '200px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👍', 128, 128);

        // Scan the pixels
        const imgData = ctx.getImageData(0, 0, 256, 256).data;

        for (let y = 0; y < 256; y++) {
            for (let x = 0; x < 256; x++) {
                // Check the Alpha (transparency) channel of the pixel
                const alpha = imgData[(y * 256 + x) * 4 + 3];
                
                // If the pixel is not transparent, it's inside our boundary!
                if (alpha > 128) {
                    this.thumbsUpPoints.push({
                        x: (x / 256) - 0.5,       // Normalize to -0.5 to 0.5
                        y: -(y / 256) + 0.5       // Invert Y for 3D coordinates
                    });
                }
            }
        }
    }

    init() {
        this.geometry = new THREE.BufferGeometry();
        
        const positions = new Float32Array(this.particleCount * 3); 
        const targetPositions = new Float32Array(this.particleCount * 3); 
        const randoms = new Float32Array(this.particleCount);
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            // Original Idle positions
            positions[i3] = (Math.random() - 0.5) * 15;
            positions[i3 + 1] = (Math.random() - 0.5) * 15;
            positions[i3 + 2] = (Math.random() - 0.5) * 15;
            
            // Targets start identical to positions just to avoid zero-math errors
            targetPositions[i3] = positions[i3];
            targetPositions[i3 + 1] = positions[i3 + 1];
            targetPositions[i3 + 2] = positions[i3 + 2];
            
            randoms[i] = Math.random(); 
        }
        
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('aTargetPosition', new THREE.BufferAttribute(targetPositions, 3));
        this.geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
        
        this.material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: this.uniforms,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        this.points = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.points);
    }

    // Function to map the particles to the extracted shape
    morphToHand(landmarks) {
        this.targetMorph = 1.0; // Trigger the slider to go to 1.0

        const targetPositions = this.geometry.attributes.aTargetPosition.array;
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // Pick a random valid pixel inside our thumbs up boundary
            const point = this.thumbsUpPoints[Math.floor(Math.random() * this.thumbsUpPoints.length)];

            // Scale it down to fit the screen properly (e.g., 5.0 instead of 20.0)
            const scale = 5.0;
            
            targetPositions[i3] = point.x * scale;
            targetPositions[i3 + 1] = point.y * scale;
            targetPositions[i3 + 2] = (Math.random() - 0.5) * 1.5; // Give it slight 3D thickness
        }
        
        // Tell the GPU we updated the buffer!
        this.geometry.attributes.aTargetPosition.needsUpdate = true;
    }

    // Send the particles back to their idle state
    resetIdle() {
        this.targetMorph = 0.0;
    }

    update(elapsedTime) {
        this.uniforms.uTime.value = elapsedTime;

        // Math trick: Lerp (Linear Interpolation) to smoothly animate the slider
        // This moves uMorphProgress 5% closer to targetMorph every single frame
        this.uniforms.uMorphProgress.value += (this.targetMorph - this.uniforms.uMorphProgress.value) * 0.05;
    }
}