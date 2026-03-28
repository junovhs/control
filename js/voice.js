// ============================================================
// AETHERBODY - Voice (Core Synthesis Engine)
// ============================================================

import { state, NUM_RESONATORS } from './state.js';
import { presets } from './presets.js';

export class Voice {
    constructor(freq, velocity) {
        const ctx = state.ctx;
        const preset = presets[state.currentPreset];

        this.freq = freq;
        this.alive = true;
        this.startTime = ctx.currentTime;
        this.releasing = false;

        // Output
        this.output = ctx.createGain();
        this.output.gain.value = 0;
        this.output.connect(state.masterGain);

        // Stereo panner for width
        this.panner = ctx.createStereoPanner();
        this.panner.pan.value = (Math.random() - 0.5) * state.macros.space * 0.6;
        this.panner.connect(this.output);

        // Resonator bank
        this.resonators = [];
        this.resonatorGains = [];

        const bodyGain = state.macros.body;
        const brightness = state.macros.brightness;
        const material = state.macros.material;
        const bloom = state.macros.bloom;

        for (let i = 0; i < NUM_RESONATORS; i++) {
            let ratio = preset.harmonicRatios[i];
            const inharmonicAmount = material * preset.inharmonicShift * i;
            ratio = ratio * (1 + inharmonicAmount);

            const resFreq = freq * ratio;
            if (resFreq > ctx.sampleRate / 2 - 100) continue;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = resFreq;

            const baseQ = 20 + bloom * 180;
            const bandBrightness = Math.pow(brightness, 0.5 + i * 0.08);
            filter.Q.value = baseQ * bandBrightness;

            const gain = ctx.createGain();
            const bandAmp = Math.pow(bandBrightness, 1.5) / (1 + i * 0.15 * (1 - brightness));
            gain.gain.value = bandAmp * bodyGain * 0.15;

            filter.connect(gain);
            gain.connect(this.panner);

            this.resonators.push(filter);
            this.resonatorGains.push(gain);
        }

        // Apply excitation
        this.excite(velocity, preset);

        // Fade in
        this.output.gain.setValueAtTime(0, ctx.currentTime);
        this.output.gain.linearRampToValueAtTime(0.3 + velocity * 0.4, ctx.currentTime + 0.005);

        // Sustained exciter for pressure mode
        this.sustainedSource = null;
        if (state.macros.pressure > 0.05) {
            this.startSustainedExciter();
        }
    }

    excite(velocity, preset) {
        const ctx = state.ctx;
        const strike = state.macros.strike;
        const exciterType = preset.exciterType;
        const now = ctx.currentTime;

        if (exciterType === 'noise' || exciterType === 'sustained') {
            const duration = 0.01 + (1 - strike) * 0.04;
            const bufferSize = Math.ceil(ctx.sampleRate * duration);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                const env = Math.exp(-i / (bufferSize * (0.1 + strike * 0.4)));
                data[i] = (Math.random() * 2 - 1) * env * velocity;
            }

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            for (const res of this.resonators) {
                source.connect(res);
            }
            source.start(now);
        } else if (exciterType === 'click') {
            const bufferSize = Math.ceil(ctx.sampleRate * 0.005);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                const t = i / bufferSize;
                data[i] = Math.sin(t * Math.PI * 50 * strike) * Math.exp(-t * 20) * velocity * (1 + strike);
            }

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            for (const res of this.resonators) {
                source.connect(res);
            }
            source.start(now);
        } else if (exciterType === 'pulse') {
            const duration = 0.015;
            const bufferSize = Math.ceil(ctx.sampleRate * duration);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            const pulseFreq = this.freq;

            for (let i = 0; i < bufferSize; i++) {
                const t = i / ctx.sampleRate;
                const env = Math.exp(-t * 100 * strike);
                data[i] = (Math.sin(2 * Math.PI * pulseFreq * t) > 0 ? 1 : -1) * env * velocity * 0.7;
                if (i < 40) data[i] += (Math.random() * 2 - 1) * velocity * strike;
            }

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            for (const res of this.resonators) {
                source.connect(res);
            }
            source.start(now);
        } else if (exciterType === 'chaos') {
            const duration = 0.02 + (1 - strike) * 0.03;
            const bufferSize = Math.ceil(ctx.sampleRate * duration);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            let chaosState = 0.1 + Math.random() * 0.8;

            for (let i = 0; i < bufferSize; i++) {
                chaosState = 3.99 * chaosState * (1 - chaosState);
                const env = Math.exp(-i / (bufferSize * 0.3));
                data[i] = (chaosState * 2 - 1) * env * velocity;
            }

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            for (const res of this.resonators) {
                source.connect(res);
            }
            source.start(now);
        }
    }

    startSustainedExciter() {
        const ctx = state.ctx;
        const pressure = state.macros.pressure;

        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.3;
        }

        this.sustainedSource = ctx.createBufferSource();
        this.sustainedSource.buffer = buffer;
        this.sustainedSource.loop = true;

        this.sustainedGain = ctx.createGain();
        this.sustainedGain.gain.value = pressure * 0.15;

        this.sustainedSource.connect(this.sustainedGain);
        for (const res of this.resonators) {
            this.sustainedGain.connect(res);
        }

        this.sustainedSource.start();
    }

    updatePressure(pressure) {
        if (this.sustainedGain) {
            this.sustainedGain.gain.linearRampToValueAtTime(
                pressure * 0.15,
                state.ctx.currentTime + 0.05,
            );
        } else if (pressure > 0.05 && !this.releasing) {
            this.startSustainedExciter();
        }
    }

    reExcite(velocity) {
        const preset = presets[state.currentPreset];
        this.excite(velocity, preset);
        const ctx = state.ctx;
        this.output.gain.cancelScheduledValues(ctx.currentTime);
        this.output.gain.setValueAtTime(this.output.gain.value, ctx.currentTime);
        this.output.gain.linearRampToValueAtTime(0.3 + velocity * 0.4, ctx.currentTime + 0.005);
        this.releasing = false;
    }

    release() {
        if (this.releasing) return;
        this.releasing = true;
        const ctx = state.ctx;
        const bloom = state.macros.bloom;
        const releaseTime = 0.1 + bloom * 2.5;

        this.output.gain.cancelScheduledValues(ctx.currentTime);
        this.output.gain.setValueAtTime(this.output.gain.value, ctx.currentTime);
        this.output.gain.linearRampToValueAtTime(0, ctx.currentTime + releaseTime);

        if (this.sustainedSource) {
            this.sustainedGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
            this.sustainedSource.stop(ctx.currentTime + 0.15);
            this.sustainedSource = null;
        }

        setTimeout(() => this.destroy(), (releaseTime + 0.2) * 1000);
    }

    destroy() {
        this.alive = false;
        try {
            this.output.disconnect();
            this.panner.disconnect();
            for (const r of this.resonators) r.disconnect();
            for (const g of this.resonatorGains) g.disconnect();
            if (this.sustainedSource) {
                this.sustainedSource.stop();
                this.sustainedSource.disconnect();
                this.sustainedGain.disconnect();
            }
        } catch (e) {}
    }

    applyDrift(driftAmount, time) {
        const preset = presets[state.currentPreset];
        for (let i = 0; i < this.resonators.length; i++) {
            const phase = state.driftPhases[i] + time * (0.1 + i * 0.02);
            const driftOffset = Math.sin(phase) * driftAmount * 0.02 * (i + 1);
            const baseRatio = preset.harmonicRatios[i] || i + 1;
            const material = state.macros.material;
            const inharmonic = material * preset.inharmonicShift * i;
            const ratio = baseRatio * (1 + inharmonic + driftOffset);
            const newFreq = this.freq * ratio;

            if (newFreq > 50 && newFreq < state.ctx.sampleRate / 2 - 100) {
                this.resonators[i].frequency.linearRampToValueAtTime(
                    newFreq,
                    state.ctx.currentTime + 0.05,
                );
            }
        }
    }
}
