// The clock: how a run of a level is going. How much time is left, whether the player has won or
// run out, and the bonus seconds for reaching a checkpoint. It is all plain numbers and words, with
// no Babylon.js and no page, so every rule is easy to test. See ../tests/clock.tests.js.

const TIME_LOW = 10; // when this many seconds are left, the clock warns the player

// Seconds as a clock shows them: "0:42". It rounds up, so the clock only says "0:00" when the
// time is truly out, and a player with 0.2 seconds left isn't told they have none.
function formatTime(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

// One attempt at a level. It is always in one of these states:
//   ready    made, but not started (the splash is still up)
//   running  the clock is counting down, and the player can steer
//   won      the goal was reached, with `remaining` seconds to spare
//   timeup   the clock ran out
// `level` is the grid of a level (or anything with a `time` and a list of `checkpoints`, each with
// a `bonus` in seconds).
class Run {
  constructor(level) {
    this.remaining = level.time;
    this.bonuses = level.checkpoints.map((checkpoint) => checkpoint.bonus);
    this.reached = new Set(); // the checkpoints already reached
    this.status = "ready";
  }

  // Start the clock. Does nothing unless the run is ready.
  start() {
    if (this.status === "ready") this.status = "running";
  }

  // Let `dt` seconds go by. Only a running clock counts down, and it stops at zero, and the run is over.
  tick(dt) {
    if (this.status !== "running") return;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining === 0) this.status = "timeup";
  }

  // The marble has reached a checkpoint. The first time, it adds that checkpoint's bonus seconds to
  // the clock and says how many; after that, or when the run isn't running, it does nothing and says 0.
  reachCheckpoint(index) {
    if (this.status !== "running" || this.reached.has(index)) return 0;
    this.reached.add(index);
    this.remaining += this.bonuses[index];
    return this.bonuses[index];
  }

  // The marble has reached the goal. Says whether that won the run: only a running one can be won.
  finish() {
    if (this.status !== "running") return false;
    this.status = "won";
    return true;
  }

  // Whether to warn the player that the time is nearly out.
  get low() {
    return this.status === "running" && this.remaining <= TIME_LOW;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TIME_LOW, formatTime, Run };
} else {
  Object.assign(window, { TIME_LOW, formatTime, Run });
}
