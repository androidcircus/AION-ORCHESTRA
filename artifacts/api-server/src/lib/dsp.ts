/**
 * AION ORCHESTRA - Cyberpunk Nebula DSP Library
 * Royal Blues, Purples, and Ethereal Spaces.
 */

export function applySaturation(sample: number, drive: number = 2.0): number {
  const x = sample * drive;
  return Math.tanh(x) / Math.tanh(drive);
}

export class LowPassFilter {
  private lastOut: number = 0;
  private alpha: number = 0.5;
  constructor(cutoff: number = 0.5) { this.setCutoff(cutoff); }
  setCutoff(cutoff: number) { this.alpha = Math.min(1, Math.max(0, cutoff)); }
  process(sample: number): number {
    const out = this.alpha * sample + (1 - this.alpha) * this.lastOut;
    this.lastOut = out;
    return out;
  }
}

export class Chorus {
  private buffer: Float32Array;
  private writePos: number = 0;
  private phase: number = 0;
  constructor(size: number = 4410) { this.buffer = new Float32Array(size); }
  process(sample: number, depth: number = 0.5, rate: number = 0.02): number {
    this.buffer[this.writePos] = sample;
    this.phase = (this.phase + rate) % (Math.PI * 2);
    const mod = (Math.sin(this.phase) + 1) * 0.5 * depth;
    const delaySamples = 20 + mod * 40;
    let readPos = this.writePos - delaySamples;
    if (readPos < 0) readPos += this.buffer.length;
    const delayed = this.buffer[Math.floor(readPos)];
    this.writePos = (this.writePos + 1) % this.buffer.length;
    return sample * 0.7 + delayed * 0.3;
  }
}

export function getTapeHiss(intensity: number = 0.005): number {
  return (Math.random() * 2 - 1) * intensity;
}

export class VinylCrackle {
  process(intensity: number = 0.01): number {
    if (Math.random() > 0.9995) return (Math.random() * 2 - 1) * 0.1 * intensity;
    return (Math.random() * 2 - 1) * 0.05 * intensity;
  }
}

export class Widener {
  process(left: number, right: number, width: number = 1.2): { l: number; r: number } {
    const mid = (left + right) * 0.5;
    const side = (left - right) * 0.5;
    const widenedSide = side * width;
    return { l: mid + widenedSide, r: mid - widenedSide };
  }
}

export class GranularTexture {
  private grains: Array<{ frequency: number; amplitude: number; phase: number; life: number; maxLife: number }> = [];
  private readonly maxGrains = 12;
  process(baseFreq: number, sampleRate: number): number {
    if (this.grains.length < this.maxGrains && Math.random() > 0.98) {
      const life = sampleRate * (0.2 + Math.random() * 0.5);
      this.grains.push({
        frequency: baseFreq * (0.99 + Math.random() * 0.02),
        amplitude: 0.05 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2,
        life: life,
        maxLife: life
      });
    }
    let output = 0;
    for (let i = this.grains.length - 1; i >= 0; i--) {
      const grain = this.grains[i];
      const env = Math.sin((grain.life / grain.maxLife) * Math.PI);
      output += Math.sin(grain.phase) * grain.amplitude * env;
      grain.phase = (grain.phase + (Math.PI * 2 * grain.frequency) / sampleRate) % (Math.PI * 2);
      grain.life--;
      if (grain.life <= 0) this.grains.splice(i, 1);
    }
    return output;
  }
}

export class Reverb {
  private combFilters: Array<{ buffer: Float32Array; pos: number; damp: number }>;
  private allPassFilters: Array<{ buffer: Float32Array; pos: number }>;
  constructor() {
    const combLengths = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
    this.combFilters = combLengths.map(len => ({ buffer: new Float32Array(len), pos: 0, damp: 0.2 }));
    const apLengths = [225, 341, 441, 556];
    this.allPassFilters = apLengths.map(len => ({ buffer: new Float32Array(len), pos: 0 }));
  }
  process(sample: number, roomSize: number = 0.8, damp: number = 0.5): number {
    let output = 0;
    for (const cf of this.combFilters) {
      const delayed = cf.buffer[cf.pos];
      cf.buffer[cf.pos] = sample + delayed * roomSize * (1 - damp);
      output += delayed;
      cf.pos = (cf.pos + 1) % cf.buffer.length;
    }
    let signal = output;
    for (const apf of this.allPassFilters) {
      const delayed = apf.buffer[apf.pos];
      const feed = signal + delayed * 0.5;
      apf.buffer[apf.pos] = feed;
      signal = delayed - feed * 0.5;
      apf.pos = (apf.pos + 1) % apf.buffer.length;
    }
    return signal * 0.2;
  }
}

export class SidechainDucker {
  private envelope: number = 0;
  process(signal: number, trigger: number, amount: number = 0.8): number {
    const absTrigger = Math.abs(trigger);
    if (absTrigger > this.envelope) this.envelope = absTrigger;
    else this.envelope *= 0.999;
    const attenuation = 1.0 - (this.envelope * amount);
    return signal * Math.max(0.1, attenuation);
  }
}

export class TiltEQ {
  private lpLast: number = 0;
  process(sample: number, tilt: number = 0.5): number {
    const freq = 0.1;
    const lp = freq * sample + (1 - freq) * this.lpLast;
    this.lpLast = lp;
    const hp = sample - lp;
    const lowGain = 1.0 + (0.5 - tilt) * 1.5;
    const highGain = 1.0 + (tilt - 0.5) * 1.5;
    return (lp * lowGain) + (hp * highGain);
  }
}

export class CyberFilter {
  private v1: number = 0;
  private v2: number = 0;
  process(sample: number, cutoff: number, resonance: number): number {
    const safeCutoff = Math.min(0.99, Math.max(0.01, cutoff));
    const g = Math.tan(Math.PI * safeCutoff * 0.5);
    const k = 2.0 - 2.0 * resonance;
    const a1 = 1.0 / (1.0 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = sample - this.v2;
    const v1 = this.v1 + a2 * v3;
    const v2 = this.v2 + a2 * this.v1 + a3 * v3;
    this.v1 = v1;
    this.v2 = v2;
    return v1;
  }
}

export class AionLimiter {
  process(sample: number, threshold: number = 0.95): number {
    const abs = Math.abs(sample);
    if (abs <= threshold) return sample;
    const sign = sample > 0 ? 1 : -1;
    const over = abs - threshold;
    return sign * (threshold + (over / (1 + over)));
  }
}

export class Aion808 {
  process(time: number, trigger: boolean, frequency: number = 55): number {
    if (!trigger) return 0;
    const pitchEnv = Math.exp(-time * 15);
    const freq = frequency * (1 + pitchEnv);
    const ampEnv = Math.exp(-time * 4);
    return Math.sin(time * Math.PI * 2 * freq) * ampEnv;
  }
}

export class AionEPiano {
  process(time: number, frequency: number): number {
    const f1 = Math.sin(time * Math.PI * 2 * frequency) * 0.6;
    const f2 = Math.sin(time * Math.PI * 2 * frequency * 2.001) * 0.2;
    const f3 = Math.sin(time * Math.PI * 2 * frequency * 3.002) * 0.1;
    const env = Math.exp(-time * 1.5);
    return (f1 + f2 + f3) * env;
  }
}

export class NebulaPad {
  private phase: number = 0;
  process(time: number, frequency: number, sampleRate: number): number {
    this.phase = (this.phase + (frequency / sampleRate)) % 1.0;
    const lfo = Math.sin(time * 0.5) * 0.02;
    const s1 = ( (this.phase * (1.0 + lfo)) % 1.0 ) * 2 - 1;
    const s2 = ( ((this.phase * 1.005) * (1.0 - lfo)) % 1.0 ) * 2 - 1;
    return (s1 + s2) * 0.2;
  }
}

export class PulseLead {
  process(time: number, frequency: number): number {
    const pwm = 0.5 + Math.sin(time * 2) * 0.4;
    return (Math.sin(time * Math.PI * 2 * frequency) > (pwm * 2 - 1)) ? 0.3 : -0.3;
  }
}

export function applyMasterTone(sample: number): number {
  return Math.tanh(sample * 1.1) * 0.95;
}

export function generateMidiData(notes: Array<{ pitch: number; start: number; duration: number }>): Buffer {
  // Simple MIDI Type 0 header
  const header = Buffer.from([
    0x4d, 0x54, 0x68, 0x64, // MThd
    0x00, 0x00, 0x00, 0x06, // Header size
    0x00, 0x00,             // Format 0
    0x00, 0x01,             // 1 track
    0x01, 0xe0              // 480 ticks per quarter note
  ]);

  // Track data
  let trackData = Buffer.alloc(0);
  const addEvent = (deltaTime: number, status: number, data1: number, data2: number) => {
    // Very simple VLQ for delta time (only supporting small values for demo)
    const v = deltaTime & 0x7f;
    trackData = Buffer.concat([trackData, Buffer.from([v, status, data1, data2])]);
  };

  // Convert notes to MIDI events (simplified)
  notes.sort((a, b) => a.start - b.start);
  let lastTime = 0;
  for (const note of notes) {
    const startDelta = Math.round((note.start - lastTime) * 1000);
    addEvent(startDelta, 0x90, note.pitch, 0x64); // Note on
    const endDelta = Math.round(note.duration * 1000);
    addEvent(endDelta, 0x80, note.pitch, 0x00); // Note off
    lastTime = note.start + note.duration;
  }

  // End of track
  trackData = Buffer.concat([trackData, Buffer.from([0x00, 0xff, 0x2f, 0x00])]);

  const trackHeader = Buffer.from([
    0x4d, 0x54, 0x72, 0x6b, // MTrk
    (trackData.length >> 24) & 0xff,
    (trackData.length >> 16) & 0xff,
    (trackData.length >> 8) & 0xff,
    trackData.length & 0xff
  ]);

  return Buffer.concat([header, trackHeader, trackData]);
}

/**
 * NEBULA DRUM MACHINE
 * 100% Synthetic Cyberpunk Percussion.
 */

/**
 * CYBER-KICK: High-impact synthetic kick.
 */
export class CyberKick {
  process(time: number, trigger: boolean): number {
    if (!trigger) return 0;
    // Fast frequency sweep (from 150Hz to 40Hz)
    const freq = 40 + 110 * Math.exp(-time * 40);
    // Envelope with heavy initial transient
    const env = Math.exp(-time * 12);
    // Royal-blue saturation
    const raw = Math.sin(time * Math.PI * 2 * freq) * env;
    return Math.tanh(raw * 1.5);
  }
}

/**
 * NEON-SNARE: Synthetic noise-based snare.
 */
export class NeonSnare {
  process(time: number, trigger: boolean): number {
    if (!trigger) return 0;
    // Fundamental tone
    const tone = Math.sin(time * Math.PI * 2 * 180) * Math.exp(-time * 25);
    // Noise component (Purple Hiss)
    const noise = (Math.random() * 2 - 1) * Math.exp(-time * 15);
    return (tone * 0.4 + noise * 0.6) * Math.exp(-time * 5);
  }
}

/**
 * GLITCH-HATS: Mathematical metallic hats.
 */
export class GlitchHats {
  process(time: number, trigger: boolean): number {
    if (!trigger) return 0;
    // Metallic component (high-freq sines)
    const metal = (Math.sin(time * 8000) + Math.sin(time * 12000)) * 0.5;
    // Noise component
    const noise = (Math.random() * 2 - 1);
    const env = Math.exp(-time * 60);
    return (metal * 0.3 + noise * 0.7) * env * 0.2;
  }
}
/**
 * AION-VOX: Neural Vocal Synthesis (Melodic Singing)
 * Uses formant synthesis and vibrato for human-like cyberpunk vocals.
 */
export class AionVox {
  private phase: number = 0;

  process(time: number, frequency: number, lyrics: string | null, sampleRate: number = 22050): number {
    if (!lyrics) return 0;

    // Vibrato
    const vibrato = Math.sin(time * Math.PI * 2 * 6) * 0.01;
    const freq = frequency * (1 + vibrato);

    this.phase = (this.phase + (freq / sampleRate)) % 1.0;

    // Pulse-wave with resonant formant (simulating "A" or "O" vowel)
    const raw = Math.sin(this.phase * Math.PI * 2);
    const formant = Math.sin(this.phase * Math.PI * 2 * 3.5) * 0.4; // 3rd harmonic formant

    const env = Math.sin(Math.min(1, time * 2) * Math.PI / 2); // Simple breathy attack
    return (raw + formant) * env * 0.3;
  }
}

/**
 * WORLDWIDE ORCHESTRAL SUITE
 * High-fidelity generative models for global instruments.
 */

/**
 * AION-STRINGS: Violin, Viola, Cello Ensemble.
 * Uses super-saw synthesis with coordinated phase drift.
 */
export class AionStrings {
  process(time: number, frequency: number, type: 'violin' | 'cello' = 'violin'): number {
    const drift = Math.sin(time * 2) * 0.002;
    const f = frequency * (1 + drift);

    // Multiple detuned oscillators for ensemble feel
    const s1 = Math.sin(time * Math.PI * 2 * f);
    const s2 = Math.sin(time * Math.PI * 2 * f * 1.002);
    const s3 = Math.sin(time * Math.PI * 2 * f * 0.998);

    const raw = (s1 + s2 * 0.5 + s3 * 0.5) / 2;
    // Bowing noise (breathy high-end)
    const bow = (Math.random() * 2 - 1) * 0.02 * Math.exp(-time * 0.1);

    const env = type === 'violin' ? Math.min(1, time * 2) : Math.min(1, time * 1);
    return (raw + bow) * env * 0.4;
  }
}

/**
 * AION-BRASS: Trumpet, Tuba, Horns.
 * Uses filtered saw waves for "bite."
 */
export class AionBrass {
  process(time: number, frequency: number): number {
    const saw = ( (time * frequency) % 1.0 ) * 2 - 1;
    // Fast filter envelope for the "parp" sound
    const filterEnv = Math.exp(-time * 10);
    const filtered = saw * (0.3 + filterEnv * 0.7);

    const ampEnv = Math.min(1, time * 20) * Math.exp(-time * 0.5);
    return filtered * ampEnv * 0.3;
  }
}

/**
 * AION-FLUTE: Ethereal Woodwinds.
 * Sine waves with significant breath noise and vibrato.
 */
export class AionFlute {
  process(time: number, frequency: number): number {
    const vibrato = 1 + Math.sin(time * Math.PI * 2 * 5) * 0.01;
    const sine = Math.sin(time * Math.PI * 2 * frequency * vibrato);
    const breath = (Math.random() * 2 - 1) * 0.15;

    const env = Math.min(1, time * 5) * Math.exp(-time * 0.2);
    return (sine + breath) * env * 0.25;
  }
}

/**
 * AION-GUITAR: Karplus-Strong Physical Model.
 * Synthesizes plucked strings.
 */
export class AionGuitar {
  private buffer: Float32Array = new Float32Array(1024);
  private pos: number = 0;

  init(frequency: number, sampleRate: number) {
    const size = Math.floor(sampleRate / frequency);
    this.buffer = new Float32Array(size);
    for(let i=0; i<size; i++) this.buffer[i] = Math.random() * 2 - 1;
  }

  process(): number {
    const val = this.buffer[this.pos];
    const nextPos = (this.pos + 1) % this.buffer.length;
    const nextVal = this.buffer[nextPos];

    // Average and dampen
    const out = (val + nextVal) * 0.5 * 0.996;
    this.buffer[this.pos] = out;
    this.pos = nextPos;

    return out * 0.5;
  }
}

/**
 * WORLD-PERC: Djembe, Tabla, Hand Drums.
 */
export class WorldPerc {
  process(time: number, trigger: boolean): number {
    if (!trigger) return 0;
    // Thump component
    const freq = 120 * Math.exp(-time * 30);
    const tone = Math.sin(time * Math.PI * 2 * freq);
    const env = Math.exp(-time * 15);
    return tone * env * 0.4;
  }
}
/**
 * LEGENDARY LIBRARY OF CONGRESS SUITE
 * High-fidelity generative models based on historic artifacts.
 */

/**
 * STRADIVARIUS-NODE: Modeling the "Betts" (1704) and "Ward" (1700) Violins.
 * Focuses on rich, complex harmonic resonances and "Cremanese" warmth.
 */
export class StradivariusNode {
  process(time: number, frequency: number): number {
    const f = frequency * (1 + Math.sin(time * Math.PI * 2 * 5.5) * 0.003); // Natural vibrato
    const s1 = Math.sin(time * Math.PI * 2 * f);
    const s2 = Math.sin(time * Math.PI * 2 * f * 2.01) * 0.3; // Complex harmonics
    const s3 = Math.sin(time * Math.PI * 2 * f * 3.02) * 0.15;

    // "Varnish" saturation (adds that classic high-end sheen)
    const raw = (s1 + s2 + s3) * 0.5;
    return Math.tanh(raw * 1.2);
  }
}

/**
 * MADISON-CRYSTAL: James Madison's 1813 Crystal Flute.
 * Pure, leaded-glass transparency with ethereal "shimmer."
 */
export class CrystalFluteNode {
  process(time: number, frequency: number): number {
    const sine = Math.sin(time * Math.PI * 2 * frequency);
    const glassResonance = Math.sin(time * Math.PI * 2 * frequency * 4.0) * 0.05;
    const breath = (Math.random() * 2 - 1) * 0.02;

    const env = Math.min(1, time * 10) * Math.exp(-time * 0.1);
    return (sine + glassResonance + breath) * env * 0.3;
  }
}

/**
 * BUCHLA-MODULAR: Buchla Model 100 Modular Synthesizer.
 * West-coast style synthesis (wavefolding and non-linear modulation).
 */
export class BuchlaNode {
  process(time: number, frequency: number): number {
    const lfo = Math.sin(time * 0.2);
    const modFreq = frequency * (1 + lfo * 0.5);
    const raw = Math.sin(time * Math.PI * 2 * modFreq);

    // Wavefolding logic: fold values back when they exceed threshold
    const fold = (x: number) => {
      const threshold = 0.7;
      if (Math.abs(x) < threshold) return x;
      return (threshold - (Math.abs(x) - threshold)) * (x > 0 ? 1 : -1);
    };

    return fold(raw) * 0.4;
  }
}

/**
 * LANDOWSKA-HARPSICHORD: Pleyel Harpsichord model.
 * Plucked keyboard synthesis with sharp transients.
 */
export class HarpsichordNode {
  process(time: number, frequency: number): number {
    const saw = ((time * frequency) % 1.0) * 2 - 1;
    const pluck = (Math.random() * 2 - 1) * Math.exp(-time * 100) * 0.1;

    const env = Math.exp(-time * 4);
    return (saw * 0.4 + pluck) * env * 0.25;
  }
}

/**
 * THAI-KHLUI: Traditional flute from the King Bhumibol collection.
 */
export class KhluiNode {
  process(time: number, frequency: number): number {
    const f = frequency * (1 + Math.sin(time * 8) * 0.02);
    const triangle = Math.abs((time * f) % 1.0 - 0.5) * 4 - 1;
    const breath = (Math.random() * 2 - 1) * 0.08;

    const env = Math.min(1, time * 15) * Math.exp(-time * 0.3);
    return (triangle * 0.5 + breath) * env * 0.2;
  }
}
