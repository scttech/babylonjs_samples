// Wave progression: when the next wave starts, and how hard it is. A wave is
// "all the rocks on screen"; shoot them all, get a short breather, and the next
// wave arrives with more rocks that move faster.
//
// Like Game, this knows nothing about rocks, ships, or the screen. It's fed the
// number of rocks left each frame and says when it's time to start a wave;
// main.js does the spawning. See ../tests/waves.tests.js.
class Waves {
  constructor({ breather = 2 } = {}) {
    this.breather = breather; // seconds between clearing a wave and the next one starting
    this.wave = 0; // 0 until the first wave starts
    this.countdown = 0; // seconds until the next wave, while waiting
    this.waiting = false;
  }

  // How many large rocks a wave starts with: four in wave 1, one more each
  // wave, and never more than nine so the screen stays playable.
  rocksFor(wave) {
    return Math.min(3 + wave, 9);
  }

  // How much faster than normal the rocks drift in a wave: normal in wave 1,
  // 12% faster each wave after, and never more than double.
  speedScaleFor(wave) {
    return Math.min(1 + 0.12 * (wave - 1), 2);
  }

  // True during the pause between waves, including the pause before wave 1.
  get between() {
    return this.waiting;
  }

  // Call once a frame with how many rocks are left. Returns true on the frame
  // a new wave should be spawned (and has already been counted in `wave`).
  update(dt, rocksLeft) {
    if (rocksLeft > 0) {
      this.waiting = false;
      return false;
    }

    // The screen is clear: start the breather the first time we notice.
    if (!this.waiting) {
      this.waiting = true;
      this.countdown = this.breather;
    }

    this.countdown -= dt;
    if (this.countdown > 0) return false;

    this.waiting = false;
    this.wave += 1;
    return true;
  }

  // Back to before wave 1.
  reset() {
    this.wave = 0;
    this.countdown = 0;
    this.waiting = false;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Waves;
} else {
  window.Waves = Waves;
}
