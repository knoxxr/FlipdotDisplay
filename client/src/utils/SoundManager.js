class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.buffers = {};
    }

    // Generate a short mechanical click sound
    createClickBuffer() {
        if (this.buffers.click) return this.buffers.click;

        const duration = 0.05; // 50ms
        const sampleRate = this.ctx.sampleRate;
        const frameCount = sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < frameCount; i++) {
            // White noise with exponential decay
            data[i] = (Math.random() * 2 - 1) * Math.exp(-5 * i / frameCount);
        }

        this.buffers.click = buffer;
        return buffer;
    }

    playClick(time = 0, volume = 0.1) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const source = this.ctx.createBufferSource();
        source.buffer = this.createClickBuffer();

        const gainNode = this.ctx.createGain();
        gainNode.gain.value = volume;

        // Lowpass filter to make it sound more "plastic/mechanical"
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        source.start(this.ctx.currentTime + time);
    }

    // Play a "wave" of clicks
    playColumnFlip(delayMs, count) {
        // Limit the number of simultaneous sounds to avoid distortion/lag
        // We play one sound per column, but maybe vary the pitch slightly?
        // Actually, just one click per column is enough to simulate the "rrrrrr" sound.
        this.playClick(delayMs / 1000, 0.05);
    }
}

export const soundManager = new SoundManager();
