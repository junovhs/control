// ============================================================
// AETHERBODY - Note Mapping & MIDI Utilities
// ============================================================

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Bottom row: white notes of a scale
// Top row: sharps/chromatic fill
export const keyToSemitone = {
    a: 0, s: 2, d: 4, f: 5, g: 7, h: 9, j: 11, k: 12,
    q: 1, w: 3, e: 6, r: 8, t: 10, y: 13, u: 14, i: 15,
};

// Major scale degrees for gamepad
export const gamepadScale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];

export function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

export function noteNameFromMidi(midi) {
    return NOTE_NAMES[midi % 12] + Math.floor(midi / 12 - 1);
}
