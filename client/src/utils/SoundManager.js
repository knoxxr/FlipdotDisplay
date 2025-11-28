class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.buffers = {};
    }

    // Explicitly resume audio context (must be called on user interaction)
    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Generate a realistic mechanical flipdot sound
    playClick(time = 0, volume = 0.1) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const source = this.ctx.createBufferSource();
        source.buffer = this.createClickBuffer();

        // Randomize playback rate slightly for "organic" feel
        // Large displays have slight variances in motor speed/tension
        source.playbackRate.value = 0.9 + Math.random() * 0.2;

        const gainNode = this.ctx.createGain();
        gainNode.gain.value = volume;

        // Lowpass filter to dampen the harshness
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000 + Math.random() * 1000; // Vary tone slightly

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        source.start(this.ctx.currentTime + time);
    }

    // Play a "wave" of clicks
    playColumnFlip(delayMs, count) {
        // For a large display sound, we want a "rain" effect.
        // We can play multiple clicks with slight random offsets to simulate the column not flipping perfectly instantly.
        // But for performance, one "fat" click per column (or slightly randomized) is good.
        // Let's add a tiny random jitter to the start time to make it less robotic.
        const jitter = (Math.random() * 0.01);
        this.playClick((delayMs / 1000) + jitter, 0.15);
    }
}

export const soundManager = new SoundManager();
