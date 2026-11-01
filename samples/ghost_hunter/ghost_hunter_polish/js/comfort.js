// Comfort: the ways a person can have the game gentler than it comes. A game made to frighten has to be one that can be played by somebody who does not want to be
// startled, flashed at, shaken or buzzed, and that is a feature to build, not an apology. There are two things. **Calm** is a scare level of its own (a fourth button
// next to Gentle, Creepy and Terrifying) in which nothing can hurt you and nothing jumps out: the dark and the hunt remain, and the fright does not. **Comfort
// settings** are three switches that go with any level: reduce shaking and flashing (which is chosen at once if the phone is set to reduce motion), vibration, and the
// sound. They are kept in the browser, which may refuse them, and read back only when they make sense. Everything here is plain numbers and arithmetic, with the storage
// given, so a test can say what Calm changes. See ../tests/comfort.tests.js.

// What the calm level changes in the game, by the name of the level: how much of the damage of a touch is taken (none), whether a pop jumps out at the edge of the screen
// (it does not), how much of the director's intensity is used (half), and whether a strike makes the lights stutter out (it does not).
const COMFORT = {
  levels: {
    calm: { damage: 0, pops: false, intensity: 0.5, strikes: false },
  },
  normal: { damage: 1, pops: true, intensity: 1, strikes: true },
  key: "ghost-hunter.comfort",
  defaults: { reduceMotion: false, vibration: true },
  // What reducing motion takes out of the level that is chosen: the shaking, the flashing (a blackout is a flash), and the sway of the picture when sanity is low.
  reduce: { shake: 0, flash: 0, sway: false },
};

// The Calm row of the scare levels, to add to SCARE.levels.
const CALM_LEVEL = {
  label: "Calm",
  note: "No scares. Nothing can hurt you and nothing jumps out: only the dark, and the hunt.",
  volume: 0.4,
  flash: 0,
  shake: 0,
  vibrate: 0,
  silence: 0.3,
  vignette: 0.15,
  calm: true,
};

// What a level means for the game's rules, as { damage, pops, intensity, strikes } (the normal ones for a level that is not in the table).
function comfortFor(levelName, table = COMFORT) {
  return { ...table.normal, ...(table.levels[levelName] || {}) };
}

// The row of the scare level that is really used: the chosen one, with the settings applied: no shaking and no flashing if motion is reduced, and no vibration if it is off.
function effectiveLevel(level, settings, table = COMFORT) {
  const out = { ...level };
  if (settings.reduceMotion) {
    out.shake = table.reduce.shake;
    out.flash = table.reduce.flash;
  }
  if (!settings.vibration) out.vibrate = 0;
  return out;
}

// Whether the screen should sway and change colour as sanity falls: not if motion is reduced.
function swayAllowed(settings, table = COMFORT) {
  return !settings.reduceMotion || table.reduce.sway;
}

// The settings that a first visit begins with: the defaults, with motion reduced if the phone says so (`prefersReduced` is the answer to matchMedia("(prefers-reduced-motion: reduce)")).
function firstSettings(prefersReduced, table = COMFORT) {
  return { ...table.defaults, reduceMotion: Boolean(prefersReduced) || table.defaults.reduceMotion };
}

class ComfortSettings {
  // `storage` is anything with getItem, setItem and removeItem (the page's localStorage, or a stand-in).
  constructor(storage, prefersReduced = false, table = COMFORT) {
    this.storage = storage;
    this.table = table;
    let raw = null;
    try {
      raw = JSON.parse(storage.getItem(table.key));
    } catch (error) {
      raw = null; // nothing kept, unreadable, or storage that throws
    }
    const first = firstSettings(prefersReduced, table);
    const kept = raw && typeof raw === "object" ? raw : {};
    this.reduceMotion = typeof kept.reduceMotion === "boolean" ? kept.reduceMotion : first.reduceMotion;
    this.vibration = typeof kept.vibration === "boolean" ? kept.vibration : first.vibration;
  }

  toJSON() {
    return { reduceMotion: this.reduceMotion, vibration: this.vibration };
  }

  // Changes a setting (a name that is one of the two) to a yes or a no, and keeps it. Gives whether it was kept.
  set(name, value) {
    if (name !== "reduceMotion" && name !== "vibration") return false;
    this[name] = Boolean(value);
    try {
      this.storage.setItem(this.table.key, JSON.stringify(this));
      return true;
    } catch (error) {
      return false; // good for this visit only
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { COMFORT, CALM_LEVEL, comfortFor, effectiveLevel, swayAllowed, firstSettings, ComfortSettings };
} else {
  Object.assign(window, { COMFORT, CALM_LEVEL, comfortFor, effectiveLevel, swayAllowed, firstSettings, ComfortSettings });
}
