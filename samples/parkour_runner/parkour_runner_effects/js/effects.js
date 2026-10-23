// The small rules behind the effects, as plain numbers and functions with no Babylon.js
// in them, so they can be tested: which move makes which sound, when a combo has earned a
// banner, and the shake of the camera when the runner crashes. The effects you can see
// (sparkles and dust) are in particles.js. See ../tests/effects.tests.js.

// The sound for the start of each move. A crash is left out: it has more to it than a
// sound (a shake, and dust), so the game does all of it when the runner crashes.
const MOVE_SOUNDS = {
  [MOVES.jump]: "jump",
  [MOVES.vault]: "vault",
  [MOVES.slide]: "slide",
  [MOVES.roll]: "roll",
};

// The sound for a move, or null if it has none (running has none).
function soundForMove(move) {
  return MOVE_SOUNDS[move] || null;
}

// A combo earns a banner every this many clean moves in a row.
const COMBO_MILESTONE = 5;

// Whether going from combo `before` to combo `after` crosses a multiple of COMBO_MILESTONE:
// 4 to 5 does, 5 to 6 doesn't, and a combo that has gone back to 0 doesn't.
function comboMilestone(before, after) {
  return after > before && Math.floor(after / COMBO_MILESTONE) > Math.floor(before / COMBO_MILESTONE);
}

const SHAKE_TIME = 0.5; // how long a shake lasts, in seconds
const SHAKE_STRENGTH = 0.45; // how far, in world units, the camera is thrown at the start

// Shakes the camera: a random offset that starts as big as `strength` and dies away to
// nothing over SHAKE_TIME. The game asks for the offset every frame and adds it to the
// camera's position. `random` can be replaced, so a test can decide what "random" gives.
class CameraShake {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.strength = 0;
    this.timeLeft = 0;
    this.x = 0;
    this.y = 0;
  }

  // Begins a shake. Starting another while one is going begins it afresh.
  start(strength = SHAKE_STRENGTH) {
    this.strength = strength;
    this.timeLeft = SHAKE_TIME;
  }

  // Ends a shake at once, and puts the camera back.
  stop() {
    this.timeLeft = 0;
    this.x = 0;
    this.y = 0;
  }

  get active() {
    return this.timeLeft > 0;
  }

  // Moves time on by dt seconds, and returns the offset { x, y } for this frame. With no
  // time passing (a pause) the offset stays as it was.
  update(dt) {
    if (dt <= 0 || !this.active) return { x: this.x, y: this.y };
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    const left = this.timeLeft / SHAKE_TIME; // 1 at the start, 0 at the end
    const size = this.strength * left * left; // it dies away quickly at first, then gently
    this.x = (this.random() * 2 - 1) * size;
    this.y = (this.random() * 2 - 1) * size;
    return { x: this.x, y: this.y };
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MOVE_SOUNDS, COMBO_MILESTONE, SHAKE_TIME, SHAKE_STRENGTH, soundForMove, comboMilestone, CameraShake };
} else {
  Object.assign(window, { MOVE_SOUNDS, COMBO_MILESTONE, SHAKE_TIME, SHAKE_STRENGTH, soundForMove, comboMilestone, CameraShake });
}
