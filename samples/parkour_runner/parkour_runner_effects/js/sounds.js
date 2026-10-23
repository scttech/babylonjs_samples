// The game's sounds, made with the Web Audio API instead of sound files: each one is a
// few beeps and bursts of noise described as data, and played by wiring up
// oscillators for as long as they last. There is nothing to download and nothing to
// license. The browser won't make a sound until the player has done something on the
// page (a click, a key), so the sounds are "unlocked" by the first one. The audio is
// reached through a function that makes the `AudioContext`, so the tests can give it a
// stand-in. See ../tests/sounds.tests.js.

// Each sound is a list of parts, played together, each starting `start` seconds in:
//   a tone:  { wave, from, to, start, length, volume }  a pitch that glides from `from` to `to` Hz
//   a noise: { noise: true, filter, start, length, volume }  a rush of noise, with its highs cut off above `filter` Hz
const SOUNDS = {
  coin: [
    { wave: "square", from: 988, to: 988, start: 0, length: 0.07, volume: 0.18 }, // B
    { wave: "square", from: 1319, to: 1319, start: 0.07, length: 0.2, volume: 0.18 }, // and the E above it
  ],
  jump: [{ wave: "square", from: 260, to: 620, start: 0, length: 0.16, volume: 0.16 }],
  vault: [
    { wave: "triangle", from: 200, to: 520, start: 0, length: 0.2, volume: 0.24 },
    { noise: true, filter: 2500, start: 0, length: 0.12, volume: 0.08 },
  ],
  slide: [{ noise: true, filter: 1800, start: 0, length: 0.35, volume: 0.18 }],
  roll: [
    { noise: true, filter: 900, start: 0, length: 0.3, volume: 0.2 },
    { wave: "sine", from: 180, to: 90, start: 0, length: 0.3, volume: 0.15 },
  ],
  crash: [
    { noise: true, filter: 1200, start: 0, length: 0.5, volume: 0.4 },
    { wave: "sawtooth", from: 160, to: 40, start: 0, length: 0.45, volume: 0.3 },
  ],
  combo: [
    { wave: "square", from: 523, to: 523, start: 0, length: 0.09, volume: 0.15 }, // C, E, G, and C an octave up
    { wave: "square", from: 659, to: 659, start: 0.08, length: 0.09, volume: 0.15 },
    { wave: "square", from: 784, to: 784, start: 0.16, length: 0.09, volume: 0.15 },
    { wave: "square", from: 1047, to: 1047, start: 0.24, length: 0.25, volume: 0.15 },
  ],
  best: [
    { wave: "triangle", from: 523, to: 523, start: 0, length: 0.14, volume: 0.25 },
    { wave: "triangle", from: 659, to: 659, start: 0.13, length: 0.14, volume: 0.25 },
    { wave: "triangle", from: 784, to: 784, start: 0.26, length: 0.14, volume: 0.25 },
    { wave: "triangle", from: 1047, to: 1047, start: 0.39, length: 0.14, volume: 0.25 },
    { wave: "triangle", from: 1319, to: 1319, start: 0.52, length: 0.45, volume: 0.25 },
  ],
};
const MASTER_VOLUME = 0.6; // every volume above is multiplied by this
const SILENCE = 0.0001; // an exponential fade can't reach 0, so it fades to this

// Makes the browser's audio context. (Some older browsers call it by another name.)
function createAudioContext() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) throw new Error("This browser has no Web Audio");
  return new Context();
}

class Sounds {
  constructor({ createContext = createAudioContext, muted = false } = {}) {
    this.createContext = createContext;
    this.muted = muted;
    this.context = null; // made by unlock(), once the player has done something
    this.noise = null; // a second of random samples, made once, that the noise parts play
  }

  // Makes the audio context, or wakes it if the browser started it asleep. Call it from
  // a click or a key press. Safe to call as often as you like. Says whether there is
  // sound to be had: it can't if the browser has no Web Audio.
  unlock() {
    if (!this.context) {
      try {
        this.context = this.createContext();
      } catch (error) {
        this.context = null;
        return false;
      }
    }
    if (this.context.state === "suspended") this.context.resume();
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
  }

  // The noise: a buffer of random samples, made the first time one is needed.
  _noiseBuffer() {
    if (!this.noise) {
      const { sampleRate } = this.context;
      this.noise = this.context.createBuffer(1, sampleRate, sampleRate);
      const samples = this.noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  // Makes a gain node that starts at `volume` and fades away over `length` seconds from `at`,
  // and joins it to the speakers. Everything a part makes goes through one.
  _fade(at, length, volume) {
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume * MASTER_VOLUME, at);
    gain.gain.exponentialRampToValueAtTime(SILENCE, at + length);
    gain.connect(this.context.destination);
    return gain;
  }

  // Plays the named sound. `rate` multiplies every pitch: 1 is as written, 1.5 is a fifth
  // higher. Says whether anything was played: not when muted, or before unlock().
  play(name, { rate = 1 } = {}) {
    const parts = SOUNDS[name];
    if (!parts) throw new Error(`There is no sound called "${name}"`);
    if (this.muted || !this.context) return false;

    const now = this.context.currentTime;
    for (const part of parts) {
      const at = now + part.start;
      const gain = this._fade(at, part.length, part.volume);
      if (part.noise) {
        const source = this.context.createBufferSource();
        source.buffer = this._noiseBuffer();
        const filter = this.context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(part.filter * rate, at);
        source.connect(filter);
        filter.connect(gain);
        source.start(at);
        source.stop(at + part.length);
      } else {
        const oscillator = this.context.createOscillator();
        oscillator.type = part.wave;
        oscillator.frequency.setValueAtTime(part.from * rate, at);
        oscillator.frequency.exponentialRampToValueAtTime(part.to * rate, at + part.length);
        oscillator.connect(gain);
        oscillator.start(at);
        oscillator.stop(at + part.length);
      }
    }
    return true;
  }
  
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SOUNDS, MASTER_VOLUME, SILENCE, createAudioContext, Sounds };
} else {
  Object.assign(window, { SOUNDS, MASTER_VOLUME, SILENCE, createAudioContext, Sounds });
}
