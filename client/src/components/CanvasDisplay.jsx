import React, { useRef, useEffect } from 'react';
import { soundManager } from '../utils/SoundManager';

const CanvasDisplay = ({
    rows,
    cols,
    data,
    colorFront,
    colorBack,
    columnDelay = 20,
    flipDuration = 300, // ms
    isPlaying = true
}) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const requestRef = useRef();
    const startTimeRef = useRef(0);
    const prevDataRef = useRef([]);
    const dotModifiersRef = useRef([]);
    const rowDelaysRef = useRef([]);

    // Pause handling
    const pausedTimeRef = useRef(0); // Total time spent paused
    const pauseStartRef = useRef(0); // Timestamp when pause started
    const wasPlayingRef = useRef(isPlaying);

    // Initialize prevData and modifiers
    useEffect(() => {
        if (prevDataRef.current.length !== rows * cols) {
            prevDataRef.current = new Array(rows * cols).fill(0);
        }
        // Generate random modifiers for each dot to simulate mechanical variance
        // startOffset: ±20% of columnDelay (jitter) -> range [-0.2, 0.2]
        // speedMod: ±20% of flipDuration (motor speed variance) -> range [0.8, 1.2]
        if (dotModifiersRef.current.length !== rows * cols) {
            dotModifiersRef.current = new Array(rows * cols).fill(0).map(() => ({
                startOffset: (Math.random() * 0.4 - 0.2),
                speedMod: 0.8 + Math.random() * 0.4
            }));
        }

        // Generate random row delays
        // User wants (n+1, 1) to start between (n, 2) and (n, 4)
        // This means the increment per row should be random between 1 and 3.
        if (rowDelaysRef.current.length !== rows) {
            const delays = new Array(rows).fill(0);
            delays[0] = 0;
            for (let i = 1; i < rows; i++) {
                // Random increment between 1 and 3
                const increment = 1 + Math.random() * 2;
                delays[i] = delays[i - 1] + increment;
            }
            rowDelaysRef.current = delays;
        }
    }, [rows, cols]);

    // Handle Play/Pause state changes
    useEffect(() => {
        if (wasPlayingRef.current === isPlaying) return;

        if (!isPlaying) {
            // Just paused
            pauseStartRef.current = Date.now();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        } else {
            // Just resumed
            const pauseDuration = Date.now() - pauseStartRef.current;
            pausedTimeRef.current += pauseDuration;
            requestRef.current = requestAnimationFrame(animate);
        }

        wasPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // Handle data update
    useEffect(() => {
        if (!data || data.length === 0) return;

        // Reset animation state on new data
        startTimeRef.current = Date.now();
        pausedTimeRef.current = 0;
        pauseStartRef.current = 0;

        // Ensure modifiers exist (in case of resize)
        if (dotModifiersRef.current.length !== rows * cols) {
            dotModifiersRef.current = new Array(rows * cols).fill(0).map(() => ({
                startOffset: (Math.random() * 0.4 - 0.2),
                speedMod: 0.8 + Math.random() * 0.4
            }));
        }

        // Trigger sounds only if playing (or should we trigger anyway? usually yes, but if paused immediately?)
        // If data changes, we assume we want to play the sound.
        // But if we are PAUSED when data changes (e.g. manual next), maybe we shouldn't?
        // For now, let's play sound.

        // The animation follows a diagonal wave: delay = (c + r * 2) * columnDelay
        // Max delay is roughly (cols + rows * 2) * columnDelay
        const maxWaveIndex = cols + rows * 2;
        for (let i = 0; i < maxWaveIndex; i++) {
            soundManager.playColumnFlip(i * columnDelay);
        }

        return () => {
            prevDataRef.current = data;
        };
    }, [data, cols, rows, columnDelay]);

    const animate = () => {
        if (!isPlaying) return; // Don't run loop if paused

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');

        // Handle resizing
        const { clientWidth, clientHeight } = container;
        if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
            canvas.width = clientWidth;
            canvas.height = clientHeight;
        }

        const width = canvas.width;
        const height = canvas.height;

        // Calculate dot size
        const dotWidth = width / cols;
        const dotHeight = height / rows;
        const size = Math.min(dotWidth, dotHeight);

        // Center the grid
        const offsetX = (width - (size * cols)) / 2;
        const offsetY = (height - (size * rows)) / 2;

        ctx.clearRect(0, 0, width, height);

        const now = Date.now();
        // Adjusted elapsed time: subtract total paused time
        const elapsed = now - startTimeRef.current - pausedTimeRef.current;

        const currentData = data || [];
        const prevData = prevDataRef.current;
        const modifiers = dotModifiersRef.current;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const index = r * cols + c;
                const targetVal = currentData[index] || 0;
                const startVal = prevData[index] || 0;
                const mod = modifiers[index] || { startOffset: 0, speedMod: 1 };

                // Diagonal wave delay: (col + rowDelay) * delay
                // Add random jitter: ±20% of the *interval* (columnDelay)
                const rowDelay = rowDelaysRef.current[r] || r * 2;
                const baseDelay = (c + rowDelay) * columnDelay;
                const jitter = mod.startOffset * columnDelay;
                const dotDelay = baseDelay + jitter;

                // Randomize duration: ±20%
                const effectiveDuration = flipDuration * mod.speedMod;

                let progress = (elapsed - dotDelay) / effectiveDuration;
                progress = Math.max(0, Math.min(1, progress));

                // Determine visual state
                let showFront = false;
                let scaleY = 1;

                // Always animate scaleY if in progress (creates the wave effect)
                if (progress < 1 && progress > 0) {
                    scaleY = Math.abs(Math.cos(progress * Math.PI));
                }

                // Determine color based on progress
                if (progress < 0.5) {
                    showFront = startVal === 1;
                } else {
                    showFront = targetVal === 1;
                }

                // Flag for shading
                let isFlipping = progress < 1 && progress > 0;

                const cx = offsetX + c * size + size / 2;
                const cy = offsetY + r * size + size / 2;

                // Shape parameters
                const dotSize = size * 0.9;
                const w = dotSize;
                const h = dotSize;
                const x = cx - w / 2;
                const y = cy - h / 2;
                const cornerRadius = w * 0.15;
                const notchRadius = w * 0.15;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(1, scaleY);
                ctx.translate(-cx, -cy); // Move back to draw in world coords but scaled around center

                // Helper to draw the shape path
                const drawShape = () => {
                    const right = x + w;
                    const bottom = y + h;
                    const centerY = y + h / 2;

                    ctx.beginPath();
                    ctx.moveTo(x + cornerRadius, y);
                    ctx.lineTo(right - cornerRadius, y);
                    ctx.quadraticCurveTo(right, y, right, y + cornerRadius);

                    // Right side with notch
                    ctx.lineTo(right, centerY - notchRadius);
                    ctx.arc(right, centerY, notchRadius, -Math.PI / 2, Math.PI / 2, true); // Inward notch
                    ctx.lineTo(right, bottom - cornerRadius);

                    ctx.quadraticCurveTo(right, bottom, right - cornerRadius, bottom);
                    ctx.lineTo(x + cornerRadius, bottom);
                    ctx.quadraticCurveTo(x, bottom, x, bottom - cornerRadius);
                    ctx.lineTo(x, y + cornerRadius);
                    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
                    ctx.closePath();
                };

                // Draw hole background (shadow)
                drawShape();
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fill();

                // Main Dot
                drawShape();

                // Gradient for 3D curvature (adjusted for rect)
                // Use a linear gradient for a more "flat plastic" look or radial for slight curve
                const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
                const baseColor = showFront ? colorFront : colorBack;
                gradient.addColorStop(0, baseColor);
                gradient.addColorStop(1, adjustColor(baseColor, -30));

                ctx.fillStyle = gradient;
                ctx.fill();

                // Specular highlight (subtle top-left shine)
                ctx.beginPath();
                ctx.ellipse(x + w * 0.25, y + h * 0.25, w * 0.15, h * 0.1, Math.PI / 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fill();

                // Simple shading for flip animation
                if (isFlipping) {
                    drawShape();
                    ctx.fillStyle = `rgba(0,0,0,${0.3 * (1 - scaleY)})`;
                    ctx.fill();
                }

                ctx.restore();
            }
        }

        requestRef.current = requestAnimationFrame(animate);
    };

    // Helper to darken color
    const adjustColor = (color, amount) => {
        return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
    }

    useEffect(() => {
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [rows, cols, data, colorFront, colorBack, columnDelay, flipDuration, isPlaying]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '300px' }}>
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
};

export default CanvasDisplay;
