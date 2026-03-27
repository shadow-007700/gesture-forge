export class ThumbsUpState {
    constructor(particleSystem) {
        this.system = particleSystem;
        this.points = [{ x: 0, y: 0 }];
        this.isActive = false;
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

            for (let y = 0; y < 256; y++) {
                for (let x = 0; x < 256; x++) {
                    const index = (y * 256 + x) * 4;
                    const r = imgData[index];
                    const g = imgData[index + 1];
                    const b = imgData[index + 2];
                    const alpha = imgData[index + 3];

                    if (alpha > 128 && (r > 50 || g > 50 || b > 50)) {
                        this.points.push({
                            x: (x / 256) - 0.5,
                            y: -(y / 256) + 0.5
                        });
                    }
                }
            }
        };
    }

    trigger() {
        this.isActive = true;
        if (this.points.length <= 1) return;

        const targetPositions = this.system.geometry.attributes.aTargetPosition.array;

        for (let i = 0; i < this.system.particleCount; i++) {
            const i3 = i * 3;
            const point = this.points[Math.floor(Math.random() * this.points.length)];
            
            // BUG FIX: Scaled up the shape from 8.0 to 32.0 so it is much larger and more legible
            const scale = 32.0;

            targetPositions[i3] = point.x * scale;
            targetPositions[i3 + 1] = point.y * scale;
            
            // BUG FIX: Added 3D depth (from 0.1 to 2.0) so the particles don't sit perfectly flat.
            // This also helps solve the "solid blob" issue by distributing the glow across the Z-axis!
            targetPositions[i3 + 2] = (Math.random() - 0.5) * 2.0;
        }

        this.system.geometry.attributes.aTargetPosition.needsUpdate = true;
    }

    release() {
        this.isActive = false;
    }

    update() {
        const target = this.isActive ? 1.0 : 0.0;
        // BUG FIX: Synced the speed with NebulaState (changed from 0.03 to 0.06)
        this.system.uniforms.uMorphProgress.value += (target - this.system.uniforms.uMorphProgress.value) * 0.06;
    }
}