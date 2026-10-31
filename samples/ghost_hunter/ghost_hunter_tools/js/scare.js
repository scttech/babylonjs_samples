// The scare, as numbers. A jump scare is not a loud noise: it is a **build-up** (the room goes quiet as something comes near), a
// **strike** (sound, flash, shake and a buzz of the phone, all at once), and an **aftershock** (the ringing that fades and the room that
// comes back). This file works out all three as plain arithmetic of distance and time, with how much of each the player has asked for
// in the **scare level**. How they are heard and seen is in audio.js and scareui.js, which only read what is worked out here.
// See ../tests/scare.tests.js.

const SCARE = {
  level: "creepy", // the level the player has chosen
  levels: {
    gentle: { label: "Gentle", note: "Soft sounds. No flashes, no shaking, a light buzz.", volume: 0.45, flash: 0, shake: 0, vibrate: 0.4, silence: 0.7, vignette: 0.4 },
    creepy: { label: "Creepy", note: "The proper thing: sudden, but not cruel.", volume: 0.8, flash: 0.5, shake: 0.5, vibrate: 1, silence: 1, vignette: 0.75 },
    terrifying: { label: "Terrifying", note: "Loud, sudden and flashing. You asked.", volume: 1, flash: 1, shake: 1, vibrate: 1.6, silence: 1.4, vignette: 1 },
  },
  tellDistance: 7, // metres: the room begins to go quiet when something is this near
  strikes: { lunge: 0.7, touch: 1 }, // how hard each kind of strike is, 0 to 1
  duration: { strike: 0.12, aftershock: 2.2 }, // seconds
  cooldown: 0.8, // seconds after a strike before another can begin (a creature that lunges twice in a breath is one scare)
  shakeHz: [31, 47], // how fast the camera shakes: two numbers that do not fit together
  shakeRadians: 0.04, // the most the view is turned by a shake at full strength
  heartBeats: [58, 150], // beats a minute: calm, and at the edge of a strike
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// The level the player has chosen: the address (?scare=gentle) wins, then what the browser kept, then the table's.
function levelWanted(search, stored, table = SCARE) {
  const asked = new URLSearchParams(search || "").get("scare");
  if (asked && asked in table.levels) return asked;
  if (stored && stored in table.levels) return stored;
  return table.level;
}

// The levels in order, and the next one round (for a button that goes through them).
function levelNames(table = SCARE) {
  return Object.keys(table.levels);
}

// How close the dread is, from 0 (nothing near) to 1 (right on you): the distance of the nearest creature, between the distance at
// which the room begins to go quiet and the distance at which it lunges.
function dreadAt(distance, lungeRange, table = SCARE) {
  return clamp01((table.tellDistance - distance) / Math.max(0.1, table.tellDistance - lungeRange));
}

// A heart rate for a dread: slow when calm, fast at the edge. `dread` is 0 to 1.
function heartRate(dread, table = SCARE) {
  const [calm, panic] = table.heartBeats;
  return calm + (panic - calm) * Math.pow(clamp01(dread), 1.2);
}

// What the room sounds like as something comes near: the loudness of the ambient hum (1 is full; it goes to nothing, a silence, and
// the silence is longer at the higher levels) and the beats of the heart a minute.
function buildUp(dread, level) {
  const quiet = Math.pow(clamp01(dread * level.silence), 1.5);
  return { ambient: 1 - quiet, heart: heartRate(dread), dread };
}

// How the phone should buzz, as a pattern of milliseconds on and off, for a strike of a strength at a level. Nothing at a level that
// does not buzz.
function vibratePattern(strength, level) {
  const scale = level.vibrate * strength;
  if (scale <= 0.05) return [];
  const on = (ms) => Math.round(ms * scale);
  return strength >= 1 ? [on(90), 40, on(60), 40, on(160)] : [on(60), 30, on(40)];
}

// How much the view is turned by a shake at a moment: [yaw, pitch] in radians, from two waves that do not fit together.
function shakeOffset(time, amplitude, table = SCARE) {
  const [a, b] = table.shakeHz;
  const yaw = Math.sin(time * a) * 0.6 + Math.sin(time * b + 1.3) * 0.4;
  const pitch = Math.sin(time * b + 0.4) * 0.6 + Math.sin(time * a * 1.3 + 2.1) * 0.4;
  return [yaw * amplitude * table.shakeRadians, pitch * amplitude * table.shakeRadians * 0.7];
}

// The view with a shake put on it: the forward direction turned by a yaw about the vertical and tipped by a pitch. `view` is
// { forward, up }; the up is turned with it.
function shakeView(view, offset) {
  const [yaw, pitch] = offset;
  const turn = ([x, y, z]) => [x * Math.cos(yaw) + z * Math.sin(yaw), y, -x * Math.sin(yaw) + z * Math.cos(yaw)];
  const forward = turn(view.forward);
  const up = turn(view.up);
  const tipped = [forward[0] + up[0] * pitch, forward[1] + up[1] * pitch, forward[2] + up[2] * pitch];
  const length = Math.hypot(...tipped) || 1;
  return { forward: tipped.map((n) => n / length), up };
}

// The strike and what comes after it. `trigger` starts it (a lunge, or a touch, which is harder); `update` gives, each frame, the numbers
// the screen and the speakers need, already scaled by the level. A strike is `fired` for one frame, which is when the sound begins and
// the phone buzzes.
class ScareSequence {
  constructor(table = SCARE) {
    this.table = table;
    this.level = table.levels[table.level];
    this.age = Infinity; // seconds since the strike (infinity: none yet)
    this.strength = 0;
    this.pending = null; // a strike that has been asked for and not fired
    this.cool = 0;
    this.strikes = 0;
  }

  setLevel(name) {
    this.level = this.table.levels[name] || this.level;
  }

  // Is a strike going on or just over? (A new one cannot start inside the cooldown, unless it is harder.)
  get busy() {
    return this.age < this.table.duration.strike + this.table.duration.aftershock * 0.4 || this.cool > 0;
  }

  // Asks for a strike of a kind ("lunge" or "touch"). Gives whether it will happen.
  trigger(kind) {
    const strength = this.table.strikes[kind] || 0.5;
    if (this.busy && strength <= this.strength) return false;
    this.pending = { kind, strength };
    return true;
  }

  update(seconds) {
    const { strike, aftershock } = this.table.duration;
    let fired = null;
    this.cool = Math.max(0, this.cool - seconds);
    if (this.pending) {
      fired = { kind: this.pending.kind, strength: this.pending.strength, vibrate: vibratePattern(this.pending.strength, this.level) };
      this.strength = this.pending.strength;
      this.age = 0;
      this.cool = this.table.cooldown;
      this.pending = null;
      this.strikes += 1;
    } else if (this.age !== Infinity) {
      this.age += seconds;
    }
    const level = this.level;
    let flash = 0, shake = 0, ambient = 1;
    if (this.age <= strike + aftershock) {
      const into = this.age;
      const decay = into < strike ? 1 : Math.pow(1 - (into - strike) / aftershock, 2);
      flash = this.strength * level.flash * decay;
      shake = this.strength * level.shake * decay;
      ambient = into < strike ? 0 : clamp01((into - strike) / aftershock); // the room comes back
    }
    return { fired, flash, shake, ambient, volume: level.volume, strength: this.strength };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCARE, levelWanted, levelNames, dreadAt, heartRate, buildUp, vibratePattern, shakeOffset, shakeView, ScareSequence };
} else {
  Object.assign(window, { SCARE, levelWanted, levelNames, dreadAt, heartRate, buildUp, vibratePattern, shakeOffset, shakeView, ScareSequence });
}
