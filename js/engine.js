// ============================================================
// AETHERBODY - Note Engine & Macro Control
// ============================================================

import { state, MAX_POLYPHONY } from './state.js';
import { presets } from './presets.js';
import { midiToFreq, noteNameFromMidi } from './notes.js';
import { Voice } from './voice.js';

export function noteOn(key, midi, velocity = 0.7) {
    if (!state.audioStarted) return;

    // If note already playing, re-excite
    if (state.activeNotes.has(key)) {
        const voice = state.activeNotes.get(key);
        if (voice.alive) {
            voice.reExcite(velocity);
            return;
        }
    }

    // Polyphony limit
    if (state.activeNotes.size >= MAX_POLYPHONY) {
        const oldest = state.activeNotes.entries().next().value;
        if (oldest) {
            oldest[1].release();
            state.activeNotes.delete(oldest[0]);
        }
    }

    const freq = midiToFreq(midi);
    const voice = new Voice(freq, velocity);
    state.activeNotes.set(key, voice);
    state.heldNotes.add(key);

    // Visual feedback
    state.visualEnergy = Math.min(1, state.visualEnergy + velocity * 0.5);

    // Show note
    const noteDisplay = document.getElementById('note-display');
    noteDisplay.textContent = noteNameFromMidi(midi);
    noteDisplay.classList.add('visible');
}

export function noteOff(key) {
    if (state.holdMode) return;

    state.heldNotes.delete(key);

    const voice = state.activeNotes.get(key);
    if (voice && voice.alive) {
        voice.release();
        state.activeNotes.delete(key);
    }

    if (state.heldNotes.size === 0) {
        document.getElementById('note-display').classList.remove('visible');
    }
}

export function allNotesOff() {
    for (const [key, voice] of state.activeNotes) {
        if (voice.alive) voice.release();
    }
    state.activeNotes.clear();
    state.heldNotes.clear();
    document.getElementById('note-display').classList.remove('visible');
}

export function updateMacroUI() {
    document.getElementById('m-strike').style.width = state.macros.strike * 100 + '%';
    document.getElementById('m-body').style.width = state.macros.body * 100 + '%';
    document.getElementById('m-material').style.width = state.macros.material * 100 + '%';
    document.getElementById('m-bright').style.width = state.macros.brightness * 100 + '%';
    document.getElementById('m-bloom').style.width = state.macros.bloom * 100 + '%';
    document.getElementById('m-drift').style.width = state.macros.drift * 100 + '%';
    document.getElementById('m-pressure').style.width = state.macros.pressure * 100 + '%';
    document.getElementById('m-space').style.width = state.macros.space * 100 + '%';

    // Update reverb
    if (state.reverbGain) {
        state.reverbGain.gain.linearRampToValueAtTime(
            state.macros.space * 0.6,
            state.ctx.currentTime + 0.05,
        );
    }

    // Update sustained voices pressure
    for (const [key, voice] of state.activeNotes) {
        if (voice.alive) {
            voice.updatePressure(state.macros.pressure);
        }
    }
}

export function applyPreset(name) {
    const preset = presets[name];
    if (!preset) return;

    state.currentPreset = name;
    state.macros.strike = preset.strike;
    state.macros.body = preset.body;
    state.macros.material = preset.material;
    state.macros.brightness = preset.brightness;
    state.macros.bloom = preset.bloom;
    state.macros.drift = preset.drift;
    state.macros.pressure = preset.pressure;
    state.macros.space = preset.space;

    updateMacroUI();

    document.querySelectorAll('.preset-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.preset === name);
    });
}
