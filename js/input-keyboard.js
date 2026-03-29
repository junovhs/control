// ============================================================
// AETHERBODY - Keyboard Input (with chord slots + sequencer)
// ============================================================
//
// NOTE PLAYING:
//   A S D F G H J K = white notes
//   Q W E R T Y U I = black notes / chromatic fill
//   Z / X = octave down/up
//   SPACE = hold mode
//
// CHORD SLOTS:
//   1 2 3 4 = play chord slot 0-3 (same as ABXY on controller)
//
// CHORD EDITING:
//   Click a chord slot in the UI to enter edit mode
//   While editing, note keys toggle notes in/out of the slot
//   Escape = exit edit mode
//
// SEQUENCER:
//   ` (backtick) = toggle sequencer play
//   ~ (shift+backtick) = toggle record mode
//   - / = = BPM down / up
//

import { state } from './state.js';
import { keyToSemitone } from './notes.js';
import { initAudio } from './audio.js';
import { noteOn, noteOff, playChordSlot, releaseChordSlot, updateChordUI, updateSequencerUI } from './engine.js';
import { chordSlots } from './chord-slots.js';
import { sequencer } from './sequencer.js';

const keysCurrentlyDown = new Set();
const chordKeysHeld = { '1': false, '2': false, '3': false, '4': false };

export function initKeyboardInput() {
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;

        if (!state.audioStarted) {
            initAudio();
            document.getElementById('start-prompt').classList.add('hidden');
        }

        document.getElementById('ind-keys').classList.add('active');

        const key = e.key.toLowerCase();
        const rawKey = e.key;

        // ---- Escape: exit edit mode ----
        if (key === 'escape') {
            if (state.editingSlot >= 0) {
                state.editingSlot = -1;
                updateChordUI();
            }
            return;
        }

        // ---- Backtick: sequencer toggle ----
        if (rawKey === '`') {
            sequencer.toggle(performance.now());
            updateSequencerUI(-1);
            return;
        }
        if (rawKey === '~') {
            if (sequencer.playing) {
                sequencer.toggleRecord();
                updateSequencerUI(-1);
            }
            return;
        }

        // ---- BPM control ----
        if (rawKey === '-' || rawKey === '_') {
            sequencer.bpm = Math.max(40, sequencer.bpm - 5);
            updateSequencerUI(-1);
            return;
        }
        if (rawKey === '=' || rawKey === '+') {
            sequencer.bpm = Math.min(240, sequencer.bpm + 5);
            updateSequencerUI(-1);
            return;
        }

        // ---- Chord slot keys (1-4) ----
        if (rawKey >= '1' && rawKey <= '4') {
            const slotIndex = parseInt(rawKey) - 1;
            if (!chordKeysHeld[rawKey]) {
                chordKeysHeld[rawKey] = true;
                const velocity = 0.5 + state.macros.strike * 0.5;
                playChordSlot(slotIndex, velocity, 'kb_chord');
                sequencer.recordSlot(slotIndex);
            }
            return;
        }

        // ---- Octave ----
        if (key === 'z') {
            state.octave = Math.max(1, state.octave - 1);
            return;
        }
        if (key === 'x') {
            state.octave = Math.min(7, state.octave + 1);
            return;
        }

        // ---- Hold mode ----
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

        // ---- Note input ----
        if (key in keyToSemitone) {
            const semitone = keyToSemitone[key];
            const midi = state.octave * 12 + semitone + 24;

            // If editing a chord slot, toggle notes instead of playing
            if (state.editingSlot >= 0) {
                chordSlots.toggleNote(state.editingSlot, midi);
                updateChordUI();
                // Play a brief preview
                noteOn('edit_preview', midi, 0.5);
                setTimeout(() => noteOff('edit_preview'), 200);
                return;
            }

            // Normal note playing
            keysCurrentlyDown.add(key);
            const velocity = 0.5 + state.macros.strike * 0.5;
            noteOn(key, midi, velocity);

            const keyCap = document.querySelector(`.key-cap[data-key="${key}"]`);
            if (keyCap) keyCap.classList.add('active');
        }
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        const rawKey = e.key;
        keysCurrentlyDown.delete(key);

        // Chord slot release
        if (rawKey >= '1' && rawKey <= '4') {
            const slotIndex = parseInt(rawKey) - 1;
            chordKeysHeld[rawKey] = false;
            releaseChordSlot(slotIndex, 'kb_chord');
            return;
        }

        if (key in keyToSemitone && state.editingSlot < 0) {
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
