// ============================================================
// AETHERBODY - Main Entry Point
// Resonant Creature Synth
// ============================================================

import { initAudio } from './audio.js';
import { applyPreset } from './engine.js';
import { initKeyboardInput } from './input-keyboard.js';
import { initMouseInput } from './input-mouse.js';
import { initGamepadInput, pollGamepad } from './input-gamepad.js';
import { initVisuals, draw } from './visuals.js';

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

// ---- Main loop ----
function mainLoop() {
    pollGamepad();
    draw();
    requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);

// ---- Console banner ----
console.log(`
+======================================+
|         AETHERBODY SYNTH             |
|   Resonant Creature Instrument       |
+======================================+
| KEYBOARD:                            |
|   A S D F G H J K = White notes      |
|   Q W E R T Y U I = Black notes      |
|   Z / X = Octave down/up             |
|   SPACE = Hold mode                  |
|                                      |
| MOUSE:                               |
|   Click & drag field = timbre        |
|   X = brightness, Y = material       |
|   Distance = pressure                |
|                                      |
| GAMEPAD:                             |
|   Left stick = note selection        |
|   Right stick = timbre               |
|   Left trigger = pressure/sustain    |
|   Right trigger = strike/excite      |
|   Face buttons = chord tones         |
|   Shoulders = octave                 |
|   D-pad L/R = presets                |
+======================================+
`);
