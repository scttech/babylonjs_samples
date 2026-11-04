// The speed of the game: a button that makes it go twice as fast, or three times, for a player who has built and is waiting
// for the wave. Time goes faster by taking more steps of the game in a frame, and not by taking a longer step: a step that is
// too long would let an enemy walk through a bolt, so every step is at most as long as it always was. See ../tests/speed.tests.js.

const SPEEDS = [1, 2, 3]; // the speeds that the button goes through, as how many times as fast as usual
const MAX_STEP = 0.05; // the longest step of the game, in seconds

// Cuts `seconds` of the game's time into steps that are none longer than `maxStep` and that are all the same.
function stepsOf(seconds, maxStep = MAX_STEP) {
  if (seconds <= 0) return [];
  const count = Math.ceil(seconds / maxStep - 1e-9);
  return Array.from({ length: count }, () => seconds / count);
}

class GameSpeed {
  constructor(speeds = SPEEDS) {
    this.speeds = speeds;
    this.index = 0;
  }

  // How many times as fast as usual it is now.
  get value() {
    return this.speeds[this.index];
  }

  // What the button says: ×2.
  get label() {
    return `×${this.value}`;
  }

  // The next speed, and back to the first after the last.
  cycle() {
    this.index = (this.index + 1) % this.speeds.length;
    return this.value;
  }

  // The steps of the game for a frame that took `dt` seconds, at this speed.
  steps(dt) {
    return stepsOf(Math.min(dt, MAX_STEP) * this.value);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SPEEDS, MAX_STEP, stepsOf, GameSpeed };
} else {
  Object.assign(window, { SPEEDS, MAX_STEP, stepsOf, GameSpeed });
}
