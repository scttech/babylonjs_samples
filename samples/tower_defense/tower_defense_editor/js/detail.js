// The detail of the game: how many pixels it draws, and whether it draws the clouds. A phone that draws every pixel of
// a screen that is three times as sharp as it looks is hot and slow, and a game that is slow is lost on a player who
// did nothing wrong. So the player can choose, the choice is remembered, and a game that is running slowly lowers its own detail
// once, and says so. None of it needs a screen: the choices are a table and the rest is arithmetic. See ../tests/detail.tests.js.

// The levels, lowest first. `pixelRatio` is the most pixels across that are drawn for each of the page's, and `clouds` whether
// the clouds are there.
const DETAIL = {
  low: { name: "Low", pixelRatio: 1, clouds: false },
  medium: { name: "Medium", pixelRatio: 1.5, clouds: true },
  high: { name: "High", pixelRatio: 2, clouds: true },
};
const DETAIL_ORDER = ["low", "medium", "high"];

const FRAMES = {
  seconds: 3, // how long a stretch of frames is looked at
  slowFps: 28, // below this many frames a second, over that long, the game is slow
};

// Whether a name is one of the levels (and not something that every object has, like `toString`).
function isLevel(name) {
  return Object.hasOwn(DETAIL, name);
}

// The level to start at. The address can ask for one (`?detail=low`); if it doesn't, the player's choice from before; if there is
// none, a phone starts on medium and anything else on high. `touch` is whether the device has a touch screen.
function startingDetail({ query = null, stored = null, touch = false }) {
  if (isLevel(query)) return query;
  if (isLevel(stored)) return stored;
  return touch ? "medium" : "high";
}

// The level after this one, going round: low, medium, high, low.
function nextDetail(level) {
  return DETAIL_ORDER[(DETAIL_ORDER.indexOf(level) + 1) % DETAIL_ORDER.length];
}

// The level one below this one, or this one if there is none.
function lowerDetail(level) {
  return DETAIL_ORDER[Math.max(0, DETAIL_ORDER.indexOf(level) - 1)];
}

// How much to scale the drawing by for a level, on a screen of a given pixel ratio: the engine's hardware scaling level, which is
// the *size* of a pixel (one is a pixel for each of the page's, and a half is four for each).
function scalingFor(level, devicePixelRatio) {
  return 1 / Math.min(devicePixelRatio || 1, DETAIL[level].pixelRatio);
}

// Watches how long frames take, and says when the game is slow: when the frames of the last few seconds came to fewer a second than
// they should. A short stutter (a frame that was a second long, as the page comes back) is not slow, since it is one frame in many.
class FrameMeter {
  constructor(frames = FRAMES) {
    this.frames = frames;
    this.times = [];
    this.total = 0;
  }

  // Adds a frame that took `dt` seconds.
  add(dt) {
    this.times.push(dt);
    this.total += dt;
    while (this.total - this.times[0] >= this.frames.seconds) this.total -= this.times.shift();
  }

  // Whether there are enough frames to say, and the frames of them were slow.
  get slow() {
    return this.total >= this.frames.seconds * 0.9 && this.times.length / this.total < this.frames.slowFps;
  }

  // Starts again (when the level has been changed, or the game was paused).
  reset() {
    this.times = [];
    this.total = 0;
  }
}

// What the player chose (the detail, and whether the sound is off), kept in the browser's storage (which can fail, and then nothing is kept).
class Preferences {
  constructor(storage, key = "tower_defense_preferences") {
    this.storage = storage;
    this.key = key;
    this.data = this.load();
  }

  load() {
    try {
      const data = JSON.parse(this.storage.getItem(this.key));
      return data && typeof data === "object" ? data : {};
    } catch (error) {
      return {};
    }
  }

  get detail() {
    return isLevel(this.data.detail) ? this.data.detail : null;
  }

  set detail(level) {
    if (!isLevel(level)) return;
    this.data.detail = level;
    this.save();
  }

  // Whether the sound is off: a player who turned it off does not want it back on the next time.
  get muted() {
    return this.data.muted === true;
  }

  set muted(muted) {
    this.data.muted = muted === true;
    this.save();
  }

  save() {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.data));
    } catch (error) {
      // Not saved; it is kept until the page is closed.
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DETAIL, DETAIL_ORDER, FRAMES, isLevel, startingDetail, nextDetail, lowerDetail, scalingFor, FrameMeter, Preferences };
} else {
  Object.assign(window, { DETAIL, DETAIL_ORDER, FRAMES, isLevel, startingDetail, nextDetail, lowerDetail, scalingFor, FrameMeter, Preferences });
}
