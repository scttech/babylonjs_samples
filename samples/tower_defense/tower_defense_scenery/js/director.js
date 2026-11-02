// The director: the rules of a game of waves. It keeps the lives, and which wave it is, and whether the player is
// getting ready, or the enemies are coming, or it is over. Each frame it is told how long it was and how many
// enemies are still on the board, and it says what happened as events: a wave begins, an enemy comes on, a wave is
// beaten, and the game is won or lost. It knows nothing of models, or of gold, or of the screen. See ../tests/director.tests.js.

const RULES = {
  lives: 20, // how many lives there are at the start
  firstWait: 25, // seconds to build before the first wave
  pause: 14, // seconds to build between waves
  bonus: 25, // gold for beating a wave, and this much more for each wave after the first
};

class Director {
  constructor(waves = WAVES, rules = RULES) {
    this.waves = waves;
    this.rules = rules;
    this.lives = rules.lives;
    this.index = 0; // the wave that is being fought, or that is next
    this.phase = "preparing"; // "preparing", "running", "won" or "lost"
    this.countdown = rules.firstWait;
    this.spawner = null;
  }

  // The number of the wave that is being fought or is next, counted from 1.
  get number() {
    return this.index + 1;
  }

  get over() {
    return this.phase === "won" || this.phase === "lost";
  }

  // The player is ready: the wave begins as soon as the next frame.
  callNext() {
    if (this.phase === "preparing") this.countdown = 0;
  }

  // An enemy got to the end. It says whether that was the end of the game.
  leak(lives) {
    if (this.over) return [];
    this.lives = Math.max(0, this.lives - lives);
    if (this.lives > 0) return [];
    this.phase = "lost";
    return [{ type: "lost" }];
  }

  // Lets `dt` seconds go by, with `alive` enemies still on the board. It says what happened.
  update(dt, alive) {
    if (this.over) return [];
    const events = [];
    if (this.phase === "preparing") {
      this.countdown -= dt;
      if (this.countdown > 0) return events;
      this.phase = "running";
      this.spawner = new Spawner(this.waves[this.index]);
      events.push({ type: "wave", number: this.number, total: this.waves.length });
      dt = 0; // the time that went on the countdown is not time that the wave has been going
    }

    const kinds = this.spawner.update(dt);
    for (const kind of kinds) events.push({ type: "spawn", kind, healthScale: healthScaleFor(this.index) });
    if (this.spawner.finished && kinds.length === 0 && alive === 0 && !events.some((event) => event.type === "wave")) {
      const bonus = this.rules.bonus + 5 * this.index;
      events.push({ type: "cleared", number: this.number, bonus });
      if (this.index === this.waves.length - 1) {
        this.phase = "won";
        events.push({ type: "won" });
      } else {
        this.index++;
        this.phase = "preparing";
        this.countdown = this.rules.pause;
        this.spawner = null;
      }
    }
    return events;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RULES, Director };
} else {
  Object.assign(window, { RULES, Director });
}
