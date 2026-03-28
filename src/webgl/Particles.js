import * as THREE from 'three';
import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import { ThumbState } from './gestures/ThumbState.js';
import { NebulaState } from './gestures/NebulaState.js';
import { ScatterState } from './gestures/ScatterState.js';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleCount = 50000;
        this.uniforms = {
            uTime: { value: 0.0 },
            uMorphProgress: { value: 0.0 },
            uScatterForce: { value: 0.0 },
            uFistProgress: { value: 0.0 },
            
            // Dynamic Color Uniforms
            uColorIdle: { value: new THREE.Color('#00ff88') },
            uColorThumbsUp: { value: new THREE.Color('#00ffff') },
            uColorNebulaCore: { value: new THREE.Color('#19ccff') },
            uColorNebulaEdge: { value: new THREE.Color('#cc1999') },
            
            // Physics Engine Uniforms
            uNebulaRadius: { value: 26.0 },
            uThumbBuzz: { value: 0.15 },
            uThumbMaxSize: { value: 16.0 },
            uThumbBaseSize: { value: 0.8 },
            
            // NEW: Hardware Transformation Uniforms
            uThumbMirror: { value: 1.0 },    // 1.0 (Right) or -1.0 (Left)
            uThumbRotation: { value: 0.0 }   // 0 (Up) or 3.14159 (Down)
        };

        this.init();

        // Register Gesture Controllers
        this.thumbState = new ThumbState(this);
        this.nebulaState = new NebulaState(this);
        this.scatterState = new ScatterState(this);
    }

    init() {
        this.geometry = new THREE.BufferGeometry();
        
        const positions = new Float32Array(this.particleCount * 3); 
        const targetPositions = new Float32Array(this.particleCount * 3); 
        const randoms = new Float32Array(this.particleCount);
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            const radius = 20.0 + Math.random() * 50.0; 
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2.0 * Math.random() - 1.0);
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
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

    // NEW: Accept config from the Combo Manager
    morphToHand(config, landmarks) {
        this.nebulaState.release();
        this.thumbState.trigger(config);
    }

    morphToFist() {
        this.thumbState.release();
        this.nebulaState.trigger();
    }

    triggerScatter() {
        this.thumbState.release();
        this.nebulaState.release();
        this.scatterState.trigger();
    }

    resetIdle() {
        this.thumbState.release();
        this.nebulaState.release();
    }

    update(elapsedTime) {
        this.uniforms.uTime.value = elapsedTime;

        // Delegate updates to state controllers
        this.thumbState.update();
        this.nebulaState.update();
        this.scatterState.update();
    }
}