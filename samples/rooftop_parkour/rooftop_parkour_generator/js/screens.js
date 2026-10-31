// The screens: the title (choose a runner, see the best times, press Play) and the pause (resume, run the trial again, change the sound and the mouse, go back to
// the title). Which screen is up is a small state machine with nothing drawn, so a test can say that the game cannot be paused before it has begun; and the
// screens themselves are built from the page's own document, so a test can look at what they say. See ../tests/screens.tests.js and ../css/screens.css.

// The states of the game, and which may follow which: loading (the district is on its way), the title, playing, and paused.
const SCREEN_STATES = {
  loading: ["title"],
  title: ["playing"],
  playing: ["paused", "title"],
  paused: ["playing", "title"],
};

class ScreenFlow {
  constructor() {
    this.state = "loading";
    this.listeners = [];
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  // Goes to a state, if it is allowed from this one. Says whether it did.
  go(next) {
    if (!SCREEN_STATES[this.state].includes(next)) return false;
    const before = this.state;
    this.state = next;
    for (const callback of this.listeners) callback(next, before);
    return true;
  }

  // Whether the world is moving: only while playing.
  get running() {
    return this.state === "playing";
  }

  loaded() {
    return this.go("title");
  }

  play() {
    return this.go("playing");
  }

  pause() {
    return this.go("paused");
  }

  resume() {
    return this.state === "paused" && this.go("playing");
  }

  quit() {
    return this.go("title");
  }
}

// The lines about the best the player has done, as a list of words (formatTime is from hud.js): nothing yet gives a line that says so.
function bestLines(records) {
  if (records.runs === 0 && records.trialBest === null) return ["No times yet. The trial is on the roofs: run it."];
  const lines = [];
  lines.push(records.trialBest === null ? "Trial: not yet run" : `Trial: ${formatTime(records.trialBest)}`);
  lines.push(`Best score: ${records.scoreBest}`);
  lines.push(`Longest chain: ${records.chainBest}`);
  lines.push(`Most tokens: ${records.tokensBest}`);
  return lines;
}

// The names of the runners, as the title says them.
const RUNNER_NAMES = { male: "Male runner", female: "Female runner" };

// Makes an element with a class and some words, and puts it in a parent.
function makeElement(doc, tag, className, parent, text = "") {
  const element = doc.createElement(tag);
  element.className = className;
  element.textContent = text;
  if (parent) parent.appendChild(element);
  return element;
}

class Screens {
  // `doc` is the page; `handlers` is what to do when the player does something: onPlay(runner), onResume(), onRestart(), onQuit(), onRunner(name),
  // onVolume(value), onLookSpeed(value). The screens are made now and put at the end of the body, hidden.
  constructor(doc, handlers = {}) {
    this.doc = doc;
    this.handlers = handlers;
    this.runner = "male";
    const call = (name, ...args) => handlers[name] && handlers[name](...args);

    this.title = makeElement(doc, "div", "screen title hidden", doc.body);
    const logo = makeElement(doc, "img", "screen-logo", this.title);
    logo.src = "../assets/images/parkour_runner_freerun_splash.webp";
    logo.alt = "Rooftop Parkour";
    this.cityLine = makeElement(doc, "p", "screen-city", this.title);
    makeElement(doc, "p", "screen-label", this.title, "Choose your runner");
    const choice = makeElement(doc, "div", "screen-choice", this.title);
    this.runnerButtons = {};
    for (const name of Object.keys(RUNNER_NAMES)) {
      const button = makeElement(doc, "button", "screen-runner", choice, RUNNER_NAMES[name]);
      button.type = "button";
      button.addEventListener("click", () => {
        this.setRunner(name);
        call("onRunner", name);
      });
      this.runnerButtons[name] = button;
    }
    this.bests = makeElement(doc, "div", "screen-bests", this.title);
    this.playButton = makeElement(doc, "button", "screen-button primary", this.title, "Play");
    this.playButton.type = "button";
    this.playButton.addEventListener("click", () => call("onPlay", this.runner));
    this.status = makeElement(doc, "p", "screen-status", this.title);

    this.pause = makeElement(doc, "div", "screen pause hidden", doc.body);
    makeElement(doc, "h2", "screen-heading", this.pause, "Paused");
    this.pauseBests = makeElement(doc, "div", "screen-bests", this.pause);
    this.resumeButton = makeElement(doc, "button", "screen-button primary", this.pause, "Resume");
    this.restartButton = makeElement(doc, "button", "screen-button", this.pause, "Run the trial again");
    this.quitButton = makeElement(doc, "button", "screen-button", this.pause, "Back to the title");
    for (const button of [this.resumeButton, this.restartButton, this.quitButton]) button.type = "button";
    this.resumeButton.addEventListener("click", () => call("onResume"));
    this.restartButton.addEventListener("click", () => call("onRestart"));
    this.quitButton.addEventListener("click", () => call("onQuit"));
    this.volume = this._slider("Sound", [0, 1], 0.05, (value) => call("onVolume", value));
    this.lookSpeed = this._slider("Mouse speed", RECORDS.limits.lookSpeed, 0.0005, (value) => call("onLookSpeed", value));
  }

  // A labelled slider in the pause screen. `onInput` is told the number.
  _slider(label, [low, high], step, onInput) {
    const row = makeElement(this.doc, "label", "screen-slider", this.pause, label);
    const input = this.doc.createElement("input");
    input.type = "range";
    input.min = String(low);
    input.max = String(high);
    input.step = String(step);
    input.addEventListener("input", () => onInput(Number(input.value)));
    row.appendChild(input);
    return input;
  }

  // Marks which runner is chosen.
  setRunner(name) {
    this.runner = name;
    for (const [key, button] of Object.entries(this.runnerButtons)) {
      button.classList.toggle("chosen", key === name);
      button.setAttribute("aria-pressed", String(key === name));
    }
  }

  // Says which city this is, under the logo.
  setCity(text) {
    this.cityLine.textContent = text;
  }

  // Words under the Play button (what is loading, or what went wrong), and whether Play can be pressed now.
  setStatus(text, busy = false) {
    this.status.textContent = text;
    this.playButton.disabled = busy;
  }

  _lines(element, records) {
    element.textContent = "";
    for (const line of bestLines(records)) makeElement(this.doc, "p", "screen-best", element, line);
  }

  showTitle(records) {
    this.setRunner(records.runner);
    this._lines(this.bests, records);
    this.pause.classList.add("hidden");
    this.title.classList.remove("hidden");
  }

  showPause(records) {
    this._lines(this.pauseBests, records);
    this.volume.value = String(records.volume);
    this.lookSpeed.value = String(records.lookSpeed);
    this.title.classList.add("hidden");
    this.pause.classList.remove("hidden");
  }

  hide() {
    this.title.classList.add("hidden");
    this.pause.classList.add("hidden");
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCREEN_STATES, ScreenFlow, bestLines, RUNNER_NAMES, Screens };
} else {
  Object.assign(window, { SCREEN_STATES, ScreenFlow, bestLines, RUNNER_NAMES, Screens });
}
