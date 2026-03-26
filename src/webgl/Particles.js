import * as THREE from 'three';

// --- GPU SHADER CODE ---
const vertexShader = `
    uniform float uTime;
    uniform float uMorphProgress;
    uniform float uScatterForce; // NEW: Explosion force multiplier
    
    attribute float aRandom;
    attribute vec3 aTargetPosition;
    
    varying float vVisibility;
    
    void main() {
        // STATE A: Idle floating
        vec3 idlePos = position;
        idlePos.x += sin(uTime * 0.5 + aRandom * 10.0) * 0.2;
        idlePos.y += cos(uTime * 0.3 + aRandom * 10.0) * 0.2;
        idlePos.z += sin(uTime * 0.4 + aRandom * 10.0) * 0.2;

        // STATE B: Target Shape (The Hand)
        vec3 targetPos = aTargetPosition;
        targetPos.x += sin(uTime * 1.0 + aRandom * 20.0) * 0.05;
        targetPos.y += cos(uTime * 1.2 + aRandom * 20.0) * 0.05;
        targetPos.z += sin(uTime * 0.8 + aRandom * 20.0) * 0.05;

        // THE MAGIC: Smoothly blend between State A and State B
        vec3 finalPos = mix(idlePos, targetPos, uMorphProgress);

        // STATE C: THE EXPLOSION
        // Generate a random 3D outward direction for every single particle
        float angle1 = aRandom * 6.28318 * 100.0; // Random yaw
        float angle2 = aRandom * 3.14159 * 100.0; // Random pitch
        vec3 explosionDir = vec3(
            sin(angle2) * cos(angle1),
            sin(angle2) * sin(angle1),
            cos(angle2)
        );
        
        // Blast the particles outward along their random vector!
        // The multiplier (40.0) controls the maximum radius of the explosion
        finalPos += explosionDir * (uScatterForce * 40.0);

        // Visibility Math (5,000 particles visible during morph)
        float isExtra = step(0.10, aRandom);
        float visibility = 1.0 - (isExtra * uMorphProgress);
        
        // NEW: Force ALL particles to become instantly visible during the explosion for max impact!
        visibility = max(visibility, uScatterForce);
        vVisibility = visibility;

        vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
        
        float idleSize = 10.0 * aRandom + 5.0;
        float morphedSize = 30.0 * aRandom + 15.0;
        
        float currentSize = mix(idleSize, morphedSize, uMorphProgress);
        
        // Ensure particles get slightly larger during the explosion so it feels thick
        currentSize += uScatterForce * 15.0; 
        
        gl_PointSize = currentSize * (2.0 / -mvPosition.z) * visibility;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    varying float vVisibility;

    void main() {
        float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
        if (distanceToCenter > 0.5) discard;
        
        float alpha = (0.5 / distanceToCenter - 1.0) * vVisibility;
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
            uMorphProgress: { value: 0.0 },
            uScatterForce: { value: 0.0 } // NEW
        };
        this.targetMorph = 0.0; 
        this.thumbsUpPoints = [{x: 0, y: 0}]; 
        
        this.createShapeData();
        this.init();
    }

    createShapeData() {
        const img = new Image();
        img.src = '/images/thumbs_up.png'; 
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            const scale = Math.min(256 / img.width, 256 / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const offsetX = (256 - w) / 2;
            const offsetY = (256 - h) / 2;
            
            ctx.drawImage(img, offsetX, offsetY, w, h);
            const imgData = ctx.getImageData(0, 0, 256, 256).data;
            this.thumbsUpPoints = []; 

            for (let y = 0; y < 256; y++) {
                for (let x = 0; x < 256; x++) {
                    const index = (y * 256 + x) * 4;
                    const r = imgData[index];
                    const g = imgData[index + 1];
                    const b = imgData[index + 2];
                    const alpha = imgData[index + 3];
                    
                    if (alpha > 128 && (r > 50 || g > 50 || b > 50)) {
                        this.thumbsUpPoints.push({
                            x: (x / 256) - 0.5,
                            y: -(y / 256) + 0.5
                        });
                    }
                }
            }
        };
    }

    init() {
        this.geometry = new THREE.BufferGeometry();
        
        const positions = new Float32Array(this.particleCount * 3); 
        const targetPositions = new Float32Array(this.particleCount * 3); 
        const randoms = new Float32Array(this.particleCount);
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 15;
            positions[i3 + 1] = (Math.random() - 0.5) * 15;
            positions[i3 + 2] = (Math.random() - 0.5) * 15;
            
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

    morphToHand(landmarks) {
        this.targetMorph = 1.0; 
        if (this.thumbsUpPoints.length <= 1) return;

        const targetPositions = this.geometry.attributes.aTargetPosition.array;
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            const point = this.thumbsUpPoints[Math.floor(Math.random() * this.thumbsUpPoints.length)];
            const scale = 8.0;
            
            targetPositions[i3] = point.x * scale;
            targetPositions[i3 + 1] = point.y * scale;
            targetPositions[i3 + 2] = (Math.random() - 0.5) * 0.1; 
        }
        
        this.geometry.attributes.aTargetPosition.needsUpdate = true;
    }

    resetIdle() {
        this.targetMorph = 0.0;
    }

    // NEW: Triggers the explosion
    triggerScatter() {
        this.uniforms.uScatterForce.value = 1.0; // Spike the force
        this.targetMorph = 0.0; // Release the thumbs up morph if active
    }

    update(elapsedTime) {
        this.uniforms.uTime.value = elapsedTime;
        this.uniforms.uMorphProgress.value += (this.targetMorph - this.uniforms.uMorphProgress.value) * 0.05;

        // NEW: Friction/Drag
        // Multiplies the force by 0.95 every frame. 
        // It starts fast (1.0), drops rapidly (0.95, 0.90, 0.85), and smoothly coasts to 0.0
        this.uniforms.uScatterForce.value *= 0.95; 
    }
}