import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { VFXController } from './VFXController.js';

export class WebGLScene {
    constructor() {
        this.scene = new THREE.Scene();
        
        // Push the camera back slightly so the explosion has room to fly towards us
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 45; 

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Essential for vibrant, glowing colors
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; 
        this.renderer.toneMappingExposure = 1.2;
        
        document.body.appendChild(this.renderer.domElement);

        // --- POST-PROCESSING PIPELINE ---
        this.composer = new EffectComposer(this.renderer);
        
        // 1. Render the base 3D scene
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // 2. Add the Unreal Bloom (Cinematic Glow)
        // Parameters: Resolution, Strength, Radius, Threshold
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.2,  // Glow Strength 
            0.5,  // Glow Radius (How far it bleeds)
            0.15  // Threshold (Only glow bright things)
        );
        this.composer.addPass(this.bloomPass);

        this.clock = new THREE.Clock();
        this.onTick = () => {};

        // FIX: Replaced hardcoded GUI logic with our new modular VFX Controller
        this.vfxController = new VFXController(this.renderer, this.bloomPass);

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
        this.renderer.setAnimationLoop(() => {
            const elapsedTime = this.clock.getElapsedTime();
            
            // Tell the particles to update their physics
            this.onTick(elapsedTime);
            
            // CRITICAL: Render through the Composer (Bloom), not the standard Renderer!
            this.composer.render(); 
        });
    }
}