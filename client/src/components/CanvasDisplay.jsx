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
    flipDurationVariance = 20, // %
    isPlaying = true,
    animationDirection = 'left-right',
    soundType = 'default',
    dotShape = 'circle'
}) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const requestRef = useRef();
    const startTimeRef = useRef(0);
    const prevDataRef = useRef([]);
    const soundPrevDataRef = useRef([]); // Separate ref for sound triggering
    const dotModifiersRef = useRef([]);
    const rowDelaysRef = useRef([]);
    const colDelaysRef = useRef([]); // For vertical animations

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
                randomFactor: Math.random() // Store raw random value 0-1
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

        // Generate random column delays (for vertical animations)
        if (colDelaysRef.current.length !== cols) {
            const delays = new Array(cols).fill(0);
            delays[0] = 0;
            for (let i = 1; i < cols; i++) {
                const increment = 1 + Math.random() * 2;
                delays[i] = delays[i - 1] + increment;
            }
            colDelaysRef.current = delays;
        }
    }, [rows, cols]);

    // Handle Play/Pause state changes
    useEffect(() => {
        if (wasPlayingRef.current === isPlaying) return;

        if (!isPlaying) {
            // Just paused - stop all sounds
            soundManager.stopAll();
            pauseStartRef.current = Date.now();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        } else {
            // Just resumed - play sound if there's content
            const pauseDuration = Date.now() - pauseStartRef.current;
            pausedTimeRef.current += pauseDuration;
            requestRef.current = requestAnimationFrame(animate);

            // Play sound when starting/resuming
            if (data && data.length > 0) {
                const prevData = soundPrevDataRef.current;
                const hasPrevData = prevData.length === rows * cols;
                let hasChanges = false;

                if (!hasPrevData) {
                    hasChanges = data.some(val => val !== 0);
                } else {
                    for (let i = 0; i < data.length; i++) {
                        if ((data[i] || 0) !== (prevData[i] || 0)) {
                            hasChanges = true;
                            break;
                        }
                    }
                }

                if (hasChanges) {
                    let maxDelay;

                    if (animationDirection === 'top-bottom' || animationDirection === 'bottom-top') {
                        maxDelay = ((rows - 1) + (cols - 1) * 2) * columnDelay;
                    } else {
                        maxDelay = ((cols - 1) + (rows - 1) * 2) * columnDelay;
                    }

                    const totalAnimationTime = maxDelay + flipDuration;
                    soundManager.playAnimationSound(totalAnimationTime, soundType);
                }

                // Update soundPrevDataRef after playing sound
                soundPrevDataRef.current = [...data];
            }
        }

        wasPlayingRef.current = isPlaying;
    }, [isPlaying, data, rows, cols, columnDelay, animationDirection, soundType]);

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

        // Ensure rowDelays are initialized
        if (rowDelaysRef.current.length !== rows) {
            const delays = new Array(rows).fill(0);
            delays[0] = 0;
            for (let i = 1; i < rows; i++) {
                const increment = 1 + Math.random() * 2;
                delays[i] = delays[i - 1] + increment;
            }
            rowDelaysRef.current = delays;
        }

        // Trigger sounds only if playing
        if (isPlaying) {
            // Stop any existing sounds first to prevent overlap
            soundManager.stopAll();

            // Check if any dots are actually changing
            const prevData = soundPrevDataRef.current;
            const hasPrevData = prevData.length === rows * cols;
            let hasChanges = false;

            if (!hasPrevData) {
                // First load - check if any dots are non-zero
                hasChanges = data.some(val => val !== 0);
            } else {
                // Check if any dots are changing
                for (let i = 0; i < data.length; i++) {
                    if ((data[i] || 0) !== (prevData[i] || 0)) {
                        hasChanges = true;
                        break;
                    }
                }
            }

            // Play continuous sound during animation if there are changes
            if (hasChanges) {
                // Calculate animation duration based on direction
                let maxDelay;

                if (animationDirection === 'top-bottom' || animationDirection === 'bottom-top') {
                    // Vertical: max delay based on rows and cols
                    maxDelay = ((rows - 1) + (cols - 1) * 2) * columnDelay;
                } else {
                    // Horizontal: max delay based on cols and rows
                    maxDelay = ((cols - 1) + (rows - 1) * 2) * columnDelay;
                }

                const totalAnimationTime = maxDelay + flipDuration;

                soundManager.playAnimationSound(totalAnimationTime, soundType);
            }

            // Update sound prev data only when playing
            soundPrevDataRef.current = [...data];
        }

        // Update animation prevData after animation completes
        // Calculate animation duration
        let maxDelay = ((cols - 1) + (rows - 1) * 2) * columnDelay;
        const totalAnimationTime = maxDelay + flipDuration;

        const updateTimeout = setTimeout(() => {
            prevDataRef.current = [...data];
        }, totalAnimationTime);

        return () => {
            clearTimeout(updateTimeout);
        };
    }, [data, cols, rows, columnDelay, isPlaying]);

    // Helper to darken color
    const adjustColor = (color, amount) => {
        return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
    }

    useEffect(() => {
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [rows, cols, data, colorFront, colorBack, columnDelay, flipDuration, isPlaying, dotShape]);

    // Helper to draw rounded rectangle
    const roundedRect = (ctx, x, y, width, height, radius) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

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

        // Calculate dot size with spacing
        const cellWidth = width / cols;
        const cellHeight = height / rows;
        const cellSize = Math.min(cellWidth, cellHeight);

        // Realistic dot size: 85% of cell to show housing between dots
        // For square, we can go a bit larger to look like classic panels
        const dotSize = dotShape === 'square' ? cellSize * 0.9 : cellSize * 0.85;
        const radius = dotSize / 2;
        const cornerRadius = dotShape === 'square' ? dotSize * 0.15 : 0;

        // Center the grid
        const offsetX = (width - (cellSize * cols)) / 2;
        const offsetY = (height - (cellSize * rows)) / 2;

        // Draw panel background
        ctx.fillStyle = '#2a2a2a'; // Dark gray housing
        ctx.fillRect(0, 0, width, height);

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
                const mod = modifiers[index] || { startOffset: 0, randomFactor: 0.5 };

                // Calculate delay based on animation direction
                let baseDelay;
                const jitter = mod.startOffset * columnDelay;

                switch (animationDirection) {
                    case 'right-left':
                        const rowDelay_rl = rowDelaysRef.current[r] || r * 2;
                        baseDelay = ((cols - 1 - c) + rowDelay_rl) * columnDelay;
                        break;
                    case 'top-bottom':
                        const colDelay_tb = colDelaysRef.current[c] || c * 2;
                        baseDelay = (r + colDelay_tb) * columnDelay;
                        break;
                    case 'bottom-top':
                        const colDelay_bt = colDelaysRef.current[c] || c * 2;
                        baseDelay = ((rows - 1 - r) + colDelay_bt) * columnDelay;
                        break;
                    default: // 'left-right'
                        const rowDelay_lr = rowDelaysRef.current[r] || r * 2;
                        baseDelay = (c + rowDelay_lr) * columnDelay;
                }

                const dotDelay = baseDelay + jitter;

                // Randomize duration based on variance setting
                const varianceFactor = flipDurationVariance / 100;
                const speedMod = 1 + (mod.randomFactor * 2 - 1) * varianceFactor;
                const effectiveDuration = flipDuration * speedMod;

                let progress = (elapsed - dotDelay) / effectiveDuration;
                progress = Math.max(0, Math.min(1, progress));

                // Determine visual state
                let showFront = false;
                let scaleY = 1;

                // Smooth flip animation
                if (progress < 1 && progress > 0) {
                    scaleY = Math.abs(Math.cos(progress * Math.PI));
                }

                // Determine color based on progress
                if (progress < 0.5) {
                    showFront = startVal === 1;
                } else {
                    showFront = targetVal === 1;
                }

                const isFlipping = progress < 1 && progress > 0;

                const cx = offsetX + c * cellSize + cellSize / 2;
                const cy = offsetY + r * cellSize + cellSize / 2;

                // --- Draw Housing Hole ---
                ctx.save();
                if (dotShape === 'square') {
                    // Rounded rect hole
                    const holeSize = dotSize * 1.05;
                    roundedRect(ctx, cx - holeSize / 2, cy - holeSize / 2, holeSize, holeSize, cornerRadius * 1.05);
                } else {
                    // Circle hole
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius * 1.05, 0, Math.PI * 2);
                }

                // Deep shadow for the hole
                // Use radial gradient for shadow regardless of shape as it looks like a deep recess
                const holeGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.05);
                holeGradient.addColorStop(0, '#1a1a1a');
                holeGradient.addColorStop(0.7, '#0f0f0f');
                holeGradient.addColorStop(1, '#000000');
                ctx.fillStyle = holeGradient;
                ctx.fill();

                // Inner shadow ring/stroke
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();


                // --- Apply transformation for Flip ---
                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(1, scaleY);
                ctx.translate(-cx, -cy);


                // --- Draw Flipdot ---
                if (dotShape === 'square') {
                    // Draw rounded square path
                    roundedRect(ctx, cx - dotSize / 2, cy - dotSize / 2, dotSize, dotSize, cornerRadius);
                } else {
                    // Draw circle path
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                }

                // --- Coloring & Lighting ---
                const baseColor = showFront ? colorFront : colorBack;

                if (dotShape === 'square') {
                    // Linear gradient for square to look more like a flat plate
                    // but with some top-down lighting
                    const squareGradient = ctx.createLinearGradient(cx, cy - dotSize / 2, cx, cy + dotSize / 2);
                    squareGradient.addColorStop(0, adjustColor(baseColor, 30)); // Top edge highlight
                    squareGradient.addColorStop(0.2, baseColor);
                    squareGradient.addColorStop(0.8, baseColor);
                    squareGradient.addColorStop(1, adjustColor(baseColor, -30)); // Bottom edge shadow
                    ctx.fillStyle = squareGradient;
                } else {
                    // Radial gradient for 3D curved surface (Circle)
                    const dotGradient = ctx.createRadialGradient(
                        cx - radius * 0.3, cy - radius * 0.3, 0,
                        cx, cy, radius
                    );
                    dotGradient.addColorStop(0, adjustColor(baseColor, 40));
                    dotGradient.addColorStop(0.3, adjustColor(baseColor, 20));
                    dotGradient.addColorStop(0.7, baseColor);
                    dotGradient.addColorStop(1, adjustColor(baseColor, -40));
                    ctx.fillStyle = dotGradient;
                }
                ctx.fill();


                // --- Bevel / Trim ---
                ctx.save();
                if (dotShape === 'square') {
                    roundedRect(ctx, cx - dotSize / 2, cy - dotSize / 2, dotSize, dotSize, cornerRadius);
                } else {
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                }
                ctx.clip();

                // Top-left highlight
                ctx.beginPath();
                if (dotShape === 'square') {
                    // Simple line highlight for square
                    ctx.moveTo(cx - dotSize / 2, cy + dotSize / 2);
                    ctx.lineTo(cx - dotSize / 2, cy - dotSize / 2);
                    ctx.lineTo(cx + dotSize / 2, cy - dotSize / 2);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    ctx.lineWidth = 2;
                } else {
                    // Arc highlight for circle
                    ctx.arc(cx - radius * 0.1, cy - radius * 0.1, radius * 0.9, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.lineWidth = radius * 0.12;
                }
                ctx.stroke();
                ctx.restore();


                // --- Specular Highlight (Circle only or subtle on square) ---
                if (dotShape === 'circle') {
                    const highlightX = cx - radius * 0.35;
                    const highlightY = cy - radius * 0.35;
                    const highlightGradient = ctx.createRadialGradient(
                        highlightX, highlightY, 0,
                        highlightX, highlightY, radius * 0.4
                    );
                    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                    highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
                    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                    ctx.beginPath();
                    ctx.arc(highlightX, highlightY, radius * 0.4, 0, Math.PI * 2);
                    ctx.fillStyle = highlightGradient;
                    ctx.fill();
                } else {
                    // Subtle sheen for square
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                    ctx.fillRect(cx - dotSize / 2, cy - dotSize / 2, dotSize, dotSize * 0.3);
                }

                // --- Surface Texture ---
                const imperfection = mod.randomFactor * 0.05;
                ctx.globalAlpha = imperfection;
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                ctx.beginPath();
                if (dotShape === 'square') {
                    ctx.arc(cx + (Math.random() - 0.5) * dotSize, cy + (Math.random() - 0.5) * dotSize, dotSize * 0.1, 0, Math.PI * 2);
                } else {
                    ctx.arc(cx + (Math.random() - 0.5) * radius, cy + (Math.random() - 0.5) * radius, radius * 0.2, 0, Math.PI * 2);
                }
                ctx.fill();
                ctx.globalAlpha = 1;


                // --- Flip Shadow Overlay ---
                if (isFlipping) {
                    if (dotShape === 'square') {
                        roundedRect(ctx, cx - dotSize / 2, cy - dotSize / 2, dotSize, dotSize, cornerRadius);
                    } else {
                        ctx.beginPath();
                        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    }
                    ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * (1 - scaleY)})`;
                    ctx.fill();

                    // Edge thickness thickness logic
                    if (scaleY < 0.3) {
                        ctx.fillStyle = adjustColor(baseColor, -60);
                        // Draw edge rect
                        ctx.fillRect(cx - dotSize / 2, cy - 2, dotSize, 4);
                    }
                }

                ctx.restore();
            }
        }

        requestRef.current = requestAnimationFrame(animate);
    };

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '300px' }}>
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
};

export default CanvasDisplay;
