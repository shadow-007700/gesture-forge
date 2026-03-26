import * as THREE from 'three';
import { vertexShader } from './shaders/vertexShader.js';
import { fragmentShader } from './shaders/fragmentShader.js';
import { ThumbsUpState } from './gestures/ThumbsUpState.js';
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
            uFistProgress: { value: 0.0 }
        };

        this.init();

        // Register Gesture Controllers
        this.thumbsUpState = new ThumbsUpState(this);
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

    // Public API for main.js
    morphToHand(landmarks) {
        this.nebulaState.release();
        this.thumbsUpState.trigger();
    }

    morphToFist() {
        this.thumbsUpState.release();
        this.nebulaState.trigger();
    }

    triggerScatter() {
        this.thumbsUpState.release();
        this.nebulaState.release();
        this.scatterState.trigger();
    }

    resetIdle() {
        this.thumbsUpState.release();
        this.nebulaState.release();
    }

    update(elapsedTime) {
        this.uniforms.uTime.value = elapsedTime;

        // Delegate updates to state controllers
        this.thumbsUpState.update();
        this.nebulaState.update();
        this.scatterState.update();
    }
}