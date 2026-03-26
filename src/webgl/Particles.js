import * as THREE from 'three';

// --- GPU SHADER CODE ---
const vertexShader = `
    uniform float uTime;
    uniform float uMorphProgress;
    uniform float uScatterForce; 
    uniform float uFistProgress; 
    
    attribute float aRandom;
    attribute vec3 aTargetPosition;
    
    varying float vVisibility;
    varying vec3 vColor; // NEW: Pass dynamic colors to the fragment shader!
    
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

        // Blends to Thumbs Up
        vec3 finalPos = mix(idlePos, targetPos, uMorphProgress);

        // --- TRUE CHAOS RANDOMNESS ---
        float rand1 = fract(sin(aRandom * 12.9898) * 43758.5453);
        float rand2 = fract(sin(aRandom * 78.2330) * 43758.5453);
        float rand3 = fract(sin(aRandom * 39.3460) * 43758.5453);

        // STATE C: THE FIST NEBULA (Volumetric Swirl)
        // Adjusted exponential curve for a softer, more voluminous spread
        float nRadius = pow(rand1, 2.5) * 14.0; 
        float nTheta = rand2 * 6.28318; 
        float nPhi = acos(2.0 * rand3 - 1.0); 

        vec3 cloudPos = vec3(
            nRadius * sin(nPhi) * cos(nTheta),
            nRadius * cos(nPhi) * 0.6, // FIX: Less vertical squash for true 3D volume
            nRadius * sin(nPhi) * sin(nTheta)
        );

        // FIX: Add the "Vortex Twist" to create natural galaxy arms
        float distToCenter = length(cloudPos);
        float twist = -distToCenter * 0.35; // Twist strength
        float s = sin(twist);
        float c = cos(twist);
        // Rotate the X and Z axes based on how far out the particle is
        cloudPos.xz = vec2(
            cloudPos.x * c - cloudPos.z * s,
            cloudPos.x * s + cloudPos.z * c
        );

        // Slowly rotate the entire structure
        float rot = uTime * 0.15;
        vec3 nebulaPos = vec3(
            cloudPos.x * cos(rot) - cloudPos.z * sin(rot),
            cloudPos.y + sin(uTime * 1.5 + aRandom * 10.0) * 0.2,
            cloudPos.x * sin(rot) + cloudPos.z * cos(rot)
        );

        finalPos = mix(finalPos, nebulaPos, uFistProgress);

        // --- NEW: DYNAMIC IONIZED COLORING ---
        vec3 baseColor = vec3(0.0, 1.0, 0.5); // Classic neon green
        
        // Calculate a hot Cyan core fading out into a deep Pink/Purple edge
        float colorMix = clamp(distToCenter / 12.0, 0.0, 1.0);
        vec3 coreColor = vec3(0.1, 0.8, 1.0); // Hot Cyan
        vec3 edgeColor = vec3(0.8, 0.1, 0.6); // Deep Pink
        vec3 nebulaColor = mix(coreColor, edgeColor, colorMix);
        
        // Add occasional pure white "stars" mixed into the dust
        float isStar = step(0.97, rand1);
        nebulaColor = mix(nebulaColor, vec3(1.0, 1.0, 1.0), isStar);

        // Blend colors based on whether we are in the Nebula state
        vColor = mix(baseColor, nebulaColor, uFistProgress);

        // STATE D: THE EXPLOSION
        vec3 explosionDir = vec3(
            sin(nPhi) * cos(nTheta),
            sin(nPhi) * sin(nTheta),
            cos(nPhi)
        );
        finalPos += explosionDir * (uScatterForce * 40.0);

        // --- Visibility Math ---
        float vis = 1.0;
        vis = mix(vis, 1.0 - step(0.10, aRandom), uMorphProgress);
        // Retain 8% of particles (4,000) for a thicker, softer cloud
        vis = mix(vis, 1.0 - step(0.08, aRandom), uFistProgress);
        
        float finalVis = max(vis, uScatterForce);
        
        // Gentle dimming so outer edges look more like smoke
        float dimming = mix(1.0, fract(aRandom * 333.333) * 0.7 + 0.3, uFistProgress);
        vVisibility = finalVis * dimming;

        vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
        
        // --- Dynamic Size Scaling ---
        float idleSize = 10.0 * aRandom + 5.0;
        float morphedSize = 30.0 * aRandom + 15.0;
        
        // FIX: Smoother size curve. 
        // Max size is 45px (prevents giant distinct marbles), exponent 3.0 creates more overlapping medium gas clouds
        float randomGas = fract(aRandom * 555.555);
        float nebulaSize = 45.0 * pow(randomGas, 3.0) + 3.0; 
        
        float currentSize = mix(idleSize, morphedSize, uMorphProgress);
        currentSize = mix(currentSize, nebulaSize, uFistProgress);
        
        currentSize += uScatterForce * 15.0; 
        
        gl_PointSize = currentSize * (2.0 / -mvPosition.z) * finalVis;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    varying float vVisibility;
    varying vec3 vColor; // NEW: Receive the dynamic color from vertex shader

    void main() {
        float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
        if (distanceToCenter > 0.5) discard;
        
        float alpha = (0.5 / distanceToCenter - 1.0) * vVisibility;
        if (alpha <= 0.0) discard;
        
        // FIX: Use the dynamic color instead of hardcoded green!
        gl_FragColor = vec4(vColor, alpha * 0.6); 
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
            uScatterForce: { value: 0.0 },
            uFistProgress: { value: 0.0 } 
        };
        this.targetMorph = 0.0; 
        this.targetFist = 0.0; 
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
        this.targetFist = 0.0; 
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

    morphToFist() {
        this.targetFist = 1.0;
        this.targetMorph = 0.0;
    }

    resetIdle() {
        this.targetMorph = 0.0;
        this.targetFist = 0.0; 
    }

    triggerScatter() {
        this.uniforms.uScatterForce.value = 1.0; 
        this.targetMorph = 0.0; 
        this.targetFist = 0.0; 
    }

    update(elapsedTime) {
        this.uniforms.uTime.value = elapsedTime;
        this.uniforms.uMorphProgress.value += (this.targetMorph - this.uniforms.uMorphProgress.value) * 0.05;
        this.uniforms.uFistProgress.value += (this.targetFist - this.uniforms.uFistProgress.value) * 0.1; 

        this.uniforms.uScatterForce.value *= 0.95; 
    }
}