// ============================================================
// AETHERBODY - Audio Engine Initialization
// ============================================================

import { state, NUM_RESONATORS } from './state.js';

export function initAudio() {
    if (state.audioStarted) return;

    state.ctx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 44100,
    });

    state.masterGain = state.ctx.createGain();
    state.masterGain.gain.value = 0.5;

    // Compressor
    const compressor = state.ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 10;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.1;

    // Reverb (convolution with generated IR)
    state.reverbNode = state.ctx.createConvolver();
    state.reverbGain = state.ctx.createGain();
    state.reverbGain.gain.value = state.macros.space * 0.6;
    state.dryGain = state.ctx.createGain();
    state.dryGain.gain.value = 1;

    generateReverbIR();

    // Signal chain
    state.masterGain.connect(state.dryGain);
    state.masterGain.connect(state.reverbGain);
    state.reverbGain.connect(state.reverbNode);
    state.reverbNode.connect(compressor);
    state.dryGain.connect(compressor);
    compressor.connect(state.ctx.destination);

    // Analyser for visuals
    state.analyser = state.ctx.createAnalyser();
    state.analyser.fftSize = 256;
    state.masterGain.connect(state.analyser);
    state.analyserData = new Uint8Array(state.analyser.frequencyBinCount);

    // Init drift phases
    for (let i = 0; i < NUM_RESONATORS; i++) {
        state.driftPhases[i] = Math.random() * Math.PI * 2;
    }

    state.audioStarted = true;
    document.getElementById('ind-audio').classList.add('active');
}

function generateReverbIR() {
    const length = state.ctx.sampleRate * 2.5;
    const ir = state.ctx.createBuffer(2, length, state.ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
        const data = ir.getChannelData(ch);
        for (let i = 0; i < length; i++) {
            const t = i / length;
            // Exponential decay with some diffusion
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.5) * 0.5;
            // Early reflections
            if (i < state.ctx.sampleRate * 0.1) {
                const earlyT = i / (state.ctx.sampleRate * 0.1);
                data[i] += (Math.random() * 2 - 1) * (1 - earlyT) * 0.3;
            }
        }
    }

    state.reverbNode.buffer = ir;
}
