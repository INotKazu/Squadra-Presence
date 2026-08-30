import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Deterministic, original ambient loop for Squadra Presence. The committed OGG
// is generated from this source and does not sample either reference track.
const SAMPLE_RATE = 44_100;
const BPM = 72;
const BEAT_SECONDS = 60 / BPM;
const BAR_SECONDS = BEAT_SECONDS * 4;
const BAR_COUNT = 16;
const DURATION_SECONDS = BAR_SECONDS * BAR_COUNT;
const FRAME_COUNT = Math.round(DURATION_SECONDS * SAMPLE_RATE);
const TAU = Math.PI * 2;

const left = new Float64Array(FRAME_COUNT);
const right = new Float64Array(FRAME_COUNT);
let noiseState = 0x6d2b79f5;

function random() {
  noiseState = Math.imul(noiseState ^ (noiseState >>> 15), 1 | noiseState);
  noiseState ^= noiseState + Math.imul(noiseState ^ (noiseState >>> 7), 61 | noiseState);
  return ((noiseState ^ (noiseState >>> 14)) >>> 0) / 4_294_967_296;
}

function midiFrequency(note) {
  return 440 * (2 ** ((note - 69) / 12));
}

function addCircular(startSeconds, durationSeconds, pan, renderSample) {
  const start = Math.round(startSeconds * SAMPLE_RATE);
  const frames = Math.round(durationSeconds * SAMPLE_RATE);
  const leftGain = Math.cos((pan + 1) * Math.PI / 4);
  const rightGain = Math.sin((pan + 1) * Math.PI / 4);
  for (let frame = 0; frame < frames; frame += 1) {
    const value = renderSample(frame / SAMPLE_RATE, frame / Math.max(1, frames - 1));
    const index = (start + frame) % FRAME_COUNT;
    left[index] += value * leftGain;
    right[index] += value * rightGain;
  }
}

function smoothstep(value) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function addPad(startSeconds, notes, panOffset = 0) {
  const duration = BAR_SECONDS + 2.4;
  notes.forEach((note, index) => {
    const frequency = midiFrequency(note);
    const phase = random() * TAU;
    const pan = Math.max(-0.8, Math.min(0.8, panOffset + (index - (notes.length - 1) / 2) * 0.22));
    addCircular(startSeconds - 0.65, duration, pan, (time, progress) => {
      const attack = smoothstep(time / 1.15);
      const release = smoothstep((duration - time) / 2.2);
      const breath = 0.91 + Math.sin(TAU * 0.075 * time + phase) * 0.09;
      const tone = Math.sin(TAU * frequency * time + phase)
        + 0.28 * Math.sin(TAU * frequency * 2 * time + phase * 0.73)
        + 0.09 * Math.sin(TAU * frequency * 3 * time + phase * 1.17);
      return tone * attack * release * breath * (0.0125 - index * 0.0008) * (1 - progress * 0.04);
    });
  });
}

function addPluck(startSeconds, note, pan, strength = 1) {
  const frequency = midiFrequency(note);
  const phase = random() * TAU;
  const duration = 2.65;
  addCircular(startSeconds, duration, pan, (time) => {
    const attack = Math.min(1, time / 0.012);
    const decay = Math.exp(-time * 2.05);
    const body = Math.sin(TAU * frequency * time + phase)
      + 0.42 * Math.sin(TAU * frequency * 2.01 * time + phase * 0.3)
      + 0.16 * Math.sin(TAU * frequency * 3.98 * time + phase * 0.8);
    const warmth = 0.86 + 0.14 * Math.sin(TAU * 0.31 * time + phase);
    return body * attack * decay * warmth * 0.042 * strength;
  });

  // Two quiet reflections create space without relying on a sampled reverb.
  for (const [delay, gain, echoPan] of [[0.29, 0.24, -pan * 0.45], [0.53, 0.13, pan * 0.2]]) {
    addCircular(startSeconds + delay, duration, echoPan, (time) => {
      const attack = Math.min(1, time / 0.018);
      const decay = Math.exp(-time * 2.25);
      return Math.sin(TAU * frequency * time + phase) * attack * decay * 0.042 * strength * gain;
    });
  }
}

function addBass(startSeconds, note, strength = 1) {
  const frequency = midiFrequency(note);
  addCircular(startSeconds, BEAT_SECONDS * 2.25, 0, (time) => {
    const attack = Math.min(1, time / 0.04);
    const decay = Math.exp(-time * 1.05);
    const tone = Math.sin(TAU * frequency * time) + 0.14 * Math.sin(TAU * frequency * 2 * time);
    return tone * attack * decay * 0.045 * strength;
  });
}

function addSoftPulse(startSeconds, strength = 1) {
  const duration = 0.72;
  const seed = random() * TAU;
  addCircular(startSeconds, duration, 0, (time) => {
    const envelope = Math.exp(-time * 8.5) * Math.min(1, time / 0.012);
    const sweep = 70 - 34 * (time / duration);
    return Math.sin(TAU * sweep * time + seed) * envelope * 0.035 * strength;
  });
}

function addBrush(startSeconds, pan) {
  const duration = 0.17;
  let filtered = 0;
  addCircular(startSeconds, duration, pan, (time) => {
    const white = random() * 2 - 1;
    filtered += (white - filtered) * 0.22;
    const envelope = Math.sin(Math.PI * Math.min(1, time / duration)) ** 2;
    return (white - filtered * 0.55) * envelope * 0.011;
  });
}

const harmony = [
  { root: 38, notes: [50, 57, 60, 64, 65] }, // Dm9
  { root: 34, notes: [46, 53, 57, 60, 62] }, // Bbmaj9
  { root: 41, notes: [53, 60, 64, 67, 69] }, // Fmaj9
  { root: 36, notes: [48, 55, 57, 62, 64] }, // C6/9
  { root: 31, notes: [43, 50, 53, 57, 58] }, // Gm9
  { root: 33, notes: [45, 52, 55, 60, 62] }, // Am11 color
  { root: 34, notes: [46, 53, 57, 60, 65] }, // Bbmaj7(#11)
  { root: 33, notes: [45, 52, 55, 62, 64] }, // A7sus color
];

const arpeggioOrder = [0, 2, 4, 1, 3, 2, 4, 3];

for (let bar = 0; bar < BAR_COUNT; bar += 1) {
  const chord = harmony[bar % harmony.length];
  const start = bar * BAR_SECONDS;
  addPad(start, chord.notes, bar % 2 === 0 ? -0.08 : 0.08);
  addBass(start, chord.root, bar % 4 === 0 ? 1 : 0.78);
  addBass(start + BEAT_SECONDS * 2, chord.root + 7, 0.48);
  addSoftPulse(start, bar % 4 === 0 ? 0.85 : 0.56);
  addSoftPulse(start + BEAT_SECONDS * 2, 0.42);

  arpeggioOrder.forEach((order, step) => {
    if ((bar + step) % 7 === 5) return;
    const note = chord.notes[order] + (step >= 6 && bar % 4 === 3 ? 12 : 0);
    const pan = ((step % 4) - 1.5) * 0.24 + (bar % 2 === 0 ? -0.08 : 0.08);
    addPluck(start + step * BEAT_SECONDS / 2, note, Math.max(-0.82, Math.min(0.82, pan)), step % 4 === 0 ? 0.9 : 0.64);
  });

  for (let beat = 0; beat < 4; beat += 1) {
    addBrush(start + (beat + 0.5) * BEAT_SECONDS, beat % 2 === 0 ? -0.44 : 0.44);
  }
}

// A sparse, original answering motif gives the second half a little lift.
const motif = [74, 77, 76, 72, 69, 72, 74, 69];
[3, 7, 11, 15].forEach((bar, phrase) => {
  const phraseStart = bar * BAR_SECONDS + BEAT_SECONDS * 2;
  motif.slice(phrase % 2 === 0 ? 0 : 4, phrase % 2 === 0 ? 4 : 8).forEach((note, index) => {
    addPluck(phraseStart + index * BEAT_SECONDS / 2, note, index % 2 === 0 ? 0.52 : -0.34, 0.5);
  });
});

// Low-level filtered air keeps the quiet sections alive.
let airLeft = 0;
let airRight = 0;
for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
  airLeft += ((random() * 2 - 1) - airLeft) * 0.0035;
  airRight += ((random() * 2 - 1) - airRight) * 0.0031;
  const movement = 0.5 + 0.5 * Math.sin(TAU * frame / FRAME_COUNT * 3);
  left[frame] += airLeft * (0.008 + movement * 0.003);
  right[frame] += airRight * (0.008 + (1 - movement) * 0.003);
}

let peak = 0;
for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
  // Gentle saturation keeps the mix cohesive and avoids hard clipping.
  left[frame] = Math.tanh(left[frame] * 1.65);
  right[frame] = Math.tanh(right[frame] * 1.65);
  peak = Math.max(peak, Math.abs(left[frame]), Math.abs(right[frame]));
}

const normalization = 0.82 / Math.max(peak, 0.001);
const dataSize = FRAME_COUNT * 2 * 2;
const wav = Buffer.alloc(44 + dataSize);
wav.write("RIFF", 0);
wav.writeUInt32LE(36 + dataSize, 4);
wav.write("WAVE", 8);
wav.write("fmt ", 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SAMPLE_RATE, 24);
wav.writeUInt32LE(SAMPLE_RATE * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(dataSize, 40);

for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
  const offset = 44 + frame * 4;
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[frame] * normalization)) * 32_767), offset);
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[frame] * normalization)) * 32_767), offset + 2);
}

const outputPath = resolve(process.argv[2] ?? "public/assets/audio/kazucorp-evening-link.wav");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, wav);
console.log(`Generated ${DURATION_SECONDS.toFixed(3)}s original loop at ${outputPath}`);
