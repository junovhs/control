// ============================================================
// AETHERBODY - Gamepad Input (Redesigned)
// ============================================================
//
// MAPPING (standard gamepad):
//   A (0)        = Play chord slot 0
//   B (1)        = Play chord slot 1
//   X (2)        = Play chord slot 2
//   Y (3)        = Play chord slot 3
//   LB (4)       = Octave down
//   RB (5)       = Octave up
//   LT (6)       = Pressure / sustain (analog)
//   RT (7)       = Strike intensity (analog)
//   Select (8)   = Toggle record mode
//   Start (9)    = Toggle sequencer play
//   D-Up (12)    = Transpose up
//   D-Down (13)  = Transpose down
//   D-Left (14)  = Previous preset
//   D-Right (15) = Next preset
//   Right Stick  = Brightness (X) / Material (Y) timbre
//   Left Stick   = Drift (Y) / Bloom (X)
//

import { state } from './state.js';
import { initAudio } from './audio.js';
import { playChordSlot, releaseChordSlot, updateMacroUI, applyPreset, updateChordUI, updateSequencerUI } from './engine.js';
import { presets } from './presets.js';
import { chordSlots } from './chord-slots.js';
import { sequencer } from './sequencer.js';

export function initGamepadInput() {
    window.addEventListener('gamepadconnected', (e) => {
        console.log('Gamepad connected:', e.gamepad.id);
        state.gamepadIndex = e.gamepad.index;
        document.getElementById('ind-gamepad').classList.add('active');
        document.getElementById('gamepad-overlay').textContent = e.gamepad.id.substring(0, 30);

        if (!state.audioStarted) {
            initAudio();
            document.getElementById('start-prompt').classList.add('hidden');
        }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
        if (e.gamepad.index === state.gamepadIndex) {
            state.gamepadIndex = -1;
            document.getElementById('ind-gamepad').classList.remove('active');
            document.getElementById('gamepad-overlay').textContent = '';
        }
    });
}

// Track which chord slots are held by the controller
const gpChordHeld = [false, false, false, false];

export function pollGamepad() {
    if (state.gamepadIndex < 0) return;

    const gp = navigator.getGamepads()[state.gamepadIndex];
    if (!gp) return;

    const gs = state.gpState;
    gs.prevButtons = [...gs.buttons];

    // Axes (with deadzone)
    const deadzone = 0.12;
    const applyDeadzone = (v) => (Math.abs(v) < deadzone ? 0 : v);

    gs.leftStick.x = applyDeadzone(gp.axes[0] || 0);
    gs.leftStick.y = applyDeadzone(gp.axes[1] || 0);
    gs.rightStick.x = applyDeadzone(gp.axes[2] || 0);
    gs.rightStick.y = applyDeadzone(gp.axes[3] || 0);

    // Triggers
    gs.leftTrigger = gp.buttons[6] ? gp.buttons[6].value : 0;
    gs.rightTrigger = gp.buttons[7] ? gp.buttons[7].value : 0;

    // Buttons
    for (let i = 0; i < gp.buttons.length && i < gs.buttons.length; i++) {
        gs.buttons[i] = gp.buttons[i].pressed;
    }

    // ---- FACE BUTTONS: Play chord slots ----
    for (let i = 0; i < 4; i++) {
        const pressed = gs.buttons[i] && !gs.prevButtons[i];
        const released = !gs.buttons[i] && gs.prevButtons[i];

        if (pressed) {
            const velocity = 0.5 + gs.rightTrigger * 0.5;
            playChordSlot(i, velocity, 'gp');
            gpChordHeld[i] = true;
            state.visualEnergy = Math.min(1, state.visualEnergy + 0.4);

            // Live record to sequencer
            sequencer.recordSlot(i);
        }
        if (released) {
            releaseChordSlot(i, 'gp');
            gpChordHeld[i] = false;
        }
    }

    // ---- SHOULDER BUTTONS: Octave ----
    if (gs.buttons[4] && !gs.prevButtons[4]) {
        state.octave = Math.max(1, state.octave - 1);
    }
    if (gs.buttons[5] && !gs.prevButtons[5]) {
        state.octave = Math.min(7, state.octave + 1);
    }

    // ---- TRIGGERS: Expression ----
    // Left trigger = pressure / sustain
    state.macros.pressure = gs.leftTrigger;

    // Right trigger = strike intensity (modifies velocity of next hit)
    if (gs.rightTrigger > 0.1) {
        state.macros.strike = 0.3 + gs.rightTrigger * 0.7;
    }

    // ---- RIGHT STICK: Timbre field ----
    if (Math.abs(gs.rightStick.x) > 0 || Math.abs(gs.rightStick.y) > 0) {
        state.macros.brightness = Math.max(0, Math.min(1, (gs.rightStick.x + 1) / 2));
        state.macros.material = Math.max(0, Math.min(1, (1 - gs.rightStick.y) / 2));
        state.fieldX = (gs.rightStick.x + 1) / 2;
        state.fieldY = (gs.rightStick.y + 1) / 2;
    }

    // ---- LEFT STICK: Drift / Bloom ----
    state.macros.drift = Math.max(0, Math.min(1, 0.25 - gs.leftStick.y * 0.5));
    state.macros.bloom = Math.max(0, Math.min(1, 0.45 + gs.leftStick.x * 0.4));

    // ---- SELECT (8): Toggle record ----
    if (gs.buttons[8] && !gs.prevButtons[8]) {
        if (sequencer.playing) {
            sequencer.toggleRecord();
        } else {
            // If not playing, select clears the sequence
            sequencer.clear();
        }
        updateSequencerUI(-1);
    }

    // ---- START (9): Toggle sequencer play ----
    if (gs.buttons[9] && !gs.prevButtons[9]) {
        sequencer.toggle(performance.now());
        updateSequencerUI(-1);
    }

    // ---- D-PAD: Transpose / Presets ----
    // Up/Down = transpose all chord slots
    if (gs.buttons[12] && !gs.prevButtons[12]) {
        chordSlots.transposeAll(1);
        updateChordUI();
    }
    if (gs.buttons[13] && !gs.prevButtons[13]) {
        chordSlots.transposeAll(-1);
        updateChordUI();
    }

    // Left/Right = cycle presets
    const presetNames = Object.keys(presets);
    if (gs.buttons[14] && !gs.prevButtons[14]) {
        const idx = presetNames.indexOf(state.currentPreset);
        const newIdx = (idx - 1 + presetNames.length) % presetNames.length;
        applyPreset(presetNames[newIdx]);
    }
    if (gs.buttons[15] && !gs.prevButtons[15]) {
        const idx = presetNames.indexOf(state.currentPreset);
        const newIdx = (idx + 1) % presetNames.length;
        applyPreset(presetNames[newIdx]);
    }

    updateMacroUI();
}
