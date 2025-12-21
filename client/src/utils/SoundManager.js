class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.buffers = {};
        this.activeSources = []; // Track active sound sources
    }

    // Explicitly resume audio context (must be called on user interaction)
    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Generate a realistic mechanical flipdot sound
    createClickBuffer(soundType = 'default') {
        const bufferKey = `click_${soundType}`;
        if (this.buffers[bufferKey]) return this.buffers[bufferKey];

        const duration = 0.1; // 0.1 second duration
        const sampleRate = this.ctx.sampleRate;
        const frameCount = sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);

        // Sound profile based on type
        let freq1, freq2, clickDecay, resonanceDecay, volume;

        switch (soundType) {
            case 'deep':
                // Low-pitched, bass-heavy
                freq1 = 200;
                freq2 = 400;
                clickDecay = 300;
                resonanceDecay = 80;
                volume = 0.3;
                break;
            case 'metallic':
                // Mid-high, harsh/bright
                freq1 = 600;
                freq2 = 1200;
                clickDecay = 600;
                resonanceDecay = 120;
                volume = 0.25;
                break;
            case 'soft':
                // Very light, muted
                freq1 = 1000;
                freq2 = 2000;
                clickDecay = 400;
                resonanceDecay = 100;
                volume = 0.15;
                break;
            case 'sharp':
                // Very high, crisp
                freq1 = 1200;
                freq2 = 2400;
                clickDecay = 700;
                resonanceDecay = 150;
                volume = 0.2;
                break;
            default: // 'default'
                // High-pitched, light (current)
                freq1 = 800;
                freq2 = 1600;
                clickDecay = 500;
                resonanceDecay = 100;
                volume = 0.2;
        }

        for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;

            // Sharp "Click"
            const noise = (Math.random() * 2 - 1);
            const clickEnvelope = Math.exp(-t * clickDecay);

            // Resonance
            const resonance1 = Math.sin(2 * Math.PI * freq1 * t) * Math.exp(-t * resonanceDecay);
            const resonance2 = Math.sin(2 * Math.PI * freq2 * t) * Math.exp(-t * (resonanceDecay + 20));

            // Minimal Rattle
            const rattle = (Math.random() * 2 - 1) * Math.exp(-t * 150) * 0.1;

            // Combine
            data[i] = (noise * clickEnvelope * 1.0) + ((resonance1 + resonance2) * volume) + rattle;
        }

        this.buffers[bufferKey] = buffer;
        return buffer;
    }

    playClick(time = 0, volume = 0.1) {
        if (this.ctx.state === 'suspended') {
            try {
                this.ctx.resume();
            } catch (e) { }
        }

        if (this.ctx.state === 'suspended') return;

        const source = this.ctx.createBufferSource();
        source.buffer = this.createClickBuffer();

        // Randomize playback rate slightly for "organic" feel
        // Large displays have slight variances in motor speed/tension
        source.playbackRate.value = 1.0 + Math.random() * 0.3; // Faster playback for snappier sound

        const gainNode = this.ctx.createGain();
        gainNode.gain.value = volume;

        // Lowpass filter to dampen the harshness
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000 + Math.random() * 1000; // Vary tone slightly

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        // Track this source so we can stop it if needed
        this.activeSources.push(source);

        // Remove from active sources when it ends
        source.onended = () => {
            const index = this.activeSources.indexOf(source);
            if (index > -1) {
                this.activeSources.splice(index, 1);
            }
        };

        source.start(this.ctx.currentTime + time);
    }

    // Play a "wave" of clicks
    playColumnFlip(delayMs, count) {
        // For a large display sound, we want a "rain" effect.
        // We can play multiple clicks with slight random offsets to simulate the column not flipping perfectly instantly.
        // But for performance, one "fat" click per column (or slightly randomized) is good.
        // Let's add a tiny random jitter to the start time to make it less robotic.
        const jitter = (Math.random() * 0.01);
        this.playClick((delayMs / 1000) + jitter, 0.08); // Lower volume to prevent clipping when many play together
    }

    // Play continuous sound during animation
    async playAnimationSound(durationMs, soundType = 'default') {
        if (this.ctx.state === 'suspended') {
            try {
                await this.ctx.resume();
            } catch (e) {
                // Ignore resume error
            }
        }

        // If still suspended (no user interaction yet), don't try to play
        if (this.ctx.state === 'suspended') {
            return;
        }

        // Stop any existing animation sound
        this.stopAnimationSound();

        // Create multiple sources for richer sound
        const numSources = 20; // Number of simultaneous sound sources
        this.animationSources = [];

        for (let i = 0; i < numSources; i++) {
            const source = this.ctx.createBufferSource();
            source.buffer = this.createClickBuffer(soundType);
            source.loop = true;

            // Randomize playback rate for each source (pitch variation)
            source.playbackRate.value = 0.9 + Math.random() * 0.4;

            const gainNode = this.ctx.createGain();
            gainNode.gain.value = 0.08 / Math.sqrt(numSources); // Scale volume by number of sources

            // Add panning for stereo effect
            const panNode = this.ctx.createStereoPanner();
            panNode.pan.value = (Math.random() * 2 - 1) * 0.5; // Random pan between -0.5 and 0.5

            source.connect(gainNode);
            gainNode.connect(panNode);
            panNode.connect(this.ctx.destination);

            // Start each source with slight random delay for cascading effect
            const startDelay = Math.random() * 0.02; // 0-20ms random delay
            source.start(this.ctx.currentTime + startDelay);

            this.animationSources.push({ source, gainNode });
        }

        // Auto-stop after duration
        this.animationTimeout = setTimeout(() => {
            this.stopAnimationSound();
        }, durationMs);
    }

    // Stop animation sound
    stopAnimationSound() {
        if (this.animationSources && this.animationSources.length > 0) {
            this.animationSources.forEach(({ source, gainNode }) => {
                try {
                    // Fade out to avoid clicks
                    gainNode.gain.exponentialRampToValueAtTime(
                        0.001,
                        this.ctx.currentTime + 0.05
                    );

                    source.stop(this.ctx.currentTime + 0.05);
                } catch (e) {
                    // Already stopped
                }
            });
            this.animationSources = [];
        }

        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
    }

    // Stop all currently playing and scheduled sounds
    stopAll() {
        // Stop and disconnect all active sources
        this.activeSources.forEach(source => {
            try {
                source.stop();
                source.disconnect();
            } catch (e) {
                // Source may have already stopped, ignore error
            }
        });
        this.activeSources = [];

        // Also stop animation sound
        this.stopAnimationSound();
    }
}

export const soundManager = new SoundManager();
