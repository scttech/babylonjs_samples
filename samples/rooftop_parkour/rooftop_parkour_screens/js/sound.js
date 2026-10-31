// Sound: made in code, with Web Audio, so there is no file to download and no sound that is not tuned to the game. Each sound is a short list of layers (a tone that
// slides from one pitch to another, or a burst of noise through a filter), each with its own length and loudness, in a table; `soundPlan` works out the layers for a
// sound at a strength; and `Sound` plays a plan through a Web Audio context. The footsteps are paced by how fast the runner goes (FootstepClock), and what
// the runner does is turned into sounds by plain functions. A browser lets a page make sound only after the player has touched it, which is why the Play button
// is where it begins (`unlock`). See ../tests/sound.tests.js.

// A layer is { kind: "tone" | "noise", wave (for a tone), from and to (the pitch of a tone, in hertz, at the start and the end), filter and freq (what noise goes
// through: "lowpass", "highpass" or "bandpass", and its frequency), delay and length (seconds), gain (0 to 1) }.
const SOUNDS = {
  step: { layers: [{ kind: "noise", filter: "lowpass", freq: 700, length: 0.06, gain: 0.07 }] },
  jump: { layers: [{ kind: "tone", wave: "sine", from: 190, to: 380, length: 0.13, gain: 0.18 }, { kind: "noise", filter: "bandpass", freq: 1100, length: 0.09, gain: 0.07 }] },
  land: { layers: [{ kind: "tone", wave: "sine", from: 120, to: 45, length: 0.2, gain: 0.5 }, { kind: "noise", filter: "lowpass", freq: 500, length: 0.14, gain: 0.3 }] },
  roll: { layers: [{ kind: "noise", filter: "lowpass", freq: 600, length: 0.4, gain: 0.25 }, { kind: "tone", wave: "sine", from: 90, to: 60, length: 0.25, gain: 0.3 }] },
  grab: { layers: [{ kind: "noise", filter: "bandpass", freq: 1800, length: 0.07, gain: 0.2 }, { kind: "tone", wave: "triangle", from: 260, to: 180, length: 0.12, gain: 0.2 }] },
  climb: { layers: [{ kind: "noise", filter: "bandpass", freq: 700, length: 0.35, gain: 0.14 }, { kind: "tone", wave: "triangle", from: 150, to: 200, length: 0.3, gain: 0.1 }] },
  vault: { layers: [{ kind: "noise", filter: "bandpass", freq: 1400, length: 0.28, gain: 0.2 }, { kind: "tone", wave: "sine", from: 300, to: 160, length: 0.16, gain: 0.12 }] },
  mantle: { layers: [{ kind: "noise", filter: "lowpass", freq: 900, length: 0.3, gain: 0.18 }, { kind: "tone", wave: "triangle", from: 140, to: 220, length: 0.25, gain: 0.12 }] },
  kick: { layers: [{ kind: "tone", wave: "sine", from: 200, to: 70, length: 0.16, gain: 0.4 }, { kind: "noise", filter: "bandpass", freq: 1600, length: 0.1, gain: 0.2 }] },
  token: { layers: [{ kind: "tone", wave: "sine", from: 880, to: 880, length: 0.14, gain: 0.22 }, { kind: "tone", wave: "sine", from: 1320, to: 1320, delay: 0.07, length: 0.22, gain: 0.2 }] },
  checkpoint: { layers: [{ kind: "tone", wave: "triangle", from: 520, to: 520, length: 0.12, gain: 0.25 }, { kind: "tone", wave: "triangle", from: 780, to: 780, delay: 0.1, length: 0.2, gain: 0.25 }] },
  finish: { layers: [{ kind: "tone", wave: "triangle", from: 523, to: 523, length: 0.18, gain: 0.25 }, { kind: "tone", wave: "triangle", from: 659, to: 659, delay: 0.14, length: 0.18, gain: 0.25 }, { kind: "tone", wave: "triangle", from: 784, to: 784, delay: 0.28, length: 0.4, gain: 0.28 }] },
  combo: { layers: [{ kind: "tone", wave: "sawtooth", from: 330, to: 660, length: 0.25, gain: 0.12 }, { kind: "tone", wave: "triangle", from: 990, to: 990, delay: 0.18, length: 0.3, gain: 0.2 }] },
  click: { layers: [{ kind: "tone", wave: "square", from: 600, to: 400, length: 0.04, gain: 0.08 }] },
};

// The layers of a sound at a strength (0 to 1 and over: how hard a landing was, how fast the steps are): every gain is multiplied by it, a stronger
// sound is a little longer, and nothing is louder than 1. An unknown sound has no layers.
function soundPlan(name, strength = 1, table = SOUNDS) {
  const sound = table[name];
  if (!sound) return [];
  const s = Math.max(0, strength);
  return sound.layers.map((layer) => ({ ...layer, delay: layer.delay || 0, gain: Math.min(1, layer.gain * s), length: layer.length * (0.8 + 0.2 * Math.min(1, s)) }));
}

// The sound of each move the flow knows of (the kinds of moveEvents).
const MOVE_SOUNDS = { jump: "jump", roll: "roll", grab: "grab", climb: "climb", vault: "vault", mantle: "mantle", kick: "kick" };

// The numbers of the sounds the body makes by itself. A landing is heard when the fall was at least `minImpact` m/s, and is as strong as the fall was fast compared
// with `hardImpact`. A step is heard every `stride` metres run, when the body is on the ground and going at least `minSpeed`.
const BODY_SOUND = { minImpact: 3, hardImpact: 14, stride: 1.7, minSpeed: 0.8 };

// The landing sound for a fall that has just ended, as { name, strength }, or null if the fall was too small to hear.
function landingSound(impact, table = BODY_SOUND) {
  if (impact < table.minImpact) return null;
  return { name: "land", strength: Math.min(1.5, impact / table.hardImpact) };
}

// Says when a foot comes down: told how far the body has gone and whether it is on the ground, it answers true every `stride` metres.
class FootstepClock {
  constructor(table = BODY_SOUND) {
    this.table = table;
    this.travelled = 0;
  }

  update(dt, speed, grounded) {
    if (!grounded || speed < this.table.minSpeed) {
      this.travelled = this.table.stride * 0.5; // the next foot comes soon after it starts to move again
      return false;
    }
    this.travelled += speed * dt;
    if (this.travelled < this.table.stride) return false;
    this.travelled -= this.table.stride;
    return true;
  }
}

class Sound {
  // `context` is a Web Audio context (or anything like one, to test with). With none, `unlock` makes the page's.
  constructor(context = null, table = SOUNDS) {
    this.context = context;
    this.table = table;
    this.volume = 0.7;
    this.master = null;
    this.noise = null;
    if (context) this._build();
  }

  _build() {
    const context = this.context;
    this.master = context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(context.destination);
    // one second of noise, made once and shared by every burst
    this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  // Makes the context (a browser only allows it from a touch of the page) and wakes it. Says whether there is sound.
  unlock() {
    if (!this.context) {
      const Context = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
      if (!Context) return false;
      this.context = new Context();
      this._build();
    }
    if (this.context.state === "suspended" && this.context.resume) this.context.resume();
    return true;
  }

  get ready() {
    return Boolean(this.context);
  }

  setVolume(value) {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.master) this.master.gain.value = this.volume;
  }

  // Plays a sound at a strength, now (or at `when`, in the context's time). Nothing happens if there is no sound.
  play(name, strength = 1, when = null) {
    if (!this.context) return 0;
    const context = this.context;
    const start = when === null ? context.currentTime : when;
    const layers = soundPlan(name, strength, this.table);
    for (const layer of layers) this._layer(layer, start + layer.delay);
    return layers.length;
  }

  _layer(layer, start) {
    const context = this.context;
    const envelope = context.createGain();
    const end = start + layer.length;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, layer.gain), start + Math.min(0.01, layer.length / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    envelope.connect(this.master);
    let source;
    if (layer.kind === "tone") {
      source = context.createOscillator();
      source.type = layer.wave || "sine";
      source.frequency.setValueAtTime(layer.from, start);
      if (layer.to !== layer.from) source.frequency.exponentialRampToValueAtTime(layer.to, end);
      source.connect(envelope);
    } else {
      source = context.createBufferSource();
      source.buffer = this.noise;
      const filter = context.createBiquadFilter();
      filter.type = layer.filter || "lowpass";
      filter.frequency.value = layer.freq || 1000;
      source.connect(filter);
      filter.connect(envelope);
    }
    source.start(start);
    source.stop(end + 0.02);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SOUNDS, soundPlan, MOVE_SOUNDS, BODY_SOUND, landingSound, FootstepClock, Sound };
} else {
  Object.assign(window, { SOUNDS, soundPlan, MOVE_SOUNDS, BODY_SOUND, landingSound, FootstepClock, Sound });
}
