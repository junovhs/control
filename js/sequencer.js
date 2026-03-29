// ============================================================
// AETHERBODY - Step Sequencer
// ============================================================
// 8-step sequencer that triggers chord slots in a loop.
// Live record: press chord buttons while playing to write steps.
// This lets users program a progression then focus on expression.

export class Sequencer {
    constructor(length = 8) {
        this.steps = new Array(length).fill(-1); // -1 = rest, 0-3 = chord slot index
        this.length = length;
        this.position = 0;
        this.playing = false;
        this.recording = false;
        this.bpm = 110;
        this.stepsPerBeat = 2; // 8th notes
        this.lastStepTime = 0;
    }

    get stepDuration() {
        return 60000 / this.bpm / this.stepsPerBeat;
    }

    start(timestamp) {
        this.playing = true;
        this.position = 0;
        this.lastStepTime = timestamp;
    }

    stop() {
        this.playing = false;
        this.recording = false;
        this.position = 0;
    }

    toggle(timestamp) {
        if (this.playing) {
            this.stop();
        } else {
            this.start(timestamp);
        }
    }

    toggleRecord() {
        this.recording = !this.recording;
    }

    // Call every frame. Returns { step, slot } when a new step is reached, null otherwise.
    tick(timestamp) {
        if (!this.playing) return null;

        const elapsed = timestamp - this.lastStepTime;
        if (elapsed >= this.stepDuration) {
            this.lastStepTime = timestamp;
            const currentStep = this.position;
            const slot = this.steps[currentStep];
            this.position = (this.position + 1) % this.length;
            return { step: currentStep, slot };
        }
        return null;
    }

    // Live record: write a chord slot to the current step
    recordSlot(slotIndex) {
        if (this.playing && this.recording) {
            // Write to the step that's currently playing
            const writeStep = this.position === 0 ? this.length - 1 : this.position - 1;
            this.steps[writeStep] = slotIndex;
        }
    }

    setStep(position, slotIndex) {
        if (position >= 0 && position < this.length) {
            this.steps[position] = slotIndex;
        }
    }

    clear() {
        this.steps.fill(-1);
        this.position = 0;
    }
}

// Default instance with a I-vi-IV-V pattern
export const sequencer = new Sequencer(8);
sequencer.steps = [0, -1, 3, -1, 1, -1, 2, -1];
