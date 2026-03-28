// ============================================================
// AETHERBODY - Gamepad Input
// ============================================================

import { state } from './state.js';
import { gamepadScale } from './notes.js';
import { initAudio } from './audio.js';
import { noteOn, noteOff, updateMacroUI, applyPreset } from './engine.js';
import { presets } from './presets.js';

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

    // Triggers (standard mapping: button 6 = left, button 7 = right)
    gs.leftTrigger = gp.buttons[6] ? gp.buttons[6].value : 0;
    gs.rightTrigger = gp.buttons[7] ? gp.buttons[7].value : 0;

    // Buttons
    for (let i = 0; i < gp.buttons.length && i < gs.buttons.length; i++) {
        gs.buttons[i] = gp.buttons[i].pressed;
    }

    // ---- Map controller to instrument ----

    // Right stick -> timbre field
    if (Math.abs(gs.rightStick.x) > 0 || Math.abs(gs.rightStick.y) > 0) {
        state.macros.brightness = (gs.rightStick.x + 1) / 2;
        state.macros.material = (1 - gs.rightStick.y) / 2;
        state.fieldX = (gs.rightStick.x + 1) / 2;
        state.fieldY = (gs.rightStick.y + 1) / 2;
    }

    // Left trigger -> pressure/sustain
    state.macros.pressure = gs.leftTrigger;

    // Right trigger -> strike/excite
    if (gs.rightTrigger > 0.1) {
        state.macros.strike = 0.3 + gs.rightTrigger * 0.7;
        if (gs.rightTrigger > 0.3) {
            for (const [key, voice] of state.activeNotes) {
                if (voice.alive && Math.random() < 0.1) {
                    voice.reExcite(gs.rightTrigger * 0.5);
                }
            }
        }
    }

    // Left stick -> note selection
    const lsAngle = Math.atan2(gs.leftStick.y, gs.leftStick.x);
    const lsDist = Math.sqrt(gs.leftStick.x ** 2 + gs.leftStick.y ** 2);

    if (lsDist > 0.5) {
        const normalizedAngle = (lsAngle + Math.PI) / (2 * Math.PI);
        const scaleIndex = Math.floor(normalizedAngle * gamepadScale.length);
        const semitone = gamepadScale[scaleIndex % gamepadScale.length];
        const midi = state.octave * 12 + semitone + 24;
        const gpKey = 'gp_stick_' + scaleIndex;

        if (!state.activeNotes.has(gpKey)) {
            for (const [key, voice] of state.activeNotes) {
                if (key.startsWith('gp_stick_') && key !== gpKey) {
                    voice.release();
                    state.activeNotes.delete(key);
                }
            }
            noteOn(gpKey, midi, 0.5 + lsDist * 0.3);
        }
    } else {
        for (const [key, voice] of state.activeNotes) {
            if (key.startsWith('gp_stick_')) {
                voice.release();
                state.activeNotes.delete(key);
            }
        }
    }

    // Face buttons -> chord/notes (A=0, B=1, X=2, Y=3)
    const faceButtonNotes = [0, 4, 7, 12];
    for (let i = 0; i < 4; i++) {
        const gpKey = 'gp_btn_' + i;
        if (gs.buttons[i] && !gs.prevButtons[i]) {
            const midi = state.octave * 12 + faceButtonNotes[i] + 24;
            noteOn(gpKey, midi, 0.6 + gs.rightTrigger * 0.3);
            state.visualEnergy = Math.min(1, state.visualEnergy + 0.3);
        } else if (!gs.buttons[i] && gs.prevButtons[i]) {
            noteOff(gpKey);
        }
    }

    // Shoulder buttons -> octave (LB=4, RB=5)
    if (gs.buttons[4] && !gs.prevButtons[4]) {
        state.octave = Math.max(1, state.octave - 1);
    }
    if (gs.buttons[5] && !gs.prevButtons[5]) {
        state.octave = Math.min(7, state.octave + 1);
    }

    // D-pad -> preset switching (Left=14, Right=15)
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

    // Sticks -> drift / bloom
    state.macros.drift = Math.max(0, Math.min(1, 0.25 + gs.rightStick.y * -0.5));
    state.macros.bloom = Math.max(0, Math.min(1, 0.45 + gs.leftStick.y * -0.4));

    updateMacroUI();
}
