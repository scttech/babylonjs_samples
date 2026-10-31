// Sound, made in code: no sound files. A low hum for the room, a heart that beats faster as the dread comes near, a voice for each kind
// of creature (the tick of a spider, the groan of a ghoul, the rattle of a skeleton), a creak to say that something has come in behind
// you, and the stinger of a strike. Every sound that belongs to a place is **positional**: it comes from where the creature is, through
// the Web Audio panner with head-related filtering, so with headphones a thing behind you is behind you. The pure parts (the heart, the
// space, the parameters of a voice) are tested alone; the rest is tested by rendering it into a buffer with an offline audio context and
// listening to the numbers. See ../tests/audio.tests.js.

const AUDIO = {
  master: 0.9,
  hum: { low: 48, high: 71, volume: 0.1 }, // two notes a little out of tune with each other
  heart: { volume: 0.55, pitch: 62 },
  panning: "HRTF", // how a sound is placed in the head: with the filtering of a real ear ("equalpower" is plain left and right)
  voiceDistance: 14, // metres at which a voice has faded out
  stinger: { volume: 1, seconds: 1.4 },
};

// The game has x right, y up and z ahead (left handed); Web Audio has x right, y up and z behind (right handed): a flip of z.
function toAudioSpace(v) {
  return [v[0], v[1], -v[2]];
}

// What a voice is, from the kind of creature and what it is doing: how loud, how often it sounds, and what it sounds like.
function voiceParams(kind, state, distance, table = AUDIO) {
  const near = Math.max(0, 1 - distance / table.voiceDistance);
  const active = state === "stalk" ? 1 : state === "lunge" ? 1.6 : state === "creep" ? 0.6 : state === "retreat" ? 0.35 : state === "lurk" ? 0.3 : state === "recover" ? 0.4 : 0;
  const base = {
    spider: { every: 0.11, pitch: 3400, wave: "noise", length: 0.03, loud: 0.5 }, // a tick-tick-tick of feet
    ghoul: { every: 1.7, pitch: 70, wave: "sawtooth", length: 0.9, loud: 0.8 }, // a long low groan
    skeleton: { every: 0.16, pitch: 5200, wave: "noise", length: 0.045, loud: 0.45 }, // a dry rattle
  }[kind] || { every: 1, pitch: 400, wave: "sine", length: 0.2, loud: 0.3 };
  return { ...base, gain: base.loud * near * Math.min(1, active), every: base.every / Math.max(0.3, active) };
}

// A heart: two thumps close together, then a gap, at a rate. Gives the times of the thumps in a stretch of time, from where the last
// beat left off. [{ time, strength }] and the time of the next beat.
function heartbeats(from, until, bpm) {
  const gap = 60 / bpm;
  const beats = [];
  let at = from;
  while (at < until) {
    beats.push({ time: at, strength: 1 }, { time: at + gap * 0.28, strength: 0.65 });
    at += gap;
  }
  return { beats, next: at };
}

class GhostAudio {
  // `makeContext` makes the audio context: a normal one (it can only be made after the player has touched the screen), or an
  // offline one in a test.
  constructor(makeContext = () => new (window.AudioContext || window.webkitAudioContext)(), table = AUDIO) {
    this.makeContext = makeContext;
    this.table = table;
    this.context = null;
    this.level = 1; // the scare level's volume
    this.dreadHum = 1;
    this.nextBeat = 0;
    this.heartBpm = 58;
    this.heartOn = false;
    this.voices = new Map();
  }

  get ready() {
    return this.context !== null;
  }

  // Makes the context and the hum. Call it from the tap.
  start() {
    if (!this.starting) this.starting = this._start(); // asked twice (by the game and by the music) it is made once
    return this.starting;
  }

  async _start() {
    this.context = this.makeContext();
    const context = this.context;
    try {
      if (context.resume) await context.resume(); // a phone starts it asleep until the page has been touched
    } catch (error) {
      // an offline context (a test) cannot be resumed, and does not need it
    }
    this.master = context.createGain();
    this.master.gain.value = this.table.master * this.level;
    this.master.connect(context.destination);
    this.noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.hum = context.createGain();
    this.hum.gain.value = this.table.hum.volume * this.dreadHum;
    this.hum.connect(this.master);
    for (const [frequency, detune] of [[this.table.hum.low, 0], [this.table.hum.high, 7]]) {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      oscillator.connect(this.hum);
      oscillator.start();
    }
    this.nextBeat = context.currentTime + 0.5;
  }

  // The player's ears: where they are and which way they face, in the game's world.
  setListener(player) {
    if (!this.context) return;
    const listener = this.context.listener;
    const [px, py, pz] = toAudioSpace(player.position);
    const [fx, fy, fz] = toAudioSpace(player.forward);
    const [ux, uy, uz] = toAudioSpace(player.up);
    if (listener.positionX) {
      listener.positionX.value = px;
      listener.positionY.value = py;
      listener.positionZ.value = pz;
      listener.forwardX.value = fx;
      listener.forwardY.value = fy;
      listener.forwardZ.value = fz;
      listener.upX.value = ux;
      listener.upY.value = uy;
      listener.upZ.value = uz;
    } else {
      listener.setPosition(px, py, pz);
      listener.setOrientation(fx, fy, fz, ux, uy, uz);
    }
  }

  // The scare level's volume (0 to 1), for everything.
  setVolume(volume) {
    this.level = volume;
    if (this.master) this.master.gain.value = this.table.master * volume;
  }

  // How much of the hum there is: the room going quiet as something comes near.
  setHum(amount) {
    this.dreadHum = amount;
    if (this.hum) this.hum.gain.value = this.table.hum.volume * amount;
  }

  _panner(position) {
    const panner = this.context.createPanner();
    panner.panningModel = this.table.panning;
    panner.distanceModel = "inverse";
    panner.refDistance = 1.5;
    panner.rolloffFactor = 1.2;
    const [x, y, z] = toAudioSpace(position);
    if (panner.positionX) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else {
      panner.setPosition(x, y, z);
    }
    panner.connect(this.master);
    return panner;
  }

  _noiseSource(destination, at, seconds) {
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    source.connect(destination);
    source.start(at, Math.random());
    source.stop(at + seconds);
    return source;
  }

  // A short sound of a kind at a place, at a time (now, if none). `strength` is 0 to 1.
  cue(name, position = null, strength = 1, at = null) {
    if (!this.context) return false;
    const context = this.context;
    const start = at === null ? context.currentTime : at;
    const out = position ? this._panner(position) : this.master;
    const gain = context.createGain();
    gain.connect(out);
    if (name === "creak") {
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 12;
      filter.frequency.setValueAtTime(220, start);
      filter.frequency.exponentialRampToValueAtTime(520, start + 0.9);
      filter.connect(gain);
      this._noiseSource(filter, start, 1);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.5 * strength, start + 0.15);
      gain.gain.linearRampToValueAtTime(0, start + 1);
    } else if (name === "whisper") {
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 3;
      filter.frequency.value = 2200;
      filter.connect(gain);
      this._noiseSource(filter, start, 1.6);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25 * strength, start + 0.4);
      gain.gain.linearRampToValueAtTime(0, start + 1.6);
    } else if (name === "stinger") {
      const length = this.table.stinger.seconds;
      for (const frequency of [311, 329, 466, 622]) { // notes that rub against each other
        const oscillator = context.createOscillator();
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(frequency * 2, start);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, start + length);
        oscillator.connect(gain);
        oscillator.start(start);
        oscillator.stop(start + length);
      }
      this._noiseSource(gain, start, 0.35);
      gain.gain.setValueAtTime(this.table.stinger.volume * strength * 0.5, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    } else if (name === "thud") {
      const oscillator = context.createOscillator();
      oscillator.frequency.setValueAtTime(110, start);
      oscillator.frequency.exponentialRampToValueAtTime(35, start + 0.3);
      oscillator.connect(gain);
      oscillator.start(start);
      oscillator.stop(start + 0.35);
      gain.gain.setValueAtTime(0.8 * strength, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
    } else {
      return false;
    }
    return true;
  }

  // The heart, at a rate: the beats up to a little ahead of now are scheduled, as the sound is made a moment before it is heard.
  setHeart(bpm, on = true) {
    this.heartBpm = bpm;
    this.heartOn = on;
  }

  scheduleHeart(until) {
    if (!this.context || !this.heartOn) return 0;
    const { beats, next } = heartbeats(this.nextBeat, until, this.heartBpm);
    this.nextBeat = next;
    for (const beat of beats) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.frequency.setValueAtTime(this.table.heart.pitch, beat.time);
      oscillator.frequency.exponentialRampToValueAtTime(this.table.heart.pitch * 0.55, beat.time + 0.12);
      gain.gain.setValueAtTime(this.table.heart.volume * beat.strength, beat.time);
      gain.gain.exponentialRampToValueAtTime(0.001, beat.time + 0.16);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(beat.time);
      oscillator.stop(beat.time + 0.18);
    }
    return beats.length;
  }

  // The voice of a creature: sounds now and then from where it is, as its kind and state say. `id` is the creature's.
  voice(id, kind, state, position, distance, seconds) {
    if (!this.context) return;
    const params = voiceParams(kind, state, distance, this.table);
    const voice = this.voices.get(id) || { wait: 0 };
    this.voices.set(id, voice);
    voice.wait -= seconds;
    if (voice.wait > 0 || params.gain < 0.01) return;
    voice.wait = params.every * (0.7 + Math.random() * 0.6);
    const context = this.context;
    const now = context.currentTime;
    const panner = this._panner(position);
    const gain = context.createGain();
    gain.connect(panner);
    gain.gain.setValueAtTime(params.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + params.length);
    if (params.wave === "noise") {
      const filter = context.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = params.pitch;
      filter.connect(gain);
      this._noiseSource(filter, now, params.length);
    } else {
      const oscillator = context.createOscillator();
      oscillator.type = params.wave;
      oscillator.frequency.setValueAtTime(params.pitch * 1.3, now);
      oscillator.frequency.exponentialRampToValueAtTime(params.pitch * 0.8, now + params.length);
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 400;
      oscillator.connect(filter);
      filter.connect(gain);
      oscillator.start(now);
      oscillator.stop(now + params.length);
    }
  }

  forget(id) {
    this.voices.delete(id);
  }

  // Every frame: where the player is, and the heart.
  update(seconds, player) {
    if (!this.context) return;
    this.setListener(player);
    this.scheduleHeart(this.context.currentTime + 0.4);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AUDIO, toAudioSpace, voiceParams, heartbeats, GhostAudio };
} else {
  Object.assign(window, { AUDIO, toAudioSpace, voiceParams, heartbeats, GhostAudio });
}
