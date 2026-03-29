// ============================================================
// AETHERBODY - Programmable Chord Slots
// ============================================================
// 4 chord slots mapped to ABXY / 1234
// Each slot holds an array of MIDI notes
// Users can edit slots, transpose all, etc.

import { noteNameFromMidi } from './notes.js';

const SLOT_COLORS = ['#f55', '#5f5', '#55f', '#ff5'];
const SLOT_LABELS = ['A', 'B', 'X', 'Y'];

export const chordSlots = {
    slots: [
        { name: 'I',   notes: [48, 52, 55],     color: SLOT_COLORS[0], label: SLOT_LABELS[0] }, // C3 E3 G3
        { name: 'IV',  notes: [53, 57, 60],     color: SLOT_COLORS[1], label: SLOT_LABELS[1] }, // F3 A3 C4
        { name: 'V',   notes: [43, 47, 50],     color: SLOT_COLORS[2], label: SLOT_LABELS[2] }, // G2 B2 D3
        { name: 'vi',  notes: [45, 48, 52],     color: SLOT_COLORS[3], label: SLOT_LABELS[3] }, // A2 C3 E3
    ],

    transpose: 0,

    getSlotNotes(index) {
        const slot = this.slots[index];
        if (!slot) return [];
        return slot.notes.map(n => n + this.transpose);
    },

    toggleNote(slotIndex, midiNote) {
        const slot = this.slots[slotIndex];
        if (!slot) return;
        const idx = slot.notes.indexOf(midiNote);
        if (idx >= 0) {
            slot.notes.splice(idx, 1);
        } else {
            slot.notes.push(midiNote);
            slot.notes.sort((a, b) => a - b);
        }
    },

    transposeAll(semitones) {
        this.transpose += semitones;
    },

    resetTranspose() {
        this.transpose = 0;
    },

    getSlotDisplay(index) {
        const slot = this.slots[index];
        if (!slot) return '';
        const notes = this.getSlotNotes(index);
        return notes.map(n => noteNameFromMidi(n)).join(' ');
    },
};
