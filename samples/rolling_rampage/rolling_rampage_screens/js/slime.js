// Slime: a puddle that slows a marble down and, if it stays in it, dissolves it. The puddles are
// zones in the level (see zones.js); this is the rule for what being in them does, as plain numbers,
// so it is easy to test. See ../tests/slime.tests.js.

const DISSOLVE_TIME = 1.2; // seconds in slime until a marble is dissolved
const RECOVER_TIME = 0.8; // seconds out of slime for a marble to recover completely

// How much a marble has been eaten by slime, from 0 (not at all) to 1 (dissolved). It goes up while
// the marble is in a puddle, and back down when it is out. A marble can be in more than one puddle
// at once, so it counts how many it is in.
class Exposure {
  constructor() {
    this.level = 0;
    this.puddles = 0;
  }

  // The marble has rolled into a puddle.
  enter() {
    this.puddles += 1;
  }

  // The marble has rolled out of one.
  leave() {
    this.puddles = Math.max(0, this.puddles - 1);
  }

  // Whether the marble is in slime now.
  get inSlime() {
    return this.puddles > 0;
  }

  // Whether it has been in slime long enough to dissolve.
  get dissolved() {
    return this.level >= 1;
  }

  // Let `dt` seconds go by: more eaten if in slime, and less if out.
  tick(dt) {
    const change = this.inSlime ? dt / DISSOLVE_TIME : -dt / RECOVER_TIME;
    this.level = Math.min(1, Math.max(0, this.level + change));
  }

  // Back to a clean marble, in no puddle.
  reset() {
    this.level = 0;
    this.puddles = 0;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DISSOLVE_TIME, RECOVER_TIME, Exposure };
} else {
  Object.assign(window, { DISSOLVE_TIME, RECOVER_TIME, Exposure });
}
