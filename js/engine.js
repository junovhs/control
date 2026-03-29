// ============================================================
// AETHERBODY - Note Engine, Chord Slots & Sequencer Control
// ============================================================

import { state, MAX_POLYPHONY } from './state.js';
import { presets } from './presets.js';
import { midiToFreq, noteNameFromMidi } from './notes.js';
import { Voice } from './voice.js';
import { chordSlots } from './chord-slots.js';
import { sequencer } from './sequencer.js';

// ---- Core note engine ----

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

// ---- Chord slot play/release ----

export function playChordSlot(slotIndex, velocity = 0.7, keyPrefix = 'chord') {
    const notes = chordSlots.getSlotNotes(slotIndex);
    for (const midi of notes) {
        const key = `${keyPrefix}_${slotIndex}_${midi}`;
        noteOn(key, midi, velocity);
    }
    // Visual: mark slot active
    const el = document.querySelector(`.chord-slot[data-slot="${slotIndex}"]`);
    if (el) el.classList.add('active');
}

export function releaseChordSlot(slotIndex, keyPrefix = 'chord') {
    const notes = chordSlots.getSlotNotes(slotIndex);
    for (const midi of notes) {
        const key = `${keyPrefix}_${slotIndex}_${midi}`;
        noteOff(key);
    }
    const el = document.querySelector(`.chord-slot[data-slot="${slotIndex}"]`);
    if (el) el.classList.remove('active');
}

export function releaseAllWithPrefix(prefix) {
    for (const [key, voice] of state.activeNotes) {
        if (key.startsWith(prefix)) {
            if (voice.alive) voice.release();
            state.activeNotes.delete(key);
        }
    }
}

// ---- Sequencer integration ----

export function tickSequencer(timestamp) {
    const result = sequencer.tick(timestamp);
    if (result === null) return;

    const { step, slot } = result;

    // Release previous sequencer notes
    releaseAllWithPrefix('seq_');

    // Play new step if it has a chord
    if (slot >= 0) {
        const velocity = 0.5 + state.macros.strike * 0.4;
        playChordSlot(slot, velocity, 'seq');
    }

    // Update sequencer UI
    updateSequencerUI(step);
}

export function updateSequencerUI(activeStep) {
    const steps = document.querySelectorAll('.seq-step');
    steps.forEach((el, i) => {
        const slot = sequencer.steps[i];
        el.classList.toggle('active', i === activeStep && sequencer.playing);

        // Color based on slot assignment
        if (slot >= 0 && slot < chordSlots.slots.length) {
            el.style.background = chordSlots.slots[slot].color + '40';
            el.style.borderColor = chordSlots.slots[slot].color + '80';
            el.textContent = chordSlots.slots[slot].label;
        } else {
            el.style.background = 'rgba(255,255,255,0.03)';
            el.style.borderColor = 'rgba(255,255,255,0.1)';
            el.textContent = '';
        }
    });

    // Play/record button states
    const playBtn = document.getElementById('seq-play-btn');
    const recBtn = document.getElementById('seq-rec-btn');
    if (playBtn) playBtn.classList.toggle('active', sequencer.playing);
    if (recBtn) recBtn.classList.toggle('active', sequencer.recording);

    // BPM display
    const bpmEl = document.getElementById('seq-bpm');
    if (bpmEl) bpmEl.textContent = sequencer.bpm;
}

export function updateChordUI() {
    document.querySelectorAll('.chord-slot').forEach((el) => {
        const i = parseInt(el.dataset.slot);
        const notesEl = el.querySelector('.slot-notes');
        if (notesEl) {
            notesEl.textContent = chordSlots.getSlotDisplay(i);
        }
        el.classList.toggle('editing', state.editingSlot === i);
    });

    const transposeEl = document.getElementById('transpose-display');
    if (transposeEl) {
        const s = chordSlots.transpose;
        transposeEl.textContent = `TRANSPOSE ${s >= 0 ? '+' : ''}${s}`;
        transposeEl.style.opacity = s === 0 ? '0.3' : '0.7';
    }
}

// ---- Macro UI ----

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

// ---- Presets ----

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
