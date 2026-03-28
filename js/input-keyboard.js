// ============================================================
// AETHERBODY - Keyboard Input
// ============================================================

import { state } from './state.js';
import { keyToSemitone } from './notes.js';
import { initAudio } from './audio.js';
import { noteOn, noteOff } from './engine.js';

const keysCurrentlyDown = new Set();

export function initKeyboardInput() {
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;

        if (!state.audioStarted) {
            initAudio();
            document.getElementById('start-prompt').classList.add('hidden');
        }

        document.getElementById('ind-keys').classList.add('active');

        const key = e.key.toLowerCase();

        // Octave
        if (key === 'z') {
            state.octave = Math.max(1, state.octave - 1);
            return;
        }
        if (key === 'x') {
            state.octave = Math.min(7, state.octave + 1);
            return;
        }

        // Hold mode
        if (key === ' ') {
            e.preventDefault();
            state.holdMode = !state.holdMode;
            if (!state.holdMode) {
                for (const [noteKey, voice] of state.activeNotes) {
                    if (!keysCurrentlyDown.has(noteKey)) {
                        voice.release();
                        state.activeNotes.delete(noteKey);
                    }
                }
                state.heldNotes.clear();
                for (const k of keysCurrentlyDown) {
                    state.heldNotes.add(k);
                }
            }
            return;
        }

        // Note input
        if (key in keyToSemitone) {
            keysCurrentlyDown.add(key);
            const semitone = keyToSemitone[key];
            const midi = state.octave * 12 + semitone + 24;
            const velocity = 0.5 + state.macros.strike * 0.5;
            noteOn(key, midi, velocity);

            const keyCap = document.querySelector(`.key-cap[data-key="${key}"]`);
            if (keyCap) keyCap.classList.add('active');
        }
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        keysCurrentlyDown.delete(key);

        if (key in keyToSemitone) {
            noteOff(key);
            const keyCap = document.querySelector(`.key-cap[data-key="${key}"]`);
            if (keyCap) keyCap.classList.remove('active');
        }

        if (keysCurrentlyDown.size === 0) {
            document.getElementById('ind-keys').classList.remove('active');
        }
    });
}

export { keysCurrentlyDown };
