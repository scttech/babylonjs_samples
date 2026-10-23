// Who is playing: a name and a runner color, remembered in the browser between visits.
// It is kept with `localStorage`, which can be missing or refuse to save (a private
// window, blocked site data), so every use of it is guarded and the game works without
// it. The same storage is used by the leaderboard. See ../tests/profile.tests.js.
const PROFILE_KEY = "parkourRunner.profile";
const NAME_MAX = 12; // the longest name, in characters
const DEFAULT_NAME = "Runner";

// The browser's storage, or null if there isn't one to use.
function browserStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch (error) {
    return null;
  }
}

// Reads a value that was saved as JSON. Anything missing, unreadable or not JSON is null.
function readJson(storage, key) {
  try {
    const text = storage && storage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch (error) {
    return null;
  }
}

// Saves a value as JSON. Says whether it worked.
function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

// Makes a name fit to show: spaces trimmed and squeezed to one, no longer than NAME_MAX,
// and DEFAULT_NAME if nothing is left. (Names are only ever shown as text, never as HTML.)
function cleanName(name) {
  const text = String(name == null ? "" : name).replace(/\s+/g, " ").trim().slice(0, NAME_MAX).trim();
  return text || DEFAULT_NAME;
}

class Profile {
  constructor({ storage = browserStorage(), key = PROFILE_KEY } = {}) {
    this.storage = storage;
    this.key = key;
    this.name = DEFAULT_NAME;
    this.color = DEFAULT_COLOR;
    this.load();
  }
  
  // Takes the saved name and color, if there are any, and if they are usable.
  load() {
    const saved = readJson(this.storage, this.key);
    if (!saved || typeof saved !== "object") return;
    this.name = cleanName(saved.name);
    this.color = colorById(saved.color).id;
  }

  // Remembers the name and color. Says whether it could.
  save() {
    return writeJson(this.storage, this.key, { name: this.name, color: this.color });
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PROFILE_KEY, NAME_MAX, DEFAULT_NAME, browserStorage, readJson, writeJson, cleanName, Profile };
} else {
  Object.assign(window, { PROFILE_KEY, NAME_MAX, DEFAULT_NAME, browserStorage, readJson, writeJson, cleanName, Profile });
}
