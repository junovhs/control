// ============================================================
// AETHERBODY - Mouse & Touch Input
// ============================================================

import { state } from './state.js';
import { initAudio } from './audio.js';
import { updateMacroUI } from './engine.js';

let lastMouseX = 0;
let lastMouseY = 0;
let lastMouseTime = 0;

function updateFieldPosition(e) {
    const playField = document.getElementById('play-field');
    const rect = playField.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width / 2;

    let dx = (e.clientX - cx) / radius;
    let dy = (e.clientY - cy) / radius;

    // Clamp to circle
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
        dx /= dist;
        dy /= dist;
    }

    state.fieldX = (dx + 1) / 2;
    state.fieldY = (dy + 1) / 2;

    // Calculate velocity
    const now = performance.now();
    const dt = now - lastMouseTime;
    if (dt > 0) {
        const mdx = e.clientX - lastMouseX;
        const mdy = e.clientY - lastMouseY;
        state.fieldVelocity = Math.min(1, Math.sqrt(mdx * mdx + mdy * mdy) / (dt * 2));
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    lastMouseTime = now;

    // Map field to macros
    state.macros.brightness = state.fieldX;
    state.macros.material = 1 - state.fieldY;
    const fieldDist = Math.sqrt(dx * dx + dy * dy);
    if (state.fieldActive) {
        state.macros.pressure = fieldDist * 0.8;
    }

    updateMacroUI();
}

export function initMouseInput() {
    const playField = document.getElementById('play-field');

    playField.addEventListener('mousedown', (e) => {
        if (!state.audioStarted) {
            initAudio();
            document.getElementById('start-prompt').classList.add('hidden');
        }

        state.fieldActive = true;
        document.getElementById('ind-mouse').classList.add('active');
        updateFieldPosition(e);

        // Mouse click as excitation
        if (state.activeNotes.size > 0) {
            for (const [key, voice] of state.activeNotes) {
                if (voice.alive) {
                    voice.reExcite(0.3 + state.fieldVelocity * 0.7);
                }
            }
        }
    });

    playField.addEventListener('mousemove', (e) => {
        if (!state.fieldActive) return;
        updateFieldPosition(e);
    });

    document.addEventListener('mouseup', () => {
        state.fieldActive = false;
        state.macros.pressure = Math.max(state.macros.pressure * 0.5, 0);
        document.getElementById('ind-mouse').classList.remove('active');
        updateMacroUI();
    });

    // Touch support
    playField.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!state.audioStarted) {
            initAudio();
            document.getElementById('start-prompt').classList.add('hidden');
        }
        state.fieldActive = true;
        document.getElementById('ind-mouse').classList.add('active');
        updateFieldPosition(e.touches[0]);
    }, { passive: false });

    playField.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!state.fieldActive) return;
        updateFieldPosition(e.touches[0]);
    }, { passive: false });

    playField.addEventListener('touchend', (e) => {
        e.preventDefault();
        state.fieldActive = false;
        state.macros.pressure = 0;
        document.getElementById('ind-mouse').classList.remove('active');
        updateMacroUI();
    }, { passive: false });
}
