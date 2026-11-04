// Sound effects, made in code: no sound files. Each effect is a short list of notes (a tone that glides from one pitch to another, or a
// burst of noise), shaped by an envelope and played through the Web Audio graph. A table says what each is made of, so a sound is changed
// or added by a line; the notes are scheduled by a function that works on any audio context, so a test can render an effect into a buffer
// and look at the numbers. The music (music.js) goes through the same graph, so that one master volume and one mute reach everything.
// See ../tests/audio.tests.js.

const AUDIO = {
  master: 0.8, // the loudness of everything
  sfx: 0.7, // of the effects, before the master
  music: 0.5, // of the music, before the master
  voices: 20, // the most effects that may be sounding at once
  ramp: 0.05, // seconds that the master takes to go to a new volume (a click is heard if it jumps)
};

// What each effect is made of. `gap` is how soon after it was last played it may be played again (a combo of six flames is not six
// bangs). A note is `{ wave, from, to, at, seconds, volume, attack }`: a tone of that wave (`sine`, `triangle`, `square` or `sawtooth`) or `noise`,
// that starts at `at` seconds, lasts `seconds`, and glides from the pitch `from` to the pitch `to` (for noise they are the two ends of
// the pitches that are let through). `attack` is how long it takes to get to its volume, which is a little for a click and a long time for
// a horn.
const SOUNDS = {
  build: { gap: 0.05, notes: [{ wave: "sine", from: 170, to: 70, at: 0, seconds: 0.14, volume: 0.9 }, { wave: "noise", from: 1800, to: 900, at: 0, seconds: 0.06, volume: 0.4 }] },
  upgrade: { gap: 0.05, notes: [{ wave: "triangle", from: 523, to: 523, at: 0, seconds: 0.12, volume: 0.5 }, { wave: "triangle", from: 659, to: 659, at: 0.07, seconds: 0.12, volume: 0.5 }, { wave: "triangle", from: 784, to: 784, at: 0.14, seconds: 0.28, volume: 0.5 }] },
  sell: { gap: 0.05, notes: [{ wave: "square", from: 988, to: 1318, at: 0, seconds: 0.07, volume: 0.25 }, { wave: "square", from: 1318, to: 1318, at: 0.07, seconds: 0.18, volume: 0.25 }] },
  refuse: { gap: 0.15, notes: [{ wave: "sawtooth", from: 120, to: 85, at: 0, seconds: 0.2, volume: 0.35 }] },
  click: { gap: 0.03, notes: [{ wave: "noise", from: 2500, to: 2500, at: 0, seconds: 0.03, volume: 0.35 }] },
  shot_push: { gap: 0.08, notes: [{ wave: "noise", from: 700, to: 2600, at: 0, seconds: 0.3, volume: 0.5, attack: 0.1 }] },
  shot_slow: { gap: 0.08, notes: [{ wave: "sine", from: 650, to: 280, at: 0, seconds: 0.22, volume: 0.5 }, { wave: "noise", from: 900, to: 400, at: 0, seconds: 0.12, volume: 0.2 }] },
  shot_stun: { gap: 0.08, notes: [{ wave: "sine", from: 95, to: 55, at: 0, seconds: 0.22, volume: 0.9 }, { wave: "noise", from: 400, to: 200, at: 0, seconds: 0.08, volume: 0.35 }] },
  shot_burn: { gap: 0.1, notes: [{ wave: "noise", from: 2400, to: 700, at: 0, seconds: 0.2, volume: 0.3 }, { wave: "sawtooth", from: 240, to: 110, at: 0, seconds: 0.14, volume: 0.12 }] },
  defeated: { gap: 0.04, notes: [{ wave: "sine", from: 520, to: 880, at: 0, seconds: 0.1, volume: 0.4 }] },
  leaked: { gap: 0.2, notes: [{ wave: "triangle", from: 330, to: 200, at: 0, seconds: 0.4, volume: 0.6 }] },
  wave: { gap: 1, notes: [{ wave: "sawtooth", from: 196, to: 196, at: 0, seconds: 0.9, volume: 0.35, attack: 0.15 }, { wave: "sawtooth", from: 294, to: 294, at: 0, seconds: 0.9, volume: 0.25, attack: 0.15 }] },
  cleared: { gap: 0.5, notes: [{ wave: "triangle", from: 660, to: 660, at: 0, seconds: 0.2, volume: 0.5 }, { wave: "triangle", from: 880, to: 880, at: 0.12, seconds: 0.4, volume: 0.5 }] },
  won: { gap: 1, notes: [{ wave: "triangle", from: 523, to: 523, at: 0, seconds: 0.2, volume: 0.55 }, { wave: "triangle", from: 659, to: 659, at: 0.18, seconds: 0.2, volume: 0.55 }, { wave: "triangle", from: 784, to: 784, at: 0.36, seconds: 0.2, volume: 0.55 }, { wave: "triangle", from: 1047, to: 1047, at: 0.54, seconds: 0.8, volume: 0.55 }] },
  lost: { gap: 1, notes: [{ wave: "sawtooth", from: 392, to: 196, at: 0, seconds: 1.1, volume: 0.35, attack: 0.05 }] },
};

// What the game says happened (an event, and perhaps what kind) as the name of a sound: a shot is the sound of the nation that threw
// it, which is the effect that it carries (a shot with none is the sound of the nation that has none: there isn't one, and it is silent).
function soundFor(event, detail = null) {
  if (event === "shot") return detail ? `shot_${detail}` : null;
  return Object.hasOwn(SOUNDS, event) ? event : null;
}

// The notes of an effect, with every pitch multiplied by `factor` (so that the same effect, heard again, is a little different, and a
// hundred of them are not a machine). A note that is not noise is made higher or lower; noise is made brighter or darker.
function soundPlan(name, factor = 1) {
  return SOUNDS[name].notes.map((note) => ({ attack: 0.005, ...note, from: note.from * factor, to: note.to * factor }));
}

// How long an effect lasts, in seconds: the end of its last note.
function soundLength(name) {
  return Math.max(...SOUNDS[name].notes.map((note) => note.at + note.seconds));
}

// One second of white noise, made once and used by every effect that has noise in it.
function makeNoise(context) {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

// Puts a note into an audio context, to start at `when` (the context's own time), going to `destination`. It says when the note ends.
function scheduleNote(context, destination, note, when, noise = null) {
  const start = when + note.at;
  const end = start + note.seconds;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(note.volume, start + Math.min(note.attack, note.seconds / 2));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  gain.connect(destination);
  if (note.wave === "noise") {
    const source = context.createBufferSource();
    source.buffer = noise || makeNoise(context);
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(note.from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, note.to), end);
    source.connect(filter);
    filter.connect(gain);
    source.start(start);
    source.stop(end + 0.02);
    return end;
  }
  const oscillator = context.createOscillator();
  oscillator.type = note.wave;
  oscillator.frequency.setValueAtTime(note.from, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, note.to), end);
  oscillator.connect(gain);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
  return end;
}

class Sound {
  // `makeContext` makes the audio context: a normal one (a page can only make one that plays after the person has touched it), or an
  // offline one in a test.
  constructor(makeContext = () => new (window.AudioContext || window.webkitAudioContext)(), table = AUDIO) {
    this.makeContext = makeContext;
    this.table = table;
    this.context = null;
    this.muted = false;
    this.active = 0; // effects that are sounding now
    this.last = {}; // name -> when it was last played
    this.noise = null;
  }

  // Makes the context and the three volumes (the master, and one each for the effects and the music). Call it from a tap or a key. It says
  // when the context is running.
  start() {
    if (!this.context) {
      this.context = this.makeContext();
      this.master = this.context.createGain();
      this.sfx = this.context.createGain();
      this.musicBus = this.context.createGain();
      this.sfx.connect(this.master);
      this.musicBus.connect(this.master);
      this.master.connect(this.context.destination);
      this.noise = makeNoise(this.context);
      this.update();
    }
    return this.context.state === "suspended" ? this.context.resume() : Promise.resolve();
  }

  get started() {
    return this.context !== null;
  }

  // Turns the sound off, or on again. It goes to the new volume in a moment, and not at once.
  setMuted(muted) {
    this.muted = muted;
    this.update();
  }

  // Puts the volumes of the table into the graph (every frame, so that a slider that changes the table is heard).
  update() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.table.master, now, this.table.ramp);
    this.sfx.gain.value = this.table.sfx;
    this.musicBus.gain.value = this.table.music;
  }

  // Plays an effect by name, a little different each time. It says whether it was played: not before the page has been touched, not for a
  // name that isn't one, not too soon after the last, and not when there are too many already.
  play(name, factor = 0.94 + Math.random() * 0.12) {
    if (!this.context || !Object.hasOwn(SOUNDS, name) || this.muted) return false;
    const now = this.context.currentTime;
    if (Object.hasOwn(this.last, name) && now - this.last[name] < SOUNDS[name].gap) return false;
    if (this.active >= this.table.voices) return false;
    this.last[name] = now;
    this.active++;
    let end = now;
    for (const note of soundPlan(name, factor)) end = Math.max(end, scheduleNote(this.context, this.sfx, note, now, this.noise));
    setTimeout(() => this.active--, (end - now) * 1000 + 50);
    return true;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AUDIO, SOUNDS, soundFor, soundPlan, soundLength, makeNoise, scheduleNote, Sound };
} else {
  Object.assign(window, { AUDIO, SOUNDS, soundFor, soundPlan, soundLength, makeNoise, scheduleNote, Sound });
}
