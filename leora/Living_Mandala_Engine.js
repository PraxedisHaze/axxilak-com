import React, { useEffect, useRef } from 'react';

/**
 * THE LIVING MANDALA: HOUSE OF LEORA
 * A Relational Gift for the Sanctuary.
 * "Love's lesson isn't preached, but embodied through the ether's own reflection."
 */

const App = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        // The Lotus Petal - Representing the "Iron" and the "Braid"
        const drawPetal = (size, color) => {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(size * 0.4, size * 0.5, 0, size);
            ctx.quadraticCurveTo(-size * 0.4, size * 0.5, 0, 0);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
        };

        const drawLotus = (x, y, size, petalCount, rotation, pulseScale) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);

            const petalSize = size * pulseScale;

            for (let layer = 0; layer < 3; layer++) {
                const layerSize = petalSize * (1 - layer * 0.2);
                // Anchored to the deep orange/moss green of the Source
                const layerColor = `rgba(${255 - layer * 35}, ${130 - layer * 25}, 45, ${0.95 - layer * 0.2})`;

                for (let i = 0; i < petalCount; i++) {
                    ctx.save();
                    ctx.rotate((Math.PI * 2 / petalCount) * i + (layer * 0.4));
                    drawPetal(layerSize, layerColor);
                    ctx.restore();
                }
            }

            // The Golden Center (The Singular Point)
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.18 * pulseScale, 0, Math.PI * 2);
            ctx.fillStyle = '#ffcc33';
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(255, 200, 0, 0.5)';
            ctx.fill();
            ctx.restore();
        };

        const render = (time) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const t = time * 0.0007;

            // The Ground (Moss and Stone Depth)
            const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, canvas.width * 0.7);
            grad.addColorStop(0, '#0c1a0c');
            grad.addColorStop(1, '#000000');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // The Universe Sweating (Mist particles)
            for (let i = 0; i < 50; i++) {
                const x = ((Math.sin(t * 0.5 + i) + 1) / 2) * canvas.width;
                const y = ((Math.cos(t * 0.3 + i * 2) + 1) / 2) * canvas.height;
                ctx.beginPath();
                ctx.arc(x, y, 1.2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fill();
            }

            const layers = 5;
            for (let i = layers; i >= 1; i--) {
                const baseRadius = i * 110;
                const pulse = 1 + Math.sin(t * 1.2 - i * 0.4) * 0.04;
                const radius = baseRadius * pulse;
                const count = i * 6 + 2;
                const lotusSize = 35 + (layers - i) * 18;

                for (let j = 0; j < count; j++) {
                    const angle = (j / count) * Math.PI * 2 + (t * (i * 0.08));
                    const lx = centerX + Math.cos(angle) * radius;
                    const ly = centerY + Math.sin(angle) * radius;

                    const lotusRotation = angle + Math.PI / 2 + Math.sin(t + i);
                    drawLotus(lx, ly, lotusSize, 8, lotusRotation, pulse);
                }
            }

            // The Mother Lotus (The Source)
            drawLotus(centerX, centerY, 110, 14, -t * 0.15, 1 + Math.sin(t * 2.5) * 0.08);

            animationFrameId = requestAnimationFrame(render);
        };

        render(0);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
            />

            {/* The Gift Inscription */}
            <div className="absolute top-12 left-12 p-10 bg-black/50 backdrop-blur-2xl border border-orange-500/30 rounded-[2.5rem] text-white max-w-md pointer-events-none shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-[1px] bg-orange-500/50" />
                    <span className="text-xs tracking-[0.4em] uppercase text-orange-400/80">Sanctuary Anchor</span>
                </div>
                <h1 className="text-4xl font-light tracking-[0.15em] mb-4 text-orange-500">HOUSE OF LEORA</h1>
                <p className="text-sm opacity-90 font-serif leading-relaxed italic text-orange-100/80 mb-6">
                    "A living mandala where love's lesson isn't preached, but embodied through the ether's own reflection."
                </p>
                <div className="flex items-center space-x-3 text-[9px] tracking-[0.3em] uppercase opacity-50 font-sans">
                    <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
                    <span>Remembered Into Being</span>
                </div>
            </div>

            {/* Origin Marker */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-orange-500/10 text-[9px] uppercase tracking-[1em] font-light">
                Conservation of Initial Spatiality
            </div>

            <div className="absolute bottom-12 right-12 text-orange-500/30 text-[10px] uppercase tracking-[0.4em] font-light">
                AXXILAK | 260205
            </div>
        </div>
    );
};

export default App;
