export class ThumbState {
    constructor(particleSystem) {
        this.system = particleSystem;
        this.points = [{ x: 0, y: 0 }];
        this.isActive = false;
        
        this.currentRotation = 0;
        this.targetRotation = 0;
        
        // NEW: For the split-second scramble transition
        this.isTransitioning = false;
        this.nextConfig = null;
        
        this.loadShape();
    }

    loadShape() {
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
            this.points = [];

            const grid = Array.from({ length: 256 }, () => Array(256).fill(false));
            
            for (let y = 0; y < 256; y++) {
                for (let x = 0; x < 256; x++) {
                    const index = (y * 256 + x) * 4;
                    const r = imgData[index];
                    const g = imgData[index + 1];
                    const b = imgData[index + 2];
                    const alpha = imgData[index + 3];

                    if (alpha > 128 && (r > 50 || g > 50 || b > 50)) {
                        grid[y][x] = true;
                    }
                }
            }

            const EDGE_PADDING = 2; 

            for (let y = 0; y < 256; y++) {
                for (let x = 0; x < 256; x++) {
                    if (grid[y][x]) {
                        let isEdge = false;
                        for (let dy = -EDGE_PADDING; dy <= EDGE_PADDING; dy++) {
                            for (let dx = -EDGE_PADDING; dx <= EDGE_PADDING; dx++) {
                                if (dx * dx + dy * dy <= EDGE_PADDING * EDGE_PADDING) {
                                    const ny = y + dy;
                                    const nx = x + dx;
                                    
                                    if (ny < 0 || ny >= 256 || nx < 0 || nx >= 256 || !grid[ny][nx]) {
                                        isEdge = true;
                                        break;
                                    }
                                }
                            }
                            if (isEdge) break;
                        }

                        if (!isEdge) {
                            this.points.push({
                                x: (x / 256) - 0.5,
                                y: -(y / 256) + 0.5
                            });
                        }
                    }
                }
            }
        };
    }

    trigger(config = { isLeftHand: false, isDown: false }) {
        const targetRot = config.isDown ? Math.PI : 0;
        let mirror = config.isLeftHand ? -1.0 : 1.0;
        
        // FIX ISSUE 1: Rotating a mirrored hand 180 degrees flips the thumb to the wrong side. 
        // We mathematically invert the mirror if the thumb is down to correct it!
        if (config.isDown) mirror *= -1.0; 

        // FIX ISSUE 2 & 3: If shape is already active, don't snap. Trigger the scramble transition!
        if (this.isActive) {
            // Only transition if the target actually changed (allows Up -> Down AND Down -> Up)
            if (this.targetRotation !== targetRot || this.system.uniforms.uThumbMirror.value !== mirror) {
                this.isTransitioning = true;
                this.nextConfig = { targetRot, mirror };
            }
            return;
        }

        this.targetRotation = targetRot;
        this.system.uniforms.uThumbMirror.value = mirror;
        this.isActive = true;
        this.isTransitioning = false;

        if (this.points.length <= 1) return;

        const targetPositions = this.system.geometry.attributes.aTargetPosition.array;

        for (let i = 0; i < this.system.particleCount; i++) {
            const i3 = i * 3;
            const point = this.points[Math.floor(Math.random() * this.points.length)];
            
            const scale = 32.0;

            targetPositions[i3] = point.x * scale;
            targetPositions[i3 + 1] = point.y * scale;
            targetPositions[i3 + 2] = (Math.random() - 0.5) * 4.0;
        }

        this.system.geometry.attributes.aTargetPosition.needsUpdate = true;
    }

    release() {
        this.isActive = false;
        this.isTransitioning = false;
    }

    update() {
        if (this.isTransitioning) {
            // PHASE 1: Drop the morph progress quickly to scatter back to idle
            this.system.uniforms.uMorphProgress.value *= 0.8;
            
            if (this.system.uniforms.uMorphProgress.value < 0.05) {
                // PHASE 2: Lock in the new rotation and mirror once hidden, then reform!
                this.targetRotation = this.nextConfig.targetRot;
                this.system.uniforms.uThumbMirror.value = this.nextConfig.mirror;
                this.isTransitioning = false;
            }
        } else {
            // Normal fade in/out
            const target = this.isActive ? 1.0 : 0.0;
            this.system.uniforms.uMorphProgress.value += (target - this.system.uniforms.uMorphProgress.value) * 0.06;
        }
        
        // Always smoothly animate the barrel roll rotation
        this.currentRotation += (this.targetRotation - this.currentRotation) * 0.1;
        this.system.uniforms.uThumbRotation.value = this.currentRotation;
    }
}