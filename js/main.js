// ============================================================
// AETHERBODY - Main Entry Point
// Resonant Creature Synth
// ============================================================

import { state } from './state.js';
import { initAudio } from './audio.js';
import { applyPreset, tickSequencer, updateSequencerUI, updateChordUI } from './engine.js';
import { initKeyboardInput } from './input-keyboard.js';
import { initMouseInput } from './input-mouse.js';
import { initGamepadInput, pollGamepad } from './input-gamepad.js';
import { initVisuals, draw } from './visuals.js';
import { chordSlots } from './chord-slots.js';
import { sequencer } from './sequencer.js';

// ---- Initialize all input systems ----
initKeyboardInput();
initMouseInput();
initGamepadInput();
initVisuals();

// ---- Preset buttons ----
document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        initAudio();
        document.getElementById('start-prompt').classList.add('hidden');
        applyPreset(btn.dataset.preset);
    });
});

// ---- Start prompt ----
document.getElementById('start-prompt').addEventListener('click', () => {
    initAudio();
    document.getElementById('start-prompt').classList.add('hidden');
});

// ---- Chord slot click handlers (for edit mode) ----
document.querySelectorAll('.chord-slot').forEach((el) => {
    el.addEventListener('click', () => {
        initAudio();
        document.getElementById('start-prompt').classList.add('hidden');
        const slotIndex = parseInt(el.dataset.slot);
        // Toggle edit mode
        if (state.editingSlot === slotIndex) {
            state.editingSlot = -1;
        } else {
            state.editingSlot = slotIndex;
        }
        updateChordUI();
    });
});

// ---- Sequencer step click handlers ----
document.querySelectorAll('.seq-step').forEach((el, i) => {
    el.addEventListener('click', () => {
        // Cycle: empty -> 0 -> 1 -> 2 -> 3 -> empty
        const current = sequencer.steps[i];
        const next = current >= 3 ? -1 : current + 1;
        sequencer.setStep(i, next);
        updateSequencerUI(-1);
    });
});

// ---- Sequencer play/record buttons ----
document.getElementById('seq-play-btn').addEventListener('click', () => {
    initAudio();
    document.getElementById('start-prompt').classList.add('hidden');
    sequencer.toggle(performance.now());
    updateSequencerUI(-1);
});

document.getElementById('seq-rec-btn').addEventListener('click', () => {
    if (sequencer.playing) {
        sequencer.toggleRecord();
        updateSequencerUI(-1);
    }
});

// ---- BPM controls ----
document.getElementById('bpm-down').addEventListener('click', () => {
    sequencer.bpm = Math.max(40, sequencer.bpm - 5);
    updateSequencerUI(-1);
});
document.getElementById('bpm-up').addEventListener('click', () => {
    sequencer.bpm = Math.min(240, sequencer.bpm + 5);
    updateSequencerUI(-1);
});

// ---- Initial UI state ----
updateSequencerUI(-1);
updateChordUI();

// ---- Main loop ----
function mainLoop() {
    pollGamepad();
    tickSequencer(performance.now());
    draw();
    requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);

// ---- Console banner ----
console.log(`
+==========================================+
|           AETHERBODY SYNTH               |
|     Resonant Creature Instrument         |
+==========================================+
| GAMEPAD (primary):                       |
|   A B X Y = Play chord slots            |
|   RT = Strike intensity | LT = Sustain  |
|   R-Stick = Brightness / Material        |
|   L-Stick = Drift / Bloom               |
|   LB/RB = Octave | D-pad = Transpose    |
|   Start = Sequencer | Select = Record   |
|                                          |
| KEYBOARD:                                |
|   A-K / Q-I = Notes | 1-4 = Chords      |
|   Z/X = Octave | Space = Hold           |
|   \` = Seq play | ~ = Seq record         |
|   - / = = BPM | Click slots to edit     |
+==========================================+
`);
