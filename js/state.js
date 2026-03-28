// ============================================================
// AETHERBODY - Shared State & Constants
// ============================================================

export const NUM_RESONATORS = 16;
export const MAX_POLYPHONY = 8;

export const state = {
    audioStarted: false,
    ctx: null,
    masterGain: null,
    reverbNode: null,
    reverbGain: null,
    dryGain: null,
    analyser: null,
    analyserData: null,

    // Macros (0-1)
    macros: {
        strike: 0.4,
        body: 0.6,
        material: 0.3,
        brightness: 0.5,
        bloom: 0.45,
        drift: 0.25,
        pressure: 0.0,
        space: 0.35,
    },

    // Mouse field
    fieldX: 0.5,
    fieldY: 0.5,
    fieldActive: false,
    fieldVelocity: 0,

    // Notes
    octave: 4,
    activeNotes: new Map(),
    heldNotes: new Set(),
    holdMode: false,

    // Gamepad
    gamepad: null,
    gamepadIndex: -1,
    gpState: {
        leftStick: { x: 0, y: 0 },
        rightStick: { x: 0, y: 0 },
        leftTrigger: 0,
        rightTrigger: 0,
        buttons: new Array(17).fill(false),
        prevButtons: new Array(17).fill(false),
    },

    // Drift engine
    driftPhases: [],
    driftTime: 0,

    // Visual
    visualEnergy: 0,
    visualBands: new Array(NUM_RESONATORS).fill(0),
    resonatorData: [],

    // Preset
    currentPreset: 'organic',
};

// Initialize drift phases randomly
for (let i = 0; i < NUM_RESONATORS; i++) {
    state.driftPhases.push(Math.random() * Math.PI * 2);
}
