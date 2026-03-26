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
        // FIX: Removed dizzying jitter. Replaced with a very slow, tight "breathing" effect.
        vec3 targetPos = aTargetPosition;
        targetPos.x += sin(uTime * 1.0 + aRandom * 20.0) * 0.05;
        targetPos.y += cos(uTime * 1.2 + aRandom * 20.0) * 0.05;
        targetPos.z += sin(uTime * 0.8 + aRandom * 20.0) * 0.05;

        // THE MAGIC: Smoothly blend between State A and State B
        vec3 finalPos = mix(idlePos, targetPos, uMorphProgress);

        // FIX: Target ~5,000 particles (10% of 50,000)
        // If aRandom > 0.10, isExtra is 1.0 (meaning it will fade out).
        float isExtra = step(0.10, aRandom);
        
        // When morphed (uMorphProgress = 1.0), 90% of particles drop to 0.0 visibility.
        float visibility = 1.0 - (isExtra * uMorphProgress);
        vVisibility = visibility;

        vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
        
        // FIX: DYNAMIC SIZE SCALING
        // Idle size: 5px to 15px (Small and elegant)
        float idleSize = 10.0 * aRandom + 5.0;
        // Morphed size: 15px to 45px (Large enough to fill the shape with only 5k particles)
        float morphedSize = 30.0 * aRandom + 15.0;
        
        // Smoothly transition the size as the morph happens
        float currentSize = mix(idleSize, morphedSize, uMorphProgress);
        
        gl_PointSize = currentSize * (2.0 / -mvPosition.z) * visibility;
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
        
        // Provide a fallback coordinate in case the image takes a moment to load
        this.thumbsUpPoints = [{x: 0, y: 0}]; 
        
        this.createShapeData();
        this.init();
    }

    // New Method: Extract pixel coordinates from your custom uploaded image
    createShapeData() {
        const img = new Image();
        // Updated to industry standard: expects image in public/images/ folder
        img.src = '/images/thumbs_up.png'; 
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // FIX: Calculate scale to preserve aspect ratio (This restores the missing finger!)
            const scale = Math.min(256 / img.width, 256 / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const offsetX = (256 - w) / 2;
            const offsetY = (256 - h) / 2;
            
            // Draw your custom image perfectly centered without stretching
            ctx.drawImage(img, offsetX, offsetY, w, h);

            // Scan the pixels
            const imgData = ctx.getImageData(0, 0, 256, 256).data;
            
            // Clear the fallback point
            this.thumbsUpPoints = []; 

            for (let y = 0; y < 256; y++) {
                for (let x = 0; x < 256; x++) {
                    const index = (y * 256 + x) * 4;
                    const r = imgData[index];
                    const g = imgData[index + 1];
                    const b = imgData[index + 2];
                    const alpha = imgData[index + 3];
                    
                    // CRITICAL LOGIC: 
                    // This expects the INSIDE of the hand to be filled with color (not transparent)
                    if (alpha > 128 && (r > 50 || g > 50 || b > 50)) {
                        this.thumbsUpPoints.push({
                            x: (x / 256) - 0.5,
                            y: -(y / 256) + 0.5
                        });
                    }
                }
            }
            
            console.log("Custom Shape loaded! Target points generated:", this.thumbsUpPoints.length);
        };
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

        // If the image hasn't finished loading yet, skip morphing this frame
        if (this.thumbsUpPoints.length <= 1) return;

        const targetPositions = this.geometry.attributes.aTargetPosition.array;
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // Pick a random valid pixel inside our thumbs up boundary
            const point = this.thumbsUpPoints[Math.floor(Math.random() * this.thumbsUpPoints.length)];

            // Adjusted scale to ensure the image fits well on the screen
            const scale = 8.0;
            
            targetPositions[i3] = point.x * scale;
            targetPositions[i3 + 1] = point.y * scale;
            
            // REDUCED Z-THICKNESS: Flatten the shape so it doesn't blur out into a blob
            targetPositions[i3 + 2] = (Math.random() - 0.5) * 0.1; 
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