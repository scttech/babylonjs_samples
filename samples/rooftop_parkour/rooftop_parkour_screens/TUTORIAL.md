# Tutorial: Rooftop Parkour Screens -- A Game Around the Game

This is the eighth tutorial of the Rooftop Parkour series. The runner can run, climb, vault and score, and the game still begins the moment the loading bar ends, forgets everything when the page is closed, and is silent. This sample wraps the game: a **title screen** where you choose your runner, a **pause screen**, **records** that are kept in the browser, **sound** made in code, and a puff of **dust** where you land.

By the end you'll have:

- **Records**: the best trial time, the best score, the longest chain, the runner you chose, and your sound and mouse settings, kept in `localStorage` and believed only when they make sense
- **A title screen**: the logo, a choice of **male or female runner**, your best times, and Play
- **A pause screen**: Esc (or P, or leaving the page) stops the world; Resume, run the trial again, back to the title, and sliders for the sound and the mouse
- **Sound**, made with Web Audio: a jump, a landing that is harder when the fall was, steps paced by how fast you run, a vault, a kick, a chime for a token, the trial's checkpoints and finish, and the combo
- **Dust** on hard landings and wall kicks, from one particle system
- A **developer panel** section for the screens, with a button for every sound
- Unit tests for all of it: **698 passing tests**

**What you'll learn:** how to keep records in a browser that may refuse them, how to make a screen flow a state machine that tests can walk through, how to make sound from nothing with oscillators and noise (and test it by rendering it), why a page can only make sound after a touch, how to pause a game properly (the world stops, the keys stop), and how particles are asked for in bursts.

**Before you start:** do the [Goals tutorial](../rooftop_parkour_goals/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Goals sample, plus placeholders for the new files and their tests:

```
rooftop_parkour_screens/
├── index.html, tests.html   (already list the new scripts and the new stylesheet)
├── css/
│   ├── screens.css         (placeholder -- Step 2)
│   └── everything else, from the Goals sample
├── js/
│   ├── records.js          (placeholder -- Step 1)
│   ├── screens.js          (placeholder -- Step 2)
│   ├── sound.js            (placeholder -- Step 3)
│   ├── effects.js          (placeholder -- Step 4)
│   ├── main.js             (changes -- Step 5)
│   └── everything else, from the Goals sample (the controller, the plan and the goals are not touched at all)
└── tests/
    ├── records.tests.js, screens.tests.js, sound.tests.js, effects.tests.js   (placeholders)
    └── everything else, from the Goals sample
```

**Nothing that already exists is changed, except the game itself** (`main.js`). Records, screens, sound and dust are new files that the game *uses*: how the runner moves does not depend on any of them.

Open `tests.html` before you change anything. You should see **654 passing tests**.

### Serving the page

The models can't be loaded from a page opened straight from a file, so run a web server: `npx serve` in the repo root, and open the sample through `http://localhost`. Add **`?dev`** to the address for the developer panel.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **Records**: what the game remembers.
2. **Screens**: the title and the pause, and which one is up.
3. **Sound**: made in code.
4. **Dust**: a burst of particles.
5. **The game**: all of it together.

## Step 1: Records

A game that forgets your best time when you close the page has no reason to be played twice. The browser keeps small things for a page in `localStorage`: a table of words. But it is not a database you can rely on, and the code that uses it has to be written for what can go wrong:

- **The browser may refuse.** A private window, a full disk, or a policy can make `setItem` throw. The game must go on, with records that last for this visit.
- **What was kept may be nonsense.** A person can edit it, and an older version of the game may have written something else. Every value is **checked when it is read back**: a runner that is not one of the runners is the default one, a volume of 7 is held to 1, a best time of nothing is no time at all.
- **The storage is given to the class.** `Records` is not tied to `window.localStorage`: it takes anything with `getItem`, `setItem` and `removeItem`, so a test can give it a stand-in that remembers, or one that throws.

The numbers (the key, the runners there are, the defaults and the limits) are in a table, `RECORDS`.

Open `js/records.js` (the placeholder) and **replace the TODO line** with:

```js
// Records: what the game remembers between visits: the best time of the trial, the best score and the longest chain, which runner was chosen, and how loud
// the sound is and how fast the mouse looks. They are kept in the browser (localStorage), and a browser can refuse (a private window, a full disk, a policy),
// so every use of storage is allowed to fail and the game goes on without it. The storage is given to Records, so a test can give it a stand-in.
// See ../tests/records.tests.js.

// The key the records are kept under, what a new player starts with, and the limits of what is believed when it is read back (a person can edit what a
// browser keeps, and an old version of the game may have written something else).
const RECORDS = {
  key: "rooftop-parkour",
  runners: ["male", "female"],
  defaults: { runner: "male", volume: 0.7, lookSpeed: 0.003, trialBest: null, scoreBest: 0, chainBest: 0, tokensBest: 0, runs: 0 },
  limits: { volume: [0, 1], lookSpeed: [0.0005, 0.008] },
};

// The storage of the page, or a stand-in that keeps things until the page is closed, if the page has none that works.
function pageStorage(win = typeof window !== "undefined" ? window : null) {
  try {
    const storage = win && win.localStorage;
    if (storage) {
      storage.setItem("rooftop-parkour-test", "1");
      storage.removeItem("rooftop-parkour-test");
      return storage;
    }
  } catch (error) {
    // refused: use the stand-in
  }
  const kept = new Map();
  return { getItem: (k) => (kept.has(k) ? kept.get(k) : null), setItem: (k, v) => kept.set(k, String(v)), removeItem: (k) => kept.delete(k) };
}

const clampTo = (value, [low, high]) => Math.min(high, Math.max(low, value));

// What was read back, made safe: a value of the wrong kind, or outside its limits, is replaced by the default (or held to the limit).
function cleanRecords(raw, table = RECORDS) {
  const d = table.defaults;
  const source = raw && typeof raw === "object" ? raw : {};
  const number = (value, fallback) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
  const time = (value) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null);
  return {
    runner: table.runners.includes(source.runner) ? source.runner : d.runner,
    volume: clampTo(number(source.volume, d.volume), table.limits.volume),
    lookSpeed: clampTo(number(source.lookSpeed, d.lookSpeed), table.limits.lookSpeed),
    trialBest: time(source.trialBest),
    scoreBest: Math.max(0, Math.floor(number(source.scoreBest, d.scoreBest))),
    chainBest: Math.max(0, Math.floor(number(source.chainBest, d.chainBest))),
    tokensBest: Math.max(0, Math.floor(number(source.tokensBest, d.tokensBest))),
    runs: Math.max(0, Math.floor(number(source.runs, d.runs))),
  };
}

class Records {
  // `storage` is anything with getItem, setItem and removeItem (a page's localStorage, or pageStorage's stand-in).
  constructor(storage = pageStorage(), table = RECORDS) {
    this.storage = storage;
    this.table = table;
    let raw = null;
    try {
      raw = JSON.parse(storage.getItem(table.key));
    } catch (error) {
      raw = null; // nothing kept, unreadable, or storage that throws
    }
    Object.assign(this, cleanRecords(raw, table));
  }

  // The numbers as they are kept.
  toJSON() {
    const { runner, volume, lookSpeed, trialBest, scoreBest, chainBest, tokensBest, runs } = this;
    return { runner, volume, lookSpeed, trialBest, scoreBest, chainBest, tokensBest, runs };
  }

  save() {
    try {
      this.storage.setItem(this.table.key, JSON.stringify(this));
      return true;
    } catch (error) {
      return false; // the records are only good for this visit
    }
  }

  // Changes a setting (one of runner, volume, lookSpeed) and keeps it. A value that is not allowed is held to what is, or ignored.
  set(name, value) {
    if (!["runner", "volume", "lookSpeed"].includes(name)) return undefined;
    const clean = cleanRecords({ ...this.toJSON(), [name]: value }, this.table);
    this[name] = clean[name];
    this.save();
    return this[name];
  }

  // A trial has been finished in `seconds`. Gives whether it is a new best (the first time is one), and keeps it if it is.
  noteTrial(seconds) {
    if (!(seconds > 0)) return false;
    const better = this.trialBest === null || seconds < this.trialBest;
    if (better) {
      this.trialBest = seconds;
      this.save();
    }
    return better;
  }

  // A run is over (the player paused and left, or closed the page): { score, chain, tokens }. Gives which of them are new bests, as a list of names.
  noteRun({ score = 0, chain = 0, tokens = 0 }) {
    const beaten = [];
    if (score > this.scoreBest) beaten.push("score");
    if (chain > this.chainBest) beaten.push("chain");
    if (tokens > this.tokensBest) beaten.push("tokens");
    this.scoreBest = Math.max(this.scoreBest, Math.floor(score));
    this.chainBest = Math.max(this.chainBest, Math.floor(chain));
    this.tokensBest = Math.max(this.tokensBest, Math.floor(tokens));
    this.runs++;
    this.save();
    return beaten;
  }

  // Forgets everything but the settings.
  clearBests() {
    this.trialBest = null;
    this.scoreBest = 0;
    this.chainBest = 0;
    this.tokensBest = 0;
    this.runs = 0;
    this.save();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RECORDS, pageStorage, cleanRecords, Records };
} else {
  Object.assign(window, { RECORDS, pageStorage, cleanRecords, Records });
}
```

Things to notice:

- **`cleanRecords` is the one door.** The constructor, and `set`, both go through it, so there is one place that says what a good record is.
- **A new best returns `true`.** `noteTrial` says whether the time beat the old one (the first time always does), and keeps it if so. The game uses the answer to say "new best!".
- **`noteRun` says which numbers are new bests,** as a list of names, so a screen could say "new best score and chain".
- **Saving can fail without anyone noticing, and that is right:** `save` returns `false` and the game goes on.

### Tests

Open `tests/records.tests.js` (the placeholder) and **replace the TODO line** with:

```js
// A stand-in for the browser's storage, that can be made to refuse.
const makeStorage = (start = {}, { refuse = false } = {}) => {
  const kept = { ...start };
  return {
    kept,
    getItem(key) {
      if (refuse) throw new Error("no storage");
      return key in kept ? kept[key] : null;
    },
    setItem(key, value) {
      if (refuse) throw new Error("no storage");
      kept[key] = String(value);
    },
    removeItem(key) {
      delete kept[key];
    },
  };
};

QUnit.module("cleanRecords", () => {
  QUnit.test("nothing kept gives the defaults", (assert) => {
    assert.deepEqual(cleanRecords(null), RECORDS.defaults);
    assert.deepEqual(cleanRecords("a string"), RECORDS.defaults);
  });

  QUnit.test("good values are kept, and bad ones are replaced one by one", (assert) => {
    const clean = cleanRecords({ runner: "female", volume: "loud", lookSpeed: 0.004, trialBest: 41.5, scoreBest: 120.9, chainBest: -3, tokensBest: NaN, runs: 4 });
    assert.strictEqual(clean.runner, "female");
    assert.strictEqual(clean.volume, RECORDS.defaults.volume, "a word is not a volume");
    assert.strictEqual(clean.lookSpeed, 0.004);
    assert.strictEqual(clean.trialBest, 41.5);
    assert.strictEqual(clean.scoreBest, 120, "whole numbers");
    assert.strictEqual(clean.chainBest, 0, "never below nothing");
    assert.strictEqual(clean.tokensBest, 0);
    assert.strictEqual(clean.runs, 4);
  });

  QUnit.test("a runner that is not one of the runners is the default, and a setting is held to its limits", (assert) => {
    assert.strictEqual(cleanRecords({ runner: "robot" }).runner, "male");
    assert.strictEqual(cleanRecords({ volume: 7 }).volume, 1);
    assert.strictEqual(cleanRecords({ volume: -1 }).volume, 0);
    assert.strictEqual(cleanRecords({ lookSpeed: 5 }).lookSpeed, RECORDS.limits.lookSpeed[1]);
  });

  QUnit.test("a best time of nothing or less is no time at all", (assert) => {
    assert.strictEqual(cleanRecords({ trialBest: 0 }).trialBest, null);
    assert.strictEqual(cleanRecords({ trialBest: -5 }).trialBest, null);
  });
});

QUnit.module("Records", () => {
  QUnit.test("a new player has the defaults", (assert) => {
    const records = new Records(makeStorage());
    assert.strictEqual(records.runner, "male");
    assert.strictEqual(records.trialBest, null);
    assert.strictEqual(records.runs, 0);
  });

  QUnit.test("what is kept is what is read back the next time", (assert) => {
    const storage = makeStorage();
    const first = new Records(storage);
    first.set("runner", "female");
    first.noteTrial(44.2);
    first.noteRun({ score: 300, chain: 9, tokens: 5 });
    const second = new Records(storage);
    assert.strictEqual(second.runner, "female");
    assert.strictEqual(second.trialBest, 44.2);
    assert.strictEqual(second.scoreBest, 300);
    assert.strictEqual(second.chainBest, 9);
    assert.strictEqual(second.runs, 1);
  });

  QUnit.test("nonsense in the storage is not believed, and does not stop the game", (assert) => {
    assert.strictEqual(new Records(makeStorage({ [RECORDS.key]: "{not json" })).runner, "male");
    assert.strictEqual(new Records(makeStorage({ [RECORDS.key]: '{"runner":"female","volume":2}' })).volume, 1);
  });

  QUnit.test("storage that refuses is allowed to: the records are for this visit only", (assert) => {
    const records = new Records(makeStorage({}, { refuse: true }));
    assert.strictEqual(records.runner, "male");
    assert.false(records.save());
    assert.true(records.noteTrial(50), "it still knows a best, for now");
    assert.strictEqual(records.trialBest, 50);
  });

  QUnit.test("a setting is held to its limits and an unknown one is ignored", (assert) => {
    const records = new Records(makeStorage());
    assert.strictEqual(records.set("volume", 3), 1);
    assert.strictEqual(records.set("runner", "robot"), "male");
  });

  QUnit.test("the first trial is a best, a slower one is not, a faster one is", (assert) => {
    const records = new Records(makeStorage());
    assert.true(records.noteTrial(60));
    assert.false(records.noteTrial(61));
    assert.false(records.noteTrial(60), "the same time is not better");
    assert.true(records.noteTrial(59.9));
    assert.strictEqual(records.trialBest, 59.9);
    assert.false(records.noteTrial(0), "a time of nothing is not a run");
  });

  QUnit.test("a run says which of its numbers are new bests, and keeps the better of each", (assert) => {
    const records = new Records(makeStorage());
    assert.deepEqual(records.noteRun({ score: 100, chain: 4, tokens: 2 }), ["score", "chain", "tokens"]);
    assert.deepEqual(records.noteRun({ score: 80, chain: 7, tokens: 1 }), ["chain"]);
    assert.strictEqual(records.scoreBest, 100);
    assert.strictEqual(records.chainBest, 7);
    assert.strictEqual(records.runs, 2);
  });

  QUnit.test("clearing the bests keeps the settings", (assert) => {
    const records = new Records(makeStorage());
    records.set("runner", "female");
    records.noteTrial(40);
    records.noteRun({ score: 10 });
    records.clearBests();
    assert.strictEqual(records.trialBest, null);
    assert.strictEqual(records.scoreBest, 0);
    assert.strictEqual(records.runner, "female");
  });

  QUnit.test("the page's storage is used when it works, and a stand-in when it does not", (assert) => {
    const stand = pageStorage({ localStorage: { setItem() { throw new Error("full"); }, removeItem() {}, getItem() { return null; } } });
    stand.setItem("a", "1");
    assert.strictEqual(stand.getItem("a"), "1");
    const real = makeStorage();
    assert.strictEqual(pageStorage({ localStorage: real }), real);
    assert.strictEqual(pageStorage(null).getItem("nothing"), null);
  });
});
```

`makeStorage` is a stand-in for the browser's storage, and it can be told to refuse: the test "storage that refuses is allowed to" is the one that matters most.

Open `tests.html`. You should see **667 passing tests**: 13 more.

## Step 2: Screens

Two screens, and a question: which one is up? That is a **state machine**: `loading`, `title`, `playing`, `paused`, and a table of which may follow which (`SCREEN_STATES`). It has nothing drawn in it, so a test can say that the game cannot be paused from the title, or begun before it has loaded, and that listeners are told of every change (and of nothing that did not happen).

`Screens` is the drawing: it builds the title (the logo, a button for each runner, the bests, Play) and the pause (Resume, the trial again, back to the title, a slider for the sound and one for the mouse) from the page's `document`, hidden. It does not know what any button *does*: it is given handlers (`onPlay`, `onResume`, `onVolume`...) and calls them. `bestLines` is a plain function that says the best times in words, so a test can say that a new player is told there are no times yet.

Open `js/screens.js` (the placeholder) and **replace the TODO line** with:

```js
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
```

And the stylesheet. Open `css/screens.css` (the placeholder) and **replace the TODO line** with:

```css
/* The title and the pause: a dark sheet over the game with a column of things to press, in the colours of the series (see theme.css). They are above the
   hud and the hint, and below nothing. `hidden` takes them away. */
.screen {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
  background: rgba(14, 16, 20, 0.82);
  color: var(--paper);
  font-family: var(--small-font);
  letter-spacing: 0.06em;
  text-align: center;
}
.screen.hidden {
  display: none;
}
.screen-logo {
  width: min(560px, 86vw);
  height: auto;
}
.screen-heading {
  margin: 0;
  font: 64px / 1 var(--title-font);
  color: var(--orange);
}
.screen-label {
  margin: 4px 0 0;
  font-size: 20px;
  color: var(--sky);
}
.screen-choice {
  display: flex;
  gap: 12px;
}
.screen button {
  min-width: 150px;
  padding: 10px 22px;
  border: 3px solid var(--paper);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.55);
  color: var(--paper);
  font: 22px var(--small-font);
  letter-spacing: 0.08em;
  cursor: pointer;
}
.screen button:hover,
.screen button:focus-visible {
  border-color: var(--orange);
  color: var(--orange);
}
.screen button.chosen {
  border-color: var(--orange);
  background: rgba(255, 122, 26, 0.25);
  color: var(--orange);
}
.screen button.primary {
  min-width: 220px;
  padding: 12px 30px;
  background: var(--orange);
  border-color: var(--orange);
  color: var(--asphalt);
  font-size: 30px;
}
.screen button:disabled {
  opacity: 0.5;
  cursor: wait;
}
.screen-bests {
  min-height: 24px;
  margin: 6px 0;
}
.screen-best {
  margin: 2px 0;
  font-size: 18px;
}
.screen-status {
  min-height: 22px;
  margin: 0;
  font-size: 16px;
  color: var(--good);
}
.screen-slider {
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(360px, 86vw);
  justify-content: space-between;
  font-size: 18px;
}
.screen-slider input {
  flex: 1;
  accent-color: var(--orange);
}
@media (max-height: 520px), (max-width: 640px) {
  .screen {
    gap: 8px;
  }
  .screen-logo {
    width: min(320px, 60vw);
  }
  .screen-heading {
    font-size: 40px;
  }
  .screen button {
    min-width: 120px;
    padding: 8px 14px;
    font-size: 18px;
  }
  .screen button.primary {
    font-size: 24px;
  }
}
```

Things to notice:

- **`running` is only true while playing.** Everything that moves will ask it. Pausing is not "stop drawing": the district keeps drawing, behind the pause, and the world simply gets no time.
- **A button that can be pressed twice is a bug.** Play is disabled (`setStatus(text, true)`) while the runner loads, so a second press cannot start a second load.
- **The tests use the real `document`.** The screens are built, looked at, and taken away again (`gone`).

### Tests

Open `tests/screens.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("ScreenFlow", () => {
  QUnit.test("it begins loading, and the title comes when the district is ready", (assert) => {
    const flow = new ScreenFlow();
    assert.strictEqual(flow.state, "loading");
    assert.false(flow.running);
    assert.true(flow.loaded());
    assert.strictEqual(flow.state, "title");
  });

  QUnit.test("the game cannot be played or paused before the title, nor paused from the title", (assert) => {
    const flow = new ScreenFlow();
    assert.false(flow.play());
    assert.false(flow.pause());
    flow.loaded();
    assert.false(flow.pause());
    assert.false(flow.resume());
    assert.strictEqual(flow.state, "title");
  });

  QUnit.test("play, pause, resume, and back to the title", (assert) => {
    const flow = new ScreenFlow();
    flow.loaded();
    assert.true(flow.play());
    assert.true(flow.running);
    assert.true(flow.pause());
    assert.false(flow.running, "the world stops while paused");
    assert.true(flow.resume());
    assert.true(flow.running);
    flow.pause();
    assert.true(flow.quit());
    assert.strictEqual(flow.state, "title");
  });

  QUnit.test("a screen that is already up is not put up again", (assert) => {
    const flow = new ScreenFlow();
    flow.loaded();
    flow.play();
    flow.pause();
    assert.false(flow.pause(), "paused twice is paused once");
    assert.false(flow.go("loading"));
  });

  QUnit.test("listeners are told of each change, with where it came from", (assert) => {
    const flow = new ScreenFlow();
    const told = [];
    flow.onChange((now, before) => told.push(`${before}>${now}`));
    flow.loaded();
    flow.play();
    flow.pause();
    flow.pause();
    assert.deepEqual(told, ["loading>title", "title>playing", "playing>paused"]);
  });
});

QUnit.module("bestLines", () => {
  const records = (extra = {}) => ({ runs: 0, trialBest: null, scoreBest: 0, chainBest: 0, tokensBest: 0, ...extra });

  QUnit.test("a new player is told there are no times yet", (assert) => {
    const lines = bestLines(records());
    assert.strictEqual(lines.length, 1);
    assert.true(lines[0].includes("No times yet"));
  });

  QUnit.test("a player who has run has the best of everything", (assert) => {
    const lines = bestLines(records({ runs: 3, trialBest: 41.26, scoreBest: 480, chainBest: 12, tokensBest: 9 }));
    assert.deepEqual(lines, ["Trial: 0:41.2", "Best score: 480", "Longest chain: 12", "Most tokens: 9"]);
  });

  QUnit.test("a player who has not yet run the trial is told so", (assert) => {
    assert.strictEqual(bestLines(records({ runs: 1, scoreBest: 5 }))[0], "Trial: not yet run");
  });
});

QUnit.module("Screens", () => {
  const records = { runner: "female", volume: 0.4, lookSpeed: 0.002, runs: 2, trialBest: 40, scoreBest: 100, chainBest: 6, tokensBest: 3 };
  const make = (handlers = {}) => new Screens(document, handlers);
  const gone = (screens) => {
    screens.title.remove();
    screens.pause.remove();
  };

  QUnit.test("both screens are made hidden", (assert) => {
    const screens = make();
    assert.true(screens.title.classList.contains("hidden"));
    assert.true(screens.pause.classList.contains("hidden"));
    gone(screens);
  });

  QUnit.test("the title shows the chosen runner and the bests, and the pause is away", (assert) => {
    const screens = make();
    screens.showTitle(records);
    assert.false(screens.title.classList.contains("hidden"));
    assert.true(screens.pause.classList.contains("hidden"));
    assert.true(screens.runnerButtons.female.classList.contains("chosen"));
    assert.false(screens.runnerButtons.male.classList.contains("chosen"));
    assert.strictEqual(screens.runnerButtons.female.getAttribute("aria-pressed"), "true");
    assert.strictEqual(screens.bests.children.length, 4);
    gone(screens);
  });

  QUnit.test("choosing a runner marks it and says which; Play says which runner to play", (assert) => {
    const chosen = [];
    const played = [];
    const screens = make({ onRunner: (name) => chosen.push(name), onPlay: (name) => played.push(name) });
    screens.showTitle({ ...records, runner: "male" });
    screens.runnerButtons.female.click();
    assert.deepEqual(chosen, ["female"]);
    assert.true(screens.runnerButtons.female.classList.contains("chosen"));
    screens.playButton.click();
    assert.deepEqual(played, ["female"]);
    gone(screens);
  });

  QUnit.test("the pause screen shows the settings, and the buttons say what was pressed", (assert) => {
    const told = [];
    const screens = make({ onResume: () => told.push("resume"), onRestart: () => told.push("restart"), onQuit: () => told.push("quit"), onVolume: (v) => told.push(`volume ${v}`), onLookSpeed: (v) => told.push(`look ${v}`) });
    screens.showPause(records);
    assert.false(screens.pause.classList.contains("hidden"));
    assert.strictEqual(screens.volume.value, "0.4");
    screens.resumeButton.click();
    screens.restartButton.click();
    screens.quitButton.click();
    screens.volume.value = "0.9";
    screens.volume.dispatchEvent(new Event("input"));
    screens.lookSpeed.value = "0.005";
    screens.lookSpeed.dispatchEvent(new Event("input"));
    assert.deepEqual(told, ["resume", "restart", "quit", "volume 0.9", "look 0.005"]);
    gone(screens);
  });

  QUnit.test("hide puts both away, and the status can stop Play from being pressed while something loads", (assert) => {
    const screens = make();
    screens.showTitle(records);
    screens.setStatus("Loading the runner...", true);
    assert.true(screens.playButton.disabled);
    assert.strictEqual(screens.status.textContent, "Loading the runner...");
    screens.setStatus("");
    assert.false(screens.playButton.disabled);
    screens.hide();
    assert.true(screens.title.classList.contains("hidden"));
    gone(screens);
  });
});
```

Open `tests.html`. You should see **680 passing tests**: 13 more.

## Step 3: Sound

There are no sound files in this game. A footstep is a tenth of a second of filtered noise; a jump is a tone that slides up; a chime is two tones, the second a moment after the first. They are made with **Web Audio**, the browser's sound system, from two kinds of source:

- an **oscillator**, a tone with a pitch that can slide from one frequency to another (`from` and `to`, in hertz), and a shape (`sine`, `triangle`, `square`, `sawtooth`)
- a **burst of noise** (a buffer of random numbers, made once and shared) through a **filter** (`lowpass` for a thud, `bandpass` for a whoosh)

each with an **envelope**: a loudness that rises in an instant and dies away over the sound's `length`. A sound is a list of such **layers** in a table (`SOUNDS`), each with its own `delay`, `length` and `gain`, so a sound is a few numbers a person can tune by ear.

`soundPlan` turns a sound and a strength into layers (a harder landing is louder, and a little longer). `Sound` plays them. `FootstepClock` says when a foot comes down, **by distance and not by time**: one step every `stride` metres, so a runner who is faster has steps closer together and one who is standing has none. `landingSound` says whether a fall was heard, and how hard.

Open `js/sound.js` (the placeholder) and **replace the TODO line** with:

```js
// Sound: made in code, with Web Audio, so there is no file to download and no sound that is not tuned to the game. Each sound is a short list of layers (a tone that
// slides from one pitch to another, or a burst of noise through a filter), each with its own length and loudness, in a table; `soundPlan` works out the layers for a
// sound at a strength; and `Sound` plays a plan through a Web Audio context. The footsteps are paced by how fast the runner goes (FootstepClock), and what
// the runner does is turned into sounds by plain functions. A browser lets a page make sound only after the player has touched it, which is why the Play button
// is where it begins (`unlock`). See ../tests/sound.tests.js.

// A layer is { kind: "tone" | "noise", wave (for a tone), from and to (the pitch of a tone, in hertz, at the start and the end), filter and freq (what noise goes
// through: "lowpass", "highpass" or "bandpass", and its frequency), delay and length (seconds), gain (0 to 1) }.
const SOUNDS = {
  step: { layers: [{ kind: "noise", filter: "lowpass", freq: 700, length: 0.06, gain: 0.07 }] },
  jump: { layers: [{ kind: "tone", wave: "sine", from: 190, to: 380, length: 0.13, gain: 0.18 }, { kind: "noise", filter: "bandpass", freq: 1100, length: 0.09, gain: 0.07 }] },
  land: { layers: [{ kind: "tone", wave: "sine", from: 120, to: 45, length: 0.2, gain: 0.5 }, { kind: "noise", filter: "lowpass", freq: 500, length: 0.14, gain: 0.3 }] },
  roll: { layers: [{ kind: "noise", filter: "lowpass", freq: 600, length: 0.4, gain: 0.25 }, { kind: "tone", wave: "sine", from: 90, to: 60, length: 0.25, gain: 0.3 }] },
  grab: { layers: [{ kind: "noise", filter: "bandpass", freq: 1800, length: 0.07, gain: 0.2 }, { kind: "tone", wave: "triangle", from: 260, to: 180, length: 0.12, gain: 0.2 }] },
  climb: { layers: [{ kind: "noise", filter: "bandpass", freq: 700, length: 0.35, gain: 0.14 }, { kind: "tone", wave: "triangle", from: 150, to: 200, length: 0.3, gain: 0.1 }] },
  vault: { layers: [{ kind: "noise", filter: "bandpass", freq: 1400, length: 0.28, gain: 0.2 }, { kind: "tone", wave: "sine", from: 300, to: 160, length: 0.16, gain: 0.12 }] },
  mantle: { layers: [{ kind: "noise", filter: "lowpass", freq: 900, length: 0.3, gain: 0.18 }, { kind: "tone", wave: "triangle", from: 140, to: 220, length: 0.25, gain: 0.12 }] },
  kick: { layers: [{ kind: "tone", wave: "sine", from: 200, to: 70, length: 0.16, gain: 0.4 }, { kind: "noise", filter: "bandpass", freq: 1600, length: 0.1, gain: 0.2 }] },
  token: { layers: [{ kind: "tone", wave: "sine", from: 880, to: 880, length: 0.14, gain: 0.22 }, { kind: "tone", wave: "sine", from: 1320, to: 1320, delay: 0.07, length: 0.22, gain: 0.2 }] },
  checkpoint: { layers: [{ kind: "tone", wave: "triangle", from: 520, to: 520, length: 0.12, gain: 0.25 }, { kind: "tone", wave: "triangle", from: 780, to: 780, delay: 0.1, length: 0.2, gain: 0.25 }] },
  finish: { layers: [{ kind: "tone", wave: "triangle", from: 523, to: 523, length: 0.18, gain: 0.25 }, { kind: "tone", wave: "triangle", from: 659, to: 659, delay: 0.14, length: 0.18, gain: 0.25 }, { kind: "tone", wave: "triangle", from: 784, to: 784, delay: 0.28, length: 0.4, gain: 0.28 }] },
  combo: { layers: [{ kind: "tone", wave: "sawtooth", from: 330, to: 660, length: 0.25, gain: 0.12 }, { kind: "tone", wave: "triangle", from: 990, to: 990, delay: 0.18, length: 0.3, gain: 0.2 }] },
  click: { layers: [{ kind: "tone", wave: "square", from: 600, to: 400, length: 0.04, gain: 0.08 }] },
};

// The layers of a sound at a strength (0 to 1 and over: how hard a landing was, how fast the steps are): every gain is multiplied by it, a stronger
// sound is a little longer, and nothing is louder than 1. An unknown sound has no layers.
function soundPlan(name, strength = 1, table = SOUNDS) {
  const sound = table[name];
  if (!sound) return [];
  const s = Math.max(0, strength);
  return sound.layers.map((layer) => ({ ...layer, delay: layer.delay || 0, gain: Math.min(1, layer.gain * s), length: layer.length * (0.8 + 0.2 * Math.min(1, s)) }));
}

// The sound of each move the flow knows of (the kinds of moveEvents).
const MOVE_SOUNDS = { jump: "jump", roll: "roll", grab: "grab", climb: "climb", vault: "vault", mantle: "mantle", kick: "kick" };

// The numbers of the sounds the body makes by itself. A landing is heard when the fall was at least `minImpact` m/s, and is as strong as the fall was fast compared
// with `hardImpact`. A step is heard every `stride` metres run, when the body is on the ground and going at least `minSpeed`.
const BODY_SOUND = { minImpact: 3, hardImpact: 14, stride: 1.7, minSpeed: 0.8 };

// The landing sound for a fall that has just ended, as { name, strength }, or null if the fall was too small to hear.
function landingSound(impact, table = BODY_SOUND) {
  if (impact < table.minImpact) return null;
  return { name: "land", strength: Math.min(1.5, impact / table.hardImpact) };
}

// Says when a foot comes down: told how far the body has gone and whether it is on the ground, it answers true every `stride` metres.
class FootstepClock {
  constructor(table = BODY_SOUND) {
    this.table = table;
    this.travelled = 0;
  }

  update(dt, speed, grounded) {
    if (!grounded || speed < this.table.minSpeed) {
      this.travelled = this.table.stride * 0.5; // the next foot comes soon after it starts to move again
      return false;
    }
    this.travelled += speed * dt;
    if (this.travelled < this.table.stride) return false;
    this.travelled -= this.table.stride;
    return true;
  }
}

class Sound {
  // `context` is a Web Audio context (or anything like one, to test with). With none, `unlock` makes the page's.
  constructor(context = null, table = SOUNDS) {
    this.context = context;
    this.table = table;
    this.volume = 0.7;
    this.master = null;
    this.noise = null;
    if (context) this._build();
  }

  _build() {
    const context = this.context;
    this.master = context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(context.destination);
    // one second of noise, made once and shared by every burst
    this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  // Makes the context (a browser only allows it from a touch of the page) and wakes it. Says whether there is sound.
  unlock() {
    if (!this.context) {
      const Context = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
      if (!Context) return false;
      this.context = new Context();
      this._build();
    }
    if (this.context.state === "suspended" && this.context.resume) this.context.resume();
    return true;
  }

  get ready() {
    return Boolean(this.context);
  }

  setVolume(value) {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.master) this.master.gain.value = this.volume;
  }

  // Plays a sound at a strength, now (or at `when`, in the context's time). Nothing happens if there is no sound.
  play(name, strength = 1, when = null) {
    if (!this.context) return 0;
    const context = this.context;
    const start = when === null ? context.currentTime : when;
    const layers = soundPlan(name, strength, this.table);
    for (const layer of layers) this._layer(layer, start + layer.delay);
    return layers.length;
  }

  _layer(layer, start) {
    const context = this.context;
    const envelope = context.createGain();
    const end = start + layer.length;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, layer.gain), start + Math.min(0.01, layer.length / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    envelope.connect(this.master);
    let source;
    if (layer.kind === "tone") {
      source = context.createOscillator();
      source.type = layer.wave || "sine";
      source.frequency.setValueAtTime(layer.from, start);
      if (layer.to !== layer.from) source.frequency.exponentialRampToValueAtTime(layer.to, end);
      source.connect(envelope);
    } else {
      source = context.createBufferSource();
      source.buffer = this.noise;
      const filter = context.createBiquadFilter();
      filter.type = layer.filter || "lowpass";
      filter.frequency.value = layer.freq || 1000;
      source.connect(filter);
      filter.connect(envelope);
    }
    source.start(start);
    source.stop(end + 0.02);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SOUNDS, soundPlan, MOVE_SOUNDS, BODY_SOUND, landingSound, FootstepClock, Sound };
} else {
  Object.assign(window, { SOUNDS, soundPlan, MOVE_SOUNDS, BODY_SOUND, landingSound, FootstepClock, Sound });
}
```

Things to notice:

- **A page cannot make sound until the player has touched it.** `unlock` is where the context is made and woken, and the game calls it from the Play button: that touch is what the browser is waiting for. Before it, `play` does nothing, and nothing goes wrong.
- **The context is given to `Sound`.** That is how the tests render a sound without a speaker: an `OfflineAudioContext` computes the sound as numbers, and the test measures them (the last test renders *every* sound, and says that it is not silent, not louder than 1, and quiet by the end).
- **A stand-in context** (`stand` in the tests) remembers which nodes were made and when they were started, to test that a delayed layer starts later.

### Tests

Open `tests/sound.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("soundPlan", () => {
  QUnit.test("every sound of the game has layers with a length, a gain and a kind", (assert) => {
    for (const name of Object.keys(SOUNDS)) {
      const plan = soundPlan(name);
      assert.true(plan.length > 0, name);
      for (const layer of plan) {
        assert.true(layer.length > 0 && layer.length < 1, `${name} length`);
        assert.true(layer.gain > 0 && layer.gain <= 1, `${name} gain`);
        assert.true(layer.kind === "tone" || layer.kind === "noise", `${name} kind`);
        if (layer.kind === "tone") assert.true(layer.from > 20 && layer.to > 20, `${name} pitch`);
      }
    }
  });

  QUnit.test("strength changes the loudness, and nothing is louder than one", (assert) => {
    const soft = soundPlan("land", 0.2)[0];
    const hard = soundPlan("land", 1.4)[0];
    assert.true(hard.gain > soft.gain);
    assert.true(hard.length > soft.length, "a harder landing rings a little longer");
    assert.true(soundPlan("land", 100).every((layer) => layer.gain <= 1));
    assert.strictEqual(soundPlan("land", -3)[0].gain, 0, "no strength is no sound");
  });

  QUnit.test("an unknown sound is nothing", (assert) => {
    assert.deepEqual(soundPlan("a quack"), []);
  });

  QUnit.test("every move that flow knows has a sound of its own, and the sounds are in the table", (assert) => {
    for (const kind of Object.keys(FLOW.points).filter((k) => k !== "token")) assert.true(kind in MOVE_SOUNDS, kind);
    for (const name of Object.values(MOVE_SOUNDS)) assert.true(name in SOUNDS, name);
  });
});

QUnit.module("landings and footsteps", () => {
  QUnit.test("a small fall is not heard, a bigger one is, and a hard one is stronger", (assert) => {
    assert.strictEqual(landingSound(1), null);
    const medium = landingSound(8);
    const hard = landingSound(20);
    assert.strictEqual(medium.name, "land");
    assert.true(hard.strength > medium.strength);
    assert.true(hard.strength <= 1.5);
  });

  QUnit.test("a foot comes down every stride when running, and none while standing or in the air", (assert) => {
    const clock = new FootstepClock();
    let steps = 0;
    for (let t = 0; t < 10; t += 1 / 60) if (clock.update(1 / 60, 5, true)) steps++;
    assert.true(Math.abs(steps - (5 * 10) / BODY_SOUND.stride) <= 2, `${steps} steps in ten seconds at 5 m/s`);
    const still = new FootstepClock();
    for (let t = 0; t < 5; t += 1 / 60) assert.false(still.update(1 / 60, 0, true));
    const flying = new FootstepClock();
    for (let t = 0; t < 5; t += 1 / 60) assert.false(flying.update(1 / 60, 6, false));
  });

  QUnit.test("a faster runner has steps closer together", (assert) => {
    const count = (speed) => {
      const clock = new FootstepClock();
      let steps = 0;
      for (let t = 0; t < 10; t += 1 / 60) if (clock.update(1 / 60, speed, true)) steps++;
      return steps;
    };
    assert.true(count(8) > count(3));
  });

  QUnit.test("the first foot comes soon after starting to move", (assert) => {
    const clock = new FootstepClock();
    clock.update(1 / 60, 0, true);
    let frames = 0;
    while (!clock.update(1 / 60, 5, true) && frames < 120) frames++;
    assert.true(frames / 60 < (BODY_SOUND.stride / 5) * 0.7, `${frames} frames`);
  });
});

QUnit.module("Sound", () => {
  // A stand-in for a Web Audio context that remembers what was made.
  const stand = () => {
    const made = { oscillators: 0, buffers: 0, gains: 0, filters: 0, started: [] };
    const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
    const node = (extra = {}) => ({ connect() {}, ...extra });
    return {
      made,
      currentTime: 2,
      sampleRate: 8000,
      state: "suspended",
      resume() { this.state = "running"; },
      destination: node(),
      createGain: () => { made.gains++; return node({ gain: param() }); },
      createOscillator: () => { made.oscillators++; return node({ frequency: param(), start: (t) => made.started.push(t), stop() {} }); },
      createBufferSource: () => { made.buffers++; return node({ start: (t) => made.started.push(t), stop() {} }); },
      createBiquadFilter: () => { made.filters++; return node({ frequency: param() }); },
      createBuffer: (channels, length) => ({ getChannelData: () => new Float32Array(length) }),
    };
  };

  QUnit.test("with no context there is no sound, and nothing goes wrong", (assert) => {
    const sound = new Sound(null);
    assert.false(sound.ready);
    assert.strictEqual(sound.play("jump"), 0);
  });

  QUnit.test("a sound makes a source for each layer, at the time it was asked for, and a delayed layer later", (assert) => {
    const context = stand();
    const sound = new Sound(context);
    assert.strictEqual(sound.play("token"), 2);
    assert.strictEqual(context.made.oscillators, 2);
    assert.strictEqual(context.made.started[0], 2);
    assert.true(Math.abs(context.made.started[1] - 2.07) < 1e-9, "the second note is the delayed one");
    sound.play("step", 1, 5);
    assert.strictEqual(context.made.buffers, 1);
    assert.strictEqual(context.made.filters, 1);
    assert.strictEqual(context.made.started[2], 5);
  });

  QUnit.test("the volume is held between nothing and full", (assert) => {
    const sound = new Sound(stand());
    sound.setVolume(4);
    assert.strictEqual(sound.volume, 1);
    assert.strictEqual(sound.master.gain.value, 1);
    sound.setVolume(-1);
    assert.strictEqual(sound.volume, 0);
  });

  QUnit.test("unlock wakes a context that is asleep", (assert) => {
    const context = stand();
    const sound = new Sound(context);
    assert.true(sound.unlock());
    assert.strictEqual(context.state, "running");
  });

  QUnit.test("every sound can be rendered, is not silent, and ends in quiet", async (assert) => {
    for (const name of Object.keys(SOUNDS)) {
      const context = new OfflineAudioContext(1, 44100, 44100);
      const sound = new Sound(context);
      sound.setVolume(1);
      sound.play(name, 1, 0);
      const data = (await context.startRendering()).getChannelData(0);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v));
      let tail = 0;
      for (let i = 44100 - 2000; i < 44100; i++) tail = Math.max(tail, Math.abs(data[i]));
      assert.true(peak > 0.004 && peak <= 1, `${name} peaks at ${peak.toFixed(3)}`);
      assert.true(tail < 0.002, `${name} is quiet by the end`);
    }
  });
});
```

Open `tests.html`. You should see **693 passing tests**: 13 more.

## Step 4: Dust

A hard landing should kick up dust. How much is arithmetic: none for a small fall, and then more puffs, bigger and wider, as the fall goes from `minImpact` to `hardImpact`, and no more than the most after that (`dustFor`). The drawing is **one particle system** for the whole game, with no emit rate of its own: a burst is asked for where it is wanted (`manualEmitCount`), which is cheaper than making a system for every landing.

Open `js/effects.js` (the placeholder) and **replace the TODO line** with:

```js
// Effects: a puff of dust where the runner lands hard or kicks off a wall. How much dust is plain arithmetic of how hard the landing was (`dustFor`), in a table,
// and `Dust` is the particle system that draws it: one system for the whole game, that a burst is added to wherever it is needed. See ../tests/effects.tests.js.

const DUST = {
  minImpact: 5, // m/s of fall (about 1.3 metres) below which there is no dust
  hardImpact: 20, // and the fall at which there is the most
  count: [5, 28], // puffs, at the least and at the most
  size: [0.5, 1.1], // metres across (at the least and the most), as a puff swells
  rise: 0.7, // m/s that the puffs drift up
  spread: 2.4, // m/s that they go out sideways at the most
  life: [0.4, 0.9], // seconds a puff lasts
  kick: { count: 7, size: 0.7 }, // a kick off a wall is a small burst, always
  color: [0.78, 0.74, 0.66],
  maxParticles: 160,
};

// The dust for a landing at `impact` m/s: { count, size, spread } or null for none. It grows from the least to the most as the impact goes from `minImpact` to `hardImpact`.
function dustFor(impact, table = DUST) {
  if (!(impact >= table.minImpact)) return null;
  const t = Math.min(1, (impact - table.minImpact) / (table.hardImpact - table.minImpact));
  const mix = ([low, high]) => low + (high - low) * t;
  return { count: Math.round(mix(table.count)), size: mix(table.size), spread: table.spread * (0.4 + 0.6 * t) };
}

// A soft round puff, as a texture: white in the middle and clear at the edge, drawn once.
function puffTexture(scene, size = 64) {
  const texture = new BABYLON.DynamicTexture("puff", { width: size, height: size }, scene, false);
  const context = texture.getContext();
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.update();
  texture.hasAlpha = true;
  return texture;
}

class Dust {
  constructor(scene, table = DUST) {
    this.table = table;
    const system = new BABYLON.ParticleSystem("dust", table.maxParticles, scene);
    system.particleTexture = puffTexture(scene);
    system.emitter = new BABYLON.Vector3(0, -100, 0);
    system.emitRate = 0; // nothing flows by itself: a burst is asked for
    system.manualEmitCount = 0;
    system.minLifeTime = table.life[0];
    system.maxLifeTime = table.life[1];
    system.minSize = table.size[0];
    system.maxSize = table.size[1];
    system.color1 = new BABYLON.Color4(...table.color, 0.55);
    system.color2 = new BABYLON.Color4(...table.color, 0.4);
    system.colorDead = new BABYLON.Color4(...table.color, 0);
    system.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    system.gravity = new BABYLON.Vector3(0, 0.1, 0);
    system.minEmitBox = new BABYLON.Vector3(-0.2, 0, -0.2);
    system.maxEmitBox = new BABYLON.Vector3(0.2, 0.05, 0.2);
    system.direction1 = new BABYLON.Vector3(-1, table.rise, -1);
    system.direction2 = new BABYLON.Vector3(1, table.rise, 1);
    system.minEmitPower = 0.4;
    system.maxEmitPower = 1;
    system.updateSpeed = 1 / 60;
    system.start();
    this.system = system;
    this.bursts = 0;
  }

  // A burst at a point (the runner's feet): `shape` is what dustFor gave ({ count, size, spread }). It says how many puffs it made.
  burst(x, y, z, shape) {
    if (!shape || shape.count <= 0) return 0;
    const system = this.system;
    system.emitter.set(x, y, z);
    system.maxSize = shape.size;
    system.minEmitPower = shape.spread * 0.3;
    system.maxEmitPower = shape.spread;
    system.manualEmitCount = Math.max(0, system.manualEmitCount) + shape.count;
    this.bursts++;
    return shape.count;
  }

  dispose() {
    this.system.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DUST, dustFor, puffTexture, Dust };
} else {
  Object.assign(window, { DUST, dustFor, puffTexture, Dust });
}
```

Things to notice:

- **The puff is drawn, not loaded.** `puffTexture` paints a soft round gradient on a small canvas once.
- **`DUST.maxParticles` is more than four of the biggest bursts at once,** and a test says so, because a table can be changed and a test is what remembers why it was that size.

### Tests

Open `tests/effects.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("dustFor", () => {
  QUnit.test("a small fall raises no dust", (assert) => {
    assert.strictEqual(dustFor(0), null);
    assert.strictEqual(dustFor(DUST.minImpact - 0.1), null);
    assert.strictEqual(dustFor(NaN), null);
  });

  QUnit.test("the dust grows with the fall, from the least to the most, and no further", (assert) => {
    const small = dustFor(DUST.minImpact);
    const big = dustFor(DUST.hardImpact);
    const huge = dustFor(DUST.hardImpact * 3);
    assert.strictEqual(small.count, DUST.count[0]);
    assert.strictEqual(big.count, DUST.count[1]);
    assert.deepEqual(huge, big, "a longer fall than the most is the most");
    assert.true(big.size > small.size && big.spread > small.spread);
    const middle = dustFor((DUST.minImpact + DUST.hardImpact) / 2);
    assert.true(middle.count > small.count && middle.count < big.count);
  });

  QUnit.test("the dust never has more puffs than the system can hold", (assert) => {
    assert.true(DUST.count[1] * 4 <= DUST.maxParticles, "four big bursts at once still fit");
  });
});

QUnit.module("Dust", () => {
  QUnit.test("a burst adds puffs to the system, at the place, and says how many", (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const dust = new Dust(scene);
    assert.strictEqual(dust.system.emitRate, 0, "it makes nothing by itself");
    const made = dust.burst(3, 1, -2, dustFor(15));
    assert.true(made > DUST.count[0]);
    assert.strictEqual(dust.system.manualEmitCount, made);
    assert.deepEqual([dust.system.emitter.x, dust.system.emitter.y, dust.system.emitter.z], [3, 1, -2]);
    assert.strictEqual(dust.bursts, 1);
    dust.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("no shape is no burst", (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const dust = new Dust(scene);
    assert.strictEqual(dust.burst(0, 0, 0, null), 0);
    assert.strictEqual(dust.system.manualEmitCount, 0);
    dust.dispose();
    scene.dispose();
    engine.dispose();
  });
});
```

Open `tests.html`. You should see **698 passing tests**: 5 more.

## Step 5: The game

Everything now exists, and `main.js` joins it up. The changes, in the order they come in the file:

**The things the game keeps** are made at the top of the file, outside the scene: the records, the sound, and the flow of screens. The game no longer has a `started` flag: the world is running when `screenFlow.running` is true.

In `js/main.js`, **replace** line 17:

```js
let started = false; // the district is drawn behind the loading screen, but nothing moves until it has gone
```

with:

```js
// What the game keeps and what it says: the records (best times, the runner chosen, the settings), the sound, and which screen is up. The district is drawn behind
// the loading screen and then behind the title, but nothing moves until Play is pressed.
const records = new Records();
const sound = new Sound();
sound.setVolume(records.volume);
const screenFlow = new ScreenFlow();
```

The mouse speed is the one in the records:

In `js/main.js`, after line 38, add:

```js
  orbit.sensitivity = records.lookSpeed;
```

The trial starts with the best time of every visit (and not only this one), and the dust and the footsteps are made:

In `js/main.js`, after line 145, add:

```js
  trial.best = records.trialBest; // the best time of every visit, not only this one
  const dust = new Dust(scene);
  const steps = new FootstepClock();
```

**Moves make sounds.** When flow says a move began, the sound for it plays; a wall kick also kicks up dust:

In `js/main.js`, after line 183, add:

```js
      if (MOVE_SOUNDS[kind]) sound.play(MOVE_SOUNDS[kind]);
      if (kind === "kick") dust.burst(body.x, body.y + 0.9, body.z, { count: DUST.kick.count, size: DUST.kick.size, spread: 1.5 });
```

Tokens, the combo, checkpoints and the finish have their sounds, and a finish is checked against the records:

In `js/main.js`, **replace** lines 191 to 196:

```js
    }
    if (comboMilestone(chain, flow.chain)) hud.banner(`${flow.chain} in a row`);
    for (const event of trial.update(body, dt)) {
      if (event.kind === "start") hud.toast("Go!");
      if (event.kind === "checkpoint") hud.toast(`${trial.checkpoints[event.index].name} ${formatTime(event.time)}`);
      if (event.kind === "finish") hud.toast(`Finish ${formatTime(event.time)}: ${event.medal}`, 4);
```

with:

```js
      sound.play("token");
    }
    if (comboMilestone(chain, flow.chain)) {
      hud.banner(`${flow.chain} in a row`);
      sound.play("combo");
    }
    for (const event of trial.update(body, dt)) {
      if (event.kind === "start") hud.toast("Go!");
      if (event.kind === "checkpoint") {
        hud.toast(`${trial.checkpoints[event.index].name} ${formatTime(event.time)}`);
        sound.play("checkpoint");
      }
      if (event.kind === "finish") {
        const best = records.noteTrial(event.time);
        hud.toast(`Finish ${formatTime(event.time)}: ${event.medal}${best ? " (new best!)" : ""}`, 4);
        sound.play("finish");
      }
```

**What the screens call on.** `game` is the small set of things the screens need from inside the scene: the runner to use, a way to begin a run again, and what the run has come to. The look-around is changed so that letting go of the mouse (Esc) is a **pause**, and so is leaving the page. Keys other than `P` are the game's only while it is being played:

In `js/main.js`, **replace** lines 244 to 247:

```js
  // The keys. Arrow keys would scroll the page, so the ones the runner uses are taken for the game.
  const heldKeys = new Set();
  const look = new PointerLook(canvas, document, (locked) => document.body.classList.toggle("looking", locked));
  window.addEventListener("keydown", (event) => {
```

with:

```js
  // What the screens call on: take up the chosen runner, begin a run from the start, and what the run has come to.
  const game = {
    orbit,
    useRunner,
    restartRun: () => {
      restartTrial();
      collection.taken.clear();
    },
    summary: () => ({ score: flow.score, chain: flow.bestChain, tokens: collection.count }),
  };

  // The keys. Arrow keys would scroll the page, so the ones the runner uses are taken for the game.
  const heldKeys = new Set();
  const look = new PointerLook(canvas, document, (locked) => {
    document.body.classList.toggle("looking", locked);
    if (!locked && screenFlow.running) screenFlow.pause(); // Esc lets go of the mouse, and that is a pause
  });
  game.look = look;
  const pauseNow = () => screenFlow.pause() && look.unlock();
  window.addEventListener("blur", () => pauseNow()); // away from the page is a pause, too
  document.addEventListener("visibilitychange", () => document.hidden && pauseNow());
  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyP" && !event.repeat && !typesText(event)) pauseNow();
    if (!screenFlow.running) return; // the keys are the game's only while it is being played
```

**Each frame** the world gets time only while it is running, and landings and footsteps are heard:

In `js/main.js`, **replace** lines 280 to 282:

```js
    const dt = started ? Math.min(engine.getDeltaTime() / 1000, 0.05) : 0;
    const turned = look.take();
    if (started) orbit.look(turned.dx, turned.dy);
```

with:

```js
    const running = screenFlow.running;
    const dt = running ? Math.min(engine.getDeltaTime() / 1000, 0.05) : 0;
    const turned = look.take();
    if (running) orbit.look(turned.dx, turned.dy);
```

In `js/main.js`, **replace** lines 287 to 288:

```js
    body.update(started ? moveDirection(input, orbit.yaw) : null, input.sprint, dt, started && input.jump);
    if (started) updateGoals(before, dt);
```

with:

```js
    body.update(running ? moveDirection(input, orbit.yaw) : null, input.sprint, dt, running && input.jump);
    if (running) {
      updateGoals(before, dt);
      if (!before.grounded && body.grounded) {
        const landing = landingSound(body.impact);
        if (landing) sound.play(landing.name, landing.strength);
        dust.burst(body.x, body.y, body.z, dustFor(body.impact));
      }
      if (steps.update(dt, body.speed, body.grounded && !body.hang && !body.move)) sound.play("step", Math.min(1.2, Math.max(0.4, body.speed / 6)));
    }
```

**The developer panel** has a new section, with a read-out of the screen, the bests, and a button for every sound:

In `js/main.js`, after line 416, add:

```js
          title: "Screens",
          rows: [
            readout("screen", () => screenFlow.state),
            readout("best trial", () => (records.trialBest === null ? "none" : formatTime(records.trialBest))),
            readout("best score / chain", () => `${records.scoreBest} / ${records.chainBest}`),
            readout("runner chosen", () => records.runner),
            control("volume", () => sound.volume, (value) => { sound.setVolume(value); records.set("volume", value); }, 0, 1, 0.05),
            action("Pause", () => pauseNow()),
            action("Clear the best times", () => records.clearBests()),
            ...Object.keys(SOUNDS).map((name) => action(`Sound: ${name}`, () => { sound.unlock(); sound.play(name); })),
          ],
        },
        {
```

In `js/main.js`, **replace** line 458:

```js
    window.dev = { scene, body, world, sky, orbit, panel, look, shadows, flow, collection, trial, hud }; // for poking at from the console
```

with:

```js
    window.dev = { scene, body, world, sky, orbit, panel, look, shadows, flow, collection, trial, hud, records, sound, screenFlow, game }; // for poking at from the console
```

The scene hands the game back to the code that shows the title:

In `js/main.js`, **replace** line 464:

```js
  return { scene };
```

with:

```js
  return { scene, game };
```

In `js/main.js`, **replace** line 487:

```js
  .then(async ({ scene }) => {
```

with:

```js
  .then(async ({ scene, game }) => {
```

**And the end of loading is no longer the start of the game.** When the loading screen has gone, the title comes up, and Play is what begins:

In `js/main.js`, **delete** line 500:

```js
    started = true;
```

In `js/main.js`, after line 503, add:

```js

    // The title comes up, and the game waits there for Play.
    const finishRun = () => records.noteRun(game.summary());
    const screens = new Screens(document, {
      onRunner: (name) => records.set("runner", name),
      onPlay: async (name) => {
        screens.setStatus("Getting the runner ready...", true);
        sound.unlock(); // a touch of the page is what lets a browser make sound
        try {
          await game.useRunner(name);
        } catch (error) {
          console.error(error);
          screens.setStatus("The runner would not load. Try again.");
          return;
        }
        screens.setStatus("");
        sound.play("click");
        game.restartRun();
        screenFlow.play();
        game.look.lock();
      },
      onResume: () => {
        sound.play("click");
        screenFlow.resume();
        game.look.lock();
      },
      onRestart: () => {
        game.restartRun();
        screenFlow.resume();
        game.look.lock();
      },
      onQuit: () => {
        finishRun();
        screenFlow.quit();
      },
      onVolume: (value) => {
        sound.setVolume(value);
        records.set("volume", value);
      },
      onLookSpeed: (value) => {
        records.set("lookSpeed", value);
        game.orbit.sensitivity = value;
      },
    });
    screenFlow.onChange((state) => {
      if (state === "playing") screens.hide();
      if (state === "paused") screens.showPause(records);
      if (state === "title") screens.showTitle(records);
    });
    window.addEventListener("pagehide", finishRun);
    screenFlow.loaded();
    if (window.dev) window.dev.screens = screens;
```

### Try it

Open `index.html` (with `?dev` if you like). You should see:

- the loading bar, then the **title**: pick the female runner and press **Play**: the runner is loaded, and the game begins with the mouse taken
- run, jump and land from a height: **steps** while you run, a **thud** and a puff of **dust** on a hard landing, a **whoosh** on a vault, a **chime** for a token
- press **Esc**: the mouse is let go, the world **stops**, and the pause screen comes up with your sliders; **Resume** takes the mouse back
- finish the trial, close the page, and open it again: the title says your **best time**
- in the developer panel, **Screens** has a button for every sound: use them to tune the table

### Tests

Open `tests.html`. You should see **698 passing tests**: 0 more (none: the game is not what the tests are about, and everything they say about it is in the files above).

## Stretch goals

- **More to remember.** Keep which tokens have been taken between visits, and show them on the title.
- **A sound for each surface.** The plan knows roofs from roads: steps could differ.
- **Music.** A quiet loop, started from the same tap, that gets louder with the chain.
- **A settings screen** with keys that can be changed, kept in the records.

## What you've learned

- How to keep records that survive a refusing browser, nonsense, and old versions
- How to make a screen flow a state machine, and the screens a thing that is given what its buttons do
- How to make sound from oscillators and noise, why it begins in a tap, and how to test sound by rendering it
- How to pause properly: the world gets no time, the keys are not the game's, and the draw goes on
- How to draw dust from one particle system by asking for bursts

The next step makes the game playable on a phone: **touch controls**.
