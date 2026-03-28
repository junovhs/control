// ============================================================
// AETHERBODY - Visual Engine (Canvas Rendering)
// ============================================================

import { state, NUM_RESONATORS } from './state.js';

const canvas = document.getElementById('main-canvas');
const c = canvas.getContext('2d');

let vTime = 0;
const particles = [];

class Particle {
    constructor(x, y, energy) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * energy * 3;
        this.vy = (Math.random() - 0.5) * energy * 3;
        this.life = 1;
        this.decay = 0.01 + Math.random() * 0.02;
        this.size = 1 + Math.random() * 3 * energy;
        this.hue = 200 + Math.random() * 160;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.life -= this.decay;
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    c.scale(window.devicePixelRatio, window.devicePixelRatio);
}

export function initVisuals() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

export function draw() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Clear with fade
    c.fillStyle = 'rgba(10, 10, 15, 0.15)';
    c.fillRect(0, 0, w, h);

    vTime += 0.016;
    state.driftTime += 0.016;

    // Apply drift to active voices
    const driftAmount = state.macros.drift;
    for (const [key, voice] of state.activeNotes) {
        if (voice.alive) {
            voice.applyDrift(driftAmount, state.driftTime);
        }
    }

    // Get analyser data
    let avgEnergy = 0;
    if (state.analyser) {
        state.analyser.getByteFrequencyData(state.analyserData);
        for (let i = 0; i < state.analyserData.length; i++) {
            avgEnergy += state.analyserData[i];
        }
        avgEnergy = avgEnergy / state.analyserData.length / 255;
    }

    state.visualEnergy = state.visualEnergy * 0.92 + avgEnergy * 0.08;

    // Center of play field
    const fieldEl = document.getElementById('play-field');
    const fieldRect = fieldEl.getBoundingClientRect();
    const cx = fieldRect.left + fieldRect.width / 2;
    const cy = fieldRect.top + fieldRect.height / 2;
    const radius = fieldRect.width / 2;

    // Draw resonator visualization
    const energy = state.visualEnergy;
    const numBands = NUM_RESONATORS;

    // Main body glow
    const glowRadius = radius * (0.3 + energy * 0.7);
    const gradient = c.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);

    const hueBase = 200 + state.macros.material * 160;
    const sat = 40 + state.macros.brightness * 40;
    const lightness = 10 + energy * 30;

    gradient.addColorStop(0, `hsla(${hueBase}, ${sat}%, ${lightness + 20}%, ${0.15 + energy * 0.3})`);
    gradient.addColorStop(0.5, `hsla(${hueBase + 30}, ${sat}%, ${lightness}%, ${0.05 + energy * 0.15})`);
    gradient.addColorStop(1, `hsla(${hueBase + 60}, ${sat}%, ${lightness - 5}%, 0)`);

    c.fillStyle = gradient;
    c.beginPath();
    c.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    c.fill();

    // Resonator bands - rings
    for (let i = 0; i < numBands; i++) {
        const bandEnergy = state.analyserData
            ? (state.analyserData[Math.floor((i * state.analyserData.length) / numBands)] || 0) / 255
            : 0;

        state.visualBands[i] = state.visualBands[i] * 0.85 + bandEnergy * 0.15;
        const be = state.visualBands[i];

        if (be < 0.01) continue;

        const bandRadius = radius * (0.15 + (i / numBands) * 0.85);
        const driftPhase = state.driftPhases[i] + state.driftTime * (0.3 + i * 0.05);

        const bandHue = hueBase + i * 10 + Math.sin(driftPhase) * 20;
        const bandAlpha = be * 0.4;

        c.strokeStyle = `hsla(${bandHue}, ${sat + 20}%, ${50 + be * 30}%, ${bandAlpha})`;
        c.lineWidth = 1 + be * 3;

        c.beginPath();
        const segments = 64;
        for (let j = 0; j <= segments; j++) {
            const angle = (j / segments) * Math.PI * 2;
            const wobble = Math.sin(angle * (2 + i) + driftPhase) * be * 8 * state.macros.drift;
            const r = bandRadius + wobble;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            if (j === 0) c.moveTo(px, py);
            else c.lineTo(px, py);
        }
        c.stroke();
    }

    // Excitation point (mouse/controller position)
    if (state.fieldActive || state.macros.pressure > 0.05) {
        const epx = cx + (state.fieldX - 0.5) * 2 * radius;
        const epy = cy + (state.fieldY - 0.5) * 2 * radius;

        const pointGlow = c.createRadialGradient(epx, epy, 0, epx, epy, 30 + energy * 30);
        pointGlow.addColorStop(0, `hsla(${hueBase + 120}, 80%, 70%, ${0.5 + energy * 0.5})`);
        pointGlow.addColorStop(1, `hsla(${hueBase + 120}, 80%, 70%, 0)`);

        c.fillStyle = pointGlow;
        c.beginPath();
        c.arc(epx, epy, 30 + energy * 30, 0, Math.PI * 2);
        c.fill();

        // Spawn particles on excitation
        if (Math.random() < energy * 0.5 + state.macros.pressure * 0.3) {
            particles.push(new Particle(epx, epy, energy));
        }
    }

    // Center core
    const coreSize = 5 + energy * 15 + Math.sin(vTime * 2) * 2;
    const coreGradient = c.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
    coreGradient.addColorStop(0, `hsla(${hueBase + 60}, 60%, ${70 + energy * 30}%, ${0.6 + energy * 0.4})`);
    coreGradient.addColorStop(1, `hsla(${hueBase + 60}, 60%, 50%, 0)`);
    c.fillStyle = coreGradient;
    c.beginPath();
    c.arc(cx, cy, coreSize, 0, Math.PI * 2);
    c.fill();

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        c.fillStyle = `hsla(${p.hue}, 70%, 60%, ${p.life * 0.5})`;
        c.beginPath();
        c.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        c.fill();
    }

    // Limit particles
    while (particles.length > 200) particles.shift();

    // Outer circle boundary
    c.strokeStyle = `rgba(255, 255, 255, ${0.03 + energy * 0.05})`;
    c.lineWidth = 1;
    c.beginPath();
    c.arc(cx, cy, radius, 0, Math.PI * 2);
    c.stroke();

    // Gamepad stick visualization
    if (state.gamepadIndex >= 0) {
        const gs = state.gpState;

        // Left stick indicator
        const lsx = cx - radius - 50 + gs.leftStick.x * 20;
        const lsy = cy + gs.leftStick.y * 20;
        c.fillStyle = 'rgba(120, 170, 255, 0.3)';
        c.beginPath();
        c.arc(lsx, lsy, 5, 0, Math.PI * 2);
        c.fill();

        // Right stick indicator
        const rsx = cx + radius + 50 + gs.rightStick.x * 20;
        const rsy = cy + gs.rightStick.y * 20;
        c.fillStyle = 'rgba(255, 120, 170, 0.3)';
        c.beginPath();
        c.arc(rsx, rsy, 5, 0, Math.PI * 2);
        c.fill();

        // Trigger bars
        if (gs.leftTrigger > 0) {
            c.fillStyle = `rgba(170, 120, 255, ${gs.leftTrigger * 0.5})`;
            c.fillRect(cx - radius - 65, cy + 30, 10, -gs.leftTrigger * 60);
        }
        if (gs.rightTrigger > 0) {
            c.fillStyle = `rgba(255, 170, 120, ${gs.rightTrigger * 0.5})`;
            c.fillRect(cx + radius + 55, cy + 30, 10, -gs.rightTrigger * 60);
        }
    }
}
