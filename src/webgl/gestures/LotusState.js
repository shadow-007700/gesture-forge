export class LotusState {
    constructor(particleSystem) {
        this.system = particleSystem;
        this.points = [{ x: 0, y: 0 }];
        this.isActive = { left: false, right: false };
        this.built = false;
        
        this.loadShape();
    }

    loadShape() {
        const img = new Image();
        img.src = '/images/lotus.png';

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

                    // FIX: Relaxed the RGB threshold so dark colors (like dark green) are not ignored!
                    if (alpha > 128 && (r > 5 || g > 5 || b > 5)) {
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
        this.isActive.left = configs.left !== null;
        this.isActive.right = configs.right !== null;
        
        if (!this.built && this.points.length > 1) {
            this.buildPositions();
        }
    }

    buildPositions() {
        const targetPositions = this.system.geometry.attributes.aLotusPosition.array;
        for (let i = 0; i < this.system.particleCount; i++) {
            const i3 = i * 3;
            const point = this.points[Math.floor(Math.random() * this.points.length)];
            const scale = 32.0;
            targetPositions[i3] = point.x * scale;
            targetPositions[i3 + 1] = point.y * scale;
            targetPositions[i3 + 2] = (Math.random() - 0.5) * 4.0;
        }
        this.system.geometry.attributes.aLotusPosition.needsUpdate = true;
        this.built = true;
    }

    release() {
        this.isActive.left = false;
        this.isActive.right = false;
    }

    update() {
        ['left', 'right'].forEach(side => {
            const vecKey = side === 'left' ? 'x' : 'y';
            const target = this.isActive[side] ? 1.0 : 0.0;
            this.system.uniforms.uLotusActive.value[vecKey] += (target - this.system.uniforms.uLotusActive.value[vecKey]) * 0.06;
        });
    }
}