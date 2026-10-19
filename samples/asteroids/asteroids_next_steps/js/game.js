// The rules of the game that aren't about any one object: how many lives the
// player has left, and whether the game is over. Keeping this in its own tiny
// class (instead of a couple of loose variables in main.js) means it can be
// unit tested, and later steps can grow it with waves and extra lives.
//
// It deliberately knows nothing about ships, rocks, or the screen. main.js
// decides what happens when a life is lost; this only keeps the count. See
// ../tests/game.tests.js.
class Game {
  constructor({ startingLives = 3 } = {}) {
    this.startingLives = startingLives;
    this.lives = startingLives;
    this.started = false; // false until the player leaves the title screen
    this.paused = false;
  }

  // True once every life has been used up.
  get over() {
    return this.lives <= 0;
  }

  // Takes one life and returns how many remain. Does nothing once the game is
  // already over, so a stray extra call can't push the count below zero.
  loseLife() {
    if (this.over) return this.lives;
    this.lives -= 1;
    return this.lives;
  }

  // True while the game is actually running: started, not paused, not over.
  get playing() {
    return this.started && !this.paused && !this.over;
  }

  // Leaves the title screen and begins a fresh game.
  start() {
    this.started = true;
    this.reset();
  }

  // Pauses or resumes, and returns whether the game is now paused. There's
  // nothing to pause on the title screen or after the game is over, so it does
  // nothing then.
  togglePause() {
    if (!this.started || this.over) return this.paused;
    this.paused = !this.paused;
    return this.paused;
  }

  // Starts the lives and pause state over. It doesn't go back to the title
  // screen: once started, the game stays started.
  reset() {
    this.lives = this.startingLives;
    this.paused = false;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Game;
} else {
  window.Game = Game;
}
