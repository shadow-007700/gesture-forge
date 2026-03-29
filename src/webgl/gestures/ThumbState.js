export class ThumbState {
    constructor(particleSystem) {
        this.system = particleSystem;
        this.points = [{ x: 0, y: 0 }];
        
        this.isActive = { left: false, right: false };
        this.currentRotation = { left: 0, right: 0 };
        this.targetRotation = { left: 0, right: 0 };
        this.isTransitioning = { left: false, right: false };
        this.nextConfig = { left: null, right: null };
        this.currentMirror = { left: -1.0, right: 1.0 }; 
        
        this.built = false;
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

    trigger(configs) {
        this.processHandConfig('left', configs.left);
        this.processHandConfig('right', configs.right);
        
        if (!this.built && this.points.length > 1) {
            this.buildPositions();
        }
    }

    processHandConfig(side, config) {
        if (!config) {
            this.isActive[side] = false;
            // NEW: Reset rotation so future shapes don't spawn upside down
            this.targetRotation[side] = 0; 
            return;
        }
        
        const targetRot = config.isDown ? Math.PI : 0;
        let mirror = (side === 'left') ? -1.0 : 1.0;
        if (config.isDown) mirror *= -1.0;
        
        if (this.isActive[side]) {
            if (this.targetRotation[side] !== targetRot || this.currentMirror[side] !== mirror) {
                this.isTransitioning[side] = true;
                this.nextConfig[side] = { targetRot, mirror };
            }
            return;
        }
        
        this.targetRotation[side] = targetRot;
        this.currentMirror[side] = mirror;
        this.system.uniforms.uThumbMirror.value[side === 'left' ? 'x' : 'y'] = mirror;
        this.isActive[side] = true;
        this.isTransitioning[side] = false;
    }

    buildPositions() {
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
        this.built = true;
    }

    release() {
        this.isActive.left = false;
        this.isActive.right = false;
        this.isTransitioning.left = false;
        this.isTransitioning.right = false;
    }

    update() {
        ['left', 'right'].forEach(side => {
            const vecKey = side === 'left' ? 'x' : 'y';
            
            if (this.isTransitioning[side]) {
                this.system.uniforms.uThumbActive.value[vecKey] *= 0.8;
                if (this.system.uniforms.uThumbActive.value[vecKey] < 0.05) {
                    this.targetRotation[side] = this.nextConfig[side].targetRot;
                    this.currentMirror[side] = this.nextConfig[side].mirror;
                    this.system.uniforms.uThumbMirror.value[vecKey] = this.currentMirror[side];
                    this.isTransitioning[side] = false;
                }
            } else {
                const target = this.isActive[side] ? 1.0 : 0.0;
                this.system.uniforms.uThumbActive.value[vecKey] += (target - this.system.uniforms.uThumbActive.value[vecKey]) * 0.06;
            }
            
            this.currentRotation[side] += (this.targetRotation[side] - this.currentRotation[side]) * 0.1;
            this.system.uniforms.uThumbRotation.value[vecKey] = this.currentRotation[side];
        });
    }
}