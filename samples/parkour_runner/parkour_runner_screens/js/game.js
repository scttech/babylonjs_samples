// What the game is doing as a whole: showing the title, running, paused, or over. Only
// one is true at a time, and only some changes make sense (you can't pause a game
// that is over), so the rules are kept here, as plain values with no Babylon.js, where
// they are easy to test. See ../tests/game.tests.js.
const STATES = { title: "title", playing: "playing", paused: "paused", over: "over" };

class Game {
  constructor() {
    this.state = STATES.title;
  }

  // Whether the run is going: the runner moves and the score counts.
  get playing() {
    return this.state === STATES.playing;
  }

  // Whether time stands still. Everything moves by dt, so the game gives it none while
  // the title is up or the game is paused. (After a crash time still passes, so the
  // runner can finish falling over behind the game over screen.)
  get frozen() {
    return this.state === STATES.title || this.state === STATES.paused;
  }

  // Moves to `state` if the game is in one of the `from` states. Says whether it did.
  _change(from, state) {
    if (!from.includes(this.state)) return false;
    this.state = state;
    return true;
  }

  // A new run, from anywhere: from the title, again after a crash, or as a restart.
  start() {
    this.state = STATES.playing;
    return true;
  }

  // Stops time, but only in a run that is going.
  pause() {
    return this._change([STATES.playing], STATES.paused);
  }

  // Carries on from a pause.
  resume() {
    return this._change([STATES.paused], STATES.playing);
  }

  // Pauses a run that is going, and resumes one that is paused.
  togglePause() {
    return this.pause() || this.resume();
  }

  // The runner has crashed: only a run that is going can end.
  end() {
    return this._change([STATES.playing], STATES.over);
  }

  // Back to the title, from a pause or from the end of a run.
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
