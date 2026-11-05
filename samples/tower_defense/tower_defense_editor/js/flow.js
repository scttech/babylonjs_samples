// The flow of the game: which screen it is on. It begins at the title, goes to playing when the player starts, can be paused
// and resumed, and ends won or lost. It is a small state machine with no page in it: each change is a method that says
// whether it happened, and whoever shows a screen asks to be told when the state changes. The game itself (the director,
// the enemies, the towers) is only advanced while the flow is playing. See ../tests/flow.tests.js.

// What can happen from each state: the state it goes to, by what is done.
const FLOW = {
  title: { start: "playing" },
  playing: { pause: "paused", won: "won", lost: "lost" },
  paused: { resume: "playing" },
  won: {},
  lost: {},
};

class Flow {
  constructor(state = "title") {
    this.state = state;
    this.listeners = [];
  }

  // Whether the game is going: the only state in which time passes.
  get running() {
    return this.state === "playing";
  }

  // Whether it is finished, won or lost.
  get over() {
    return this.state === "won" || this.state === "lost";
  }

  // Asks to be told of every change: listener(state, previous).
  onChange(listener) {
    this.listeners.push(listener);
  }

  // Does something (a key of FLOW), if it can be done now. It says whether it was.
  go(action) {
    const next = FLOW[this.state][action];
    if (!next) return false;
    const previous = this.state;
    this.state = next;
    this.listeners.forEach((listener) => listener(next, previous));
    return true;
  }

  start() {
    return this.go("start");
  }

  pause() {
    return this.go("pause");
  }

  resume() {
    return this.go("resume");
  }

  // Pauses a game that is going, and goes on with one that is paused.
  toggle() {
    return this.running ? this.pause() : this.resume();
  }

  // The game ends: `result` is "won" or "lost".
  finish(result) {
    return this.go(result);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FLOW, Flow };
} else {
  Object.assign(window, { FLOW, Flow });
}
