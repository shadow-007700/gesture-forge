import * as THREE from 'three';

export class WebGLScene {
    constructor() {
        this.scene = new THREE.Scene();
        
        // 1. Camera setup (Field of View, Aspect Ratio, Near, Far)
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;

        // 2. Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimization for high DPI screens
        
        // 3. Add canvas to the DOM, pushing it to the background
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '-1'; // Push behind webcam and UI
        document.body.appendChild(this.renderer.domElement);

        // Handle window resizing seamlessly
        window.addEventListener('resize', () => this.onResize());

        this.isRunning = false;
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.tick();
        }
    }

    tick() {
        if (!this.isRunning) return;
        
        // Render the scene from the perspective of the camera
        this.renderer.render(this.scene, this.camera);
        
        // Loop on the next frame
        requestAnimationFrame(() => this.tick());
    }
}