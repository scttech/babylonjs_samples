// What the game is doing as a whole: showing the title, being played, paused, or over. Only
// one is true at a time, and only some changes make sense (you can't pause a game
// that is over), so the rules are kept here, as plain values with no Babylon.js, where
// they are easy to test. See ../tests/game.tests.js.
const STATES = { title: "title", playing: "playing", paused: "paused", over: "over" };

class Game {
  constructor() {
    this.state = STATES.title;
  }

  // Whether a game is being played: the clock runs and the marble can be steered.
  get playing() {
    return this.state === STATES.playing;
  }

  // Whether time stands still. Everything moves by dt, and the physics goes by the frame, so the
  // game gives them nothing while the title is up or the game is paused. (When a game is over time
  // still passes, so the marble can finish rolling behind the result screen.)
  get frozen() {
    return this.state === STATES.title || this.state === STATES.paused;
  }

  // Moves to `state` if the game is in one of the `from` states. Says whether it did.
  _change(from, state) {
    if (!from.includes(this.state)) return false;
    this.state = state;
    return true;
  }

  // A new game, from anywhere: from the title, again after one is over, or as a restart.
  start() {
    this.state = STATES.playing;
    return true;
  }

  // Stops time, but only in a game that is being played.
  pause() {
    return this._change([STATES.playing], STATES.paused);
  }

  // Carries on from a pause.
  resume() {
    return this._change([STATES.paused], STATES.playing);
  }

  // Pauses a game that is being played, and resumes one that is paused.
  togglePause() {
    return this.pause() || this.resume();
  }

  // The game has ended (the goal of the last level, or the time running out): only a game being played can end.
  end() {
    return this._change([STATES.playing], STATES.over);
  }

  // Back to the title, from a pause or from the end of a game.
  toTitle() {
    return this._change([STATES.paused, STATES.over], STATES.title);
  }


}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STATES, Game };
} else {
  Object.assign(window, { STATES, Game });
}
