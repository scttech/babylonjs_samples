// How far the runner has gone, how fast he runs because of it, and how many points he
// has: plain numbers (no Babylon.js), so the rules of scoring are easy to test. The
// hud draws them; main.js tells this what has happened. See ../tests/score.tests.js.

// The longer the run, the faster. Speed starts at RUN_SPEED (from runner.js) and
// rises with the distance run, up to MAX_SPEED, where the obstacles come close to
// too fast to beat.
const MAX_SPEED = 30;
const SPEED_RAMP = 0.014; // how much faster for every unit of distance run

// How fast the runner should run, for how far he has gone.
function speedFor(distance) {
  return Math.min(MAX_SPEED, RUN_SPEED + Math.max(0, distance) * SPEED_RAMP);
}

const COIN_POINTS = 10; // for each coin, before the multiplier
const CLEAN_MOVE_POINTS = 25; // for each obstacle got past with the right move, before the multiplier
const COMBO_STEP = 3; // every this many clean moves in a row raises the multiplier by one
const MAX_MULTIPLIER = 5;
const COMBO_TIME = 5; // seconds to make the next clean move before the combo is lost

class Score {
  constructor() {
    this.reset();
  }

  // Back to the start of a run.
  reset() {
    this.distance = 0; // how far he has run, in units
    this.coins = 0; // how many coins he has picked up
    this.points = 0; // points from coins and clean moves (the distance counts too, see total)
    this.combo = 0; // clean moves in a row
    this.comboTimer = 0; // seconds left to make the next one
  }

  // What the points from coins and clean moves are multiplied by: 1 to begin with, one
  // more for every COMBO_STEP clean moves in a row, and never more than MAX_MULTIPLIER.
  get multiplier() {
    return Math.min(MAX_MULTIPLIER, 1 + Math.floor(this.combo / COMBO_STEP));
  }

  // The score: one point for every unit of distance, plus the points he has won.
  get total() {
    return Math.floor(this.distance) + this.points;
  }

  // Records how far he has run. The distance never goes backwards.
  setDistance(distance) {
    this.distance = Math.max(this.distance, distance);
  }

  // He has picked up a coin: it counts, and it is worth more with a bigger multiplier.
  collectCoin() {
    this.coins++;
    this.points += COIN_POINTS * this.multiplier;
  }

  // He has got past an obstacle with the right move. The points are worth the
  // multiplier he had *before* this move, and then the combo grows and its timer starts again.
  cleanMove() {
    this.points += CLEAN_MOVE_POINTS * this.multiplier;
    this.combo++;
    this.comboTimer = COMBO_TIME;
  }

  // Moves time on by dt seconds: the combo runs out if he is too slow to make the next move.
  update(dt) {
    if (this.combo === 0) return;
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) {
      this.combo = 0;
      this.comboTimer = 0;
    }
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MAX_SPEED, SPEED_RAMP, COIN_POINTS, CLEAN_MOVE_POINTS, COMBO_STEP, MAX_MULTIPLIER, COMBO_TIME, speedFor, Score };
} else {
  Object.assign(window, { MAX_SPEED, SPEED_RAMP, COIN_POINTS, CLEAN_MOVE_POINTS, COMBO_STEP, MAX_MULTIPLIER, COMBO_TIME, speedFor, Score });
}
