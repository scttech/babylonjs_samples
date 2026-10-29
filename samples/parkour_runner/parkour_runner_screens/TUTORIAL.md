# Tutorial: Parkour Runner Screens -- Title, Pause and Game Over

This is the seventh tutorial in the Parkour Runner series, and the first of three that finish the game. The runner runs, dodges and scores, but the game just starts when the page loads and has no end beyond a message. In this step it gets a **front and back**: a **title screen** where you type your name and choose a color for the runner, a **pause**, and a **game over screen** with your score, a **leaderboard** of the best runs on this device, and a **High Score** banner for a new best. It also gets its look: the graffiti **font** of the logo. You write the code; this document tells you what to write and why.

By the end you'll have:

- A small **state machine** for what the game is doing: the title, a run, a pause, the end of a run
- A **title screen** with a name field, **five colors** for the runner (the runner is the preview), and a Play button
- A **pause**, which also happens by itself when you look away
- A **game over screen** with your score, the top ten, and the High Score picture when you beat your best
- A **leaderboard and a profile** saved in the browser with `localStorage`, written so the game still works when saving isn't allowed
- The game's **fonts**, in the HUD and on every screen
- Unit tests for all of it

**What you'll learn:** modelling a game as states with allowed changes, `localStorage` (and why every use of it is guarded), validating data you read back from somewhere you don't control, HTML overlays for menus (and why they suit text better than a 3D GUI), loading and waiting for web fonts, tinting a model by changing its materials, freezing time and animation for a pause, and keeping a text field from fighting with your game keys.

## Where you're starting

This folder is a copy of the finished Score sample, plus empty placeholder files for the new code and its tests:

```
parkour_runner_screens/
├── index.html, tests.html
├── css/
│   └── game.css            (placeholder -- Step 4)
├── js/
│   ├── game.js             (placeholder -- Step 1)
│   ├── colors.js           (placeholder -- Step 2)
│   ├── profile.js          (placeholder -- Step 3)
│   ├── leaderboard.js      (placeholder -- Step 3)
│   ├── screens.js          (placeholder -- Step 4)
│   ├── hud.js              (changes -- Step 4)
│   ├── main.js             (changes -- Step 5)
│   └── world.js, runner.js, models.js, camera.js, stream.js, pool.js, splash.js, score.js, obstacles.js, clips.js   (from the Score sample)
└── tests/
    ├── game / colors / profile / leaderboard / screens .tests.js   (placeholders)
    └── hud .tests.js grows, and the rest    (from the Score sample)
```

### The fonts and pictures

They are already in the shared `assets/` folder, so there is nothing to download:

| File | What it is |
|---|---|
| `assets/fonts/SedgwickAveDisplay-Regular.ttf` | A graffiti handwriting font, close to the logo's lettering. It is thin, so it's for big words and numbers |
| `assets/fonts/Bangers-Regular.ttf` | A chunkier comic-style font, for small text where Sedgwick would be hard to read |
| `assets/images/high_score_small.png` | The High Score banner, with the black background made transparent |
| `assets/images/parkour_runner_logo_small.png` | The logo, with its white background made transparent, for the title |

Both fonts are free under the SIL Open Font License; the licenses are in the same folder.

### You need a web server for this one

As before, the models can't be loaded from a page opened from a file. Run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/parkour_runner/parkour_runner_screens/` (the command prints the exact address), or use the *Live Server* extension in VS Code. (`tests.html` loads no models and works from a file.)

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Score sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**317**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step.

---

## Step 1: What the game is doing

Until now the game has had two states without saying so: waiting for the splash to go, and running. Now there are four, and they don't all allow every change. You can't pause a game that is over. You can't resume one that isn't paused. A small class keeps these rules in one place, as plain values, so they can be tested. Open the placeholder `js/game.js` and replace its contents with:

```js
// What the game is doing as a whole: showing the title, running, paused, or over. Only
// one is true at a time, and only some changes make sense (you can't pause a game
// that is over), so the rules are kept here, as plain values with no Babylon.js, where
// they are easy to test. See ../tests/game.tests.js.
const STATES = { title: "title", playing: "playing", paused: "paused", over: "over" };

class Game {
  constructor() {
    this.state = STATES.title;
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
```

Things to notice:

- **`STATES` is the list of what the game can be doing.** A string for each, so a `console.log` of the state says something readable, and they can be compared with `===`.
- **A state machine is a value, plus rules for changing it.** Here the value is `state`, and the rules are the methods you add next.
- The class is closed already, and starts on the title.

### 1a. Asking about it

Add these two getters **inside the class**, directly above its closing `}`:

```js
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
```

Things to notice:

- **`playing`** is for the things that only happen in a run: the moves, the score, the crash check.
- **`frozen`** is for time. Everything in the game moves by `dt` seconds, so a game that gives itself no `dt` stands still. The title and a pause are frozen. The end of a run is **not**: when the runner crashes, the state is `over` at once, but he still needs a second to fall over behind the game over screen.

### 1b. Changing it

Add these methods **inside the class**, directly above its closing `}`:

```js
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
```

Things to notice:

- **`_change(from, state)` is the one place a rule is checked.** Each method names the states it may be called from, and the change only happens if the game is in one of them. It says whether it changed, so the caller knows.
- **`start()` ignores the rules on purpose.** A new run can begin from the title, from the end of a run, from a pause, or as a restart in the middle of one, so it works from anywhere.
- **`togglePause()` is `pause() || resume()`.** Pausing only works in a run, resuming only in a pause, so at most one does anything. `||` stops at the first that says it changed.
- **`toTitle()` won't leave a run that is going.** You have to pause (or crash) first, so a stray key can't throw away a run.

### 1c. Tests

Replace the placeholder `tests/game.tests.js` with:

```js
QUnit.module("Game", () => {
  // A game that is in the given state.
  const gameIn = (state) => {
    const game = new Game();
    game.state = state;
    return game;
  };

  QUnit.test("starts on the title", (assert) => {
    const game = new Game();

    assert.strictEqual(game.state, STATES.title);
    assert.false(game.playing);
  });

  QUnit.test("start() begins a run", (assert) => {
    const game = new Game();

    assert.true(game.start());

    assert.strictEqual(game.state, STATES.playing);
    assert.true(game.playing);
  });

  QUnit.test("start() works from anywhere: the title, a pause, the end of a run, or a run that is going", (assert) => {
    for (const state of Object.values(STATES)) {
      const game = gameIn(state);

      game.start();

      assert.strictEqual(game.state, STATES.playing, state);
    }
  });

  QUnit.test("a run that is going can be paused, and resumed", (assert) => {
    const game = gameIn(STATES.playing);

    assert.true(game.pause());
    assert.strictEqual(game.state, STATES.paused);

    assert.true(game.resume());
    assert.strictEqual(game.state, STATES.playing);
  });

  QUnit.test("you can't pause the title or a finished run, or resume what isn't paused", (assert) => {
    for (const state of [STATES.title, STATES.over, STATES.paused]) {
      const game = gameIn(state);
      assert.false(game.pause(), `pause from ${state}`);
      assert.strictEqual(game.state, state);
    }
    for (const state of [STATES.title, STATES.over, STATES.playing]) {
      const game = gameIn(state);
      assert.false(game.resume(), `resume from ${state}`);
      assert.strictEqual(game.state, state);
    }
  });

  QUnit.test("togglePause() pauses a run that is going and resumes one that is paused", (assert) => {
    const game = gameIn(STATES.playing);

    game.togglePause();
    assert.strictEqual(game.state, STATES.paused);

    game.togglePause();
    assert.strictEqual(game.state, STATES.playing);
  });

  QUnit.test("togglePause() does nothing on the title or the game over screen", (assert) => {
    for (const state of [STATES.title, STATES.over]) {
      const game = gameIn(state);

      assert.false(game.togglePause());

      assert.strictEqual(game.state, state);
    }
  });

  QUnit.test("only a run that is going can end", (assert) => {
    const game = gameIn(STATES.playing);
    assert.true(game.end());
    assert.strictEqual(game.state, STATES.over);

    for (const state of [STATES.title, STATES.paused, STATES.over]) {
      const other = gameIn(state);
      assert.false(other.end(), `end from ${state}`);
      assert.strictEqual(other.state, state);
    }
  });

  QUnit.test("toTitle() goes back from a pause or from the end of a run", (assert) => {
    for (const state of [STATES.paused, STATES.over]) {
      const game = gameIn(state);

      assert.true(game.toTitle());

      assert.strictEqual(game.state, STATES.title, state);
    }
  });

  QUnit.test("toTitle() won't leave a run that is going: pause it first", (assert) => {
    const game = gameIn(STATES.playing);

    assert.false(game.toTitle());

    assert.strictEqual(game.state, STATES.playing);
  });

  QUnit.test("time is frozen on the title and while paused, and passes otherwise", (assert) => {
    assert.true(gameIn(STATES.title).frozen);
    assert.true(gameIn(STATES.paused).frozen);
    assert.false(gameIn(STATES.playing).frozen);
    assert.false(gameIn(STATES.over).frozen, "after a crash the runner can finish falling");
  });

  QUnit.test("only a run that is going is playing", (assert) => {
    for (const state of Object.values(STATES)) {
      assert.strictEqual(gameIn(state).playing, state === STATES.playing, state);
    }
  });
});
```

Add the script and its tests to `tests.html`: `game.js` after `runner.js`, and `game.tests.js` after `runner.tests.js`:

```html
  <script src="js/game.js"></script>
```
```html
  <script src="tests/game.tests.js"></script>
```

Reload `tests.html`. You should see **329 passing tests** (the 317, plus 12). Several loop over every state, so a state you add later is tested without a new test.

---

## Step 2: Colors for the runner

The mannequin is made from just two materials: **`M_Main`** for the body, and **`M_Joints`** for the joints (the orange and the purple). A color choice is two hex colors, one for each. Changing a material's `albedoColor` repaints every mesh that uses it, and costs nothing while the game runs. Open the placeholder `js/colors.js` and replace its contents with:

```js
// The colors the player can choose for the runner. The mannequin is made from two
// materials, a main one for the body and one for the joints, and a color is a pair of
// hex colors, one for each. Choosing a color only changes those two materials, so it
// costs nothing at run time. See ../tests/colors.tests.js.
const RUNNER_COLORS = [
  { id: "sunset", name: "Sunset", body: "#cc670b", joints: "#6722b5" }, // as the model comes
  { id: "ocean", name: "Ocean", body: "#1e7fd6", joints: "#f2c230" },
  { id: "neon", name: "Neon", body: "#2fd16a", joints: "#1f2a44" },
  { id: "crimson", name: "Crimson", body: "#d6342c", joints: "#26263a" },
  { id: "ghost", name: "Ghost", body: "#e8ecf2", joints: "#4b5563" },
];
const DEFAULT_COLOR = RUNNER_COLORS[0].id;

// The names of the model's two materials.
const BODY_MATERIAL = "M_Main";
const JOINTS_MATERIAL = "M_Joints";

// The color with this id. An id that isn't one of them (a saved choice that no longer
// exists, or nothing at all) gives the default, so there is always a color to use.
function colorById(id) {
  return RUNNER_COLORS.find((color) => color.id === id) || RUNNER_COLORS[0];
}

// Paints a character: finds its two materials among the meshes of `root` and sets
// their color. Anything else is left alone.
function tintRunner(root, color) {
  for (const mesh of root.getChildMeshes()) {
    const material = mesh.material;
    if (!material) continue;
    if (material.name === BODY_MATERIAL) material.albedoColor = BABYLON.Color3.FromHexString(color.body);
    else if (material.name === JOINTS_MATERIAL) material.albedoColor = BABYLON.Color3.FromHexString(color.joints);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RUNNER_COLORS, DEFAULT_COLOR, BODY_MATERIAL, JOINTS_MATERIAL, colorById, tintRunner };
} else {
  Object.assign(window, { RUNNER_COLORS, DEFAULT_COLOR, BODY_MATERIAL, JOINTS_MATERIAL, colorById, tintRunner });
}
```

Things to notice:

- **The first color is the model's own,** so the default changes nothing.
- **`colorById` always gives you a color.** A saved id that no longer exists, `undefined` or `null` all give the default. That matters in Step 3, where ids come back from storage and can't be trusted.
- **`tintRunner` finds the materials by name,** and leaves any other material alone, so it is safe on anything loaded from the character file.
- **`BABYLON.Color3.FromHexString`** makes a color from `"#cc670b"`. The tests stand in for it, as the HUD tests stand in for the GUI.

### 2a. Tests

Replace the placeholder `tests/colors.tests.js` with:

```js
QUnit.module("RUNNER_COLORS", () => {
  QUnit.test("there are a few to choose from, each with a name and two hex colors", (assert) => {
    assert.true(RUNNER_COLORS.length >= 3);
    for (const color of RUNNER_COLORS) {
      assert.true(color.name.length > 0, color.id);
      assert.true(/^#[0-9a-f]{6}$/.test(color.body), `${color.id} body`);
      assert.true(/^#[0-9a-f]{6}$/.test(color.joints), `${color.id} joints`);
    }
  });

  QUnit.test("every id is different, so a saved id means one color", (assert) => {
    assert.strictEqual(new Set(RUNNER_COLORS.map((c) => c.id)).size, RUNNER_COLORS.length);
  });

  QUnit.test("no two have the same look", (assert) => {
    const looks = RUNNER_COLORS.map((c) => c.body + c.joints);

    assert.strictEqual(new Set(looks).size, RUNNER_COLORS.length);
  });

  QUnit.test("the default is the first, and is the model's own colors", (assert) => {
    assert.strictEqual(DEFAULT_COLOR, RUNNER_COLORS[0].id);
    assert.strictEqual(RUNNER_COLORS[0].body, "#cc670b");
    assert.strictEqual(RUNNER_COLORS[0].joints, "#6722b5");
  });
});

QUnit.module("colorById", () => {
  QUnit.test("finds a color by its id", (assert) => {
    for (const color of RUNNER_COLORS) assert.strictEqual(colorById(color.id), color);
  });

  QUnit.test("an id that isn't one of them gives the default", (assert) => {
    assert.strictEqual(colorById("plaid"), RUNNER_COLORS[0]);
  });

  QUnit.test("so does no id at all", (assert) => {
    assert.strictEqual(colorById(undefined), RUNNER_COLORS[0]);
    assert.strictEqual(colorById(null), RUNNER_COLORS[0]);
    assert.strictEqual(colorById(""), RUNNER_COLORS[0]);
  });
});

// Painting needs `BABYLON.Color3.FromHexString`, so these tests stand one in for it
// instead of loading the real engine.
QUnit.module("tintRunner", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  hooks.beforeEach(() => {
    globalScope.BABYLON = { Color3: { FromHexString: (hex) => ({ hex }) } };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  // A character: a node whose meshes have the materials with these names.
  const characterWith = (...names) => {
    const meshes = names.map((name) => ({ material: name ? { name, albedoColor: null } : null }));
    return { getChildMeshes: () => meshes };
  };

  QUnit.test("paints the body material with the body color, and the joints with the joints color", (assert) => {
    const root = characterWith(BODY_MATERIAL, JOINTS_MATERIAL);
    const ocean = colorById("ocean");

    tintRunner(root, ocean);

    const [body, joints] = root.getChildMeshes();
    assert.deepEqual(body.material.albedoColor, { hex: ocean.body });
    assert.deepEqual(joints.material.albedoColor, { hex: ocean.joints });
  });

  QUnit.test("leaves materials it doesn't know alone", (assert) => {
    const root = {
      meshes: [{ material: { name: "Something_Else", albedoColor: "untouched" } }],
      getChildMeshes() {
        return this.meshes;
      },
    };

    tintRunner(root, RUNNER_COLORS[1]);

    assert.strictEqual(root.meshes[0].material.albedoColor, "untouched");
  });

  QUnit.test("copes with a mesh that has no material", (assert) => {
    const root = characterWith(null, BODY_MATERIAL);
    const ocean = colorById("ocean");

    tintRunner(root, ocean);

    assert.deepEqual(root.getChildMeshes()[1].material.albedoColor, { hex: ocean.body });
  });

  QUnit.test("can be done again with another color", (assert) => {
    const meshes = [{ material: { name: BODY_MATERIAL, albedoColor: null } }];
    const root = { getChildMeshes: () => meshes };

    tintRunner(root, colorById("ocean"));
    tintRunner(root, colorById("neon"));

    assert.deepEqual(meshes[0].material.albedoColor, { hex: colorById("neon").body });
  });
});
```

Add the script and its tests to `tests.html`, after `hud.js` and `hud.tests.js`:

```html
  <script src="js/colors.js"></script>
```
```html
  <script src="tests/colors.tests.js"></script>
```

Reload `tests.html`: **11 more** tests (**340** in all).

---

## Step 3: Who is playing, and the best scores

Two things are remembered between visits: **who is playing** (a name and a color) and **the best scores**. Both go in `localStorage`, a small store of text that the browser keeps for the page. It is easy to use and easy to get wrong, because:

- it may not exist, or may refuse to save (a private window, blocked site data, a full disk), and in some browsers even *asking* for it throws an error;
- it only holds text, and what comes back is whatever was last written, by anyone: an older version of your game, or the person at the console. You can't trust its shape.

So everything here is written to **work without storage**, and to **check what it reads**.

### 3a. The profile

Open the placeholder `js/profile.js` and replace its contents with:

```js
// Who is playing: a name and a runner color, remembered in the browser between visits.
// It is kept with `localStorage`, which can be missing or refuse to save (a private
// window, blocked site data), so every use of it is guarded and the game works without
// it. The same storage is used by the leaderboard. See ../tests/profile.tests.js.
const PROFILE_KEY = "parkourRunner.profile";
const NAME_MAX = 12; // the longest name, in characters
const DEFAULT_NAME = "Runner";

// The browser's storage, or null if there isn't one to use.
function browserStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch (error) {
    return null;
  }
}

// Reads a value that was saved as JSON. Anything missing, unreadable or not JSON is null.
function readJson(storage, key) {
  try {
    const text = storage && storage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch (error) {
    return null;
  }
}

// Saves a value as JSON. Says whether it worked.
function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

// Makes a name fit to show: spaces trimmed and squeezed to one, no longer than NAME_MAX,
// and DEFAULT_NAME if nothing is left. (Names are only ever shown as text, never as HTML.)
function cleanName(name) {
  const text = String(name == null ? "" : name).replace(/\s+/g, " ").trim().slice(0, NAME_MAX).trim();
  return text || DEFAULT_NAME;
}

class Profile {
  constructor({ storage = browserStorage(), key = PROFILE_KEY } = {}) {
    this.storage = storage;
    this.key = key;
    this.name = DEFAULT_NAME;
    this.color = DEFAULT_COLOR;
    this.load();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PROFILE_KEY, NAME_MAX, DEFAULT_NAME, browserStorage, readJson, writeJson, cleanName, Profile };
} else {
  Object.assign(window, { PROFILE_KEY, NAME_MAX, DEFAULT_NAME, browserStorage, readJson, writeJson, cleanName, Profile });
}
```

Things to notice:

- **`browserStorage` never throws.** It returns `localStorage`, or `null` if it isn't there or asking for it fails. Everything else accepts `null` as "no storage".
- **`readJson` and `writeJson` are the only places that touch storage.** Both catch every error, so a broken store is the same as an empty one, and neither takes the game down.
- **`cleanName`** makes any text fit to show: spaces squeezed, at most `NAME_MAX` characters, and a default if nothing is left. Note the second `trim()` after `slice`: cutting a name at 12 characters can leave a space on the end.
- **The storage is a parameter** (`storage = browserStorage()`), so tests give the class a stand-in and never touch the real one.
- The class is closed already. Its constructor calls `load`, which you add next.

Add these methods **inside the class**, directly above its closing `}`:

```js
  // Takes the saved name and color, if there are any, and if they are usable.
  load() {
    const saved = readJson(this.storage, this.key);
    if (!saved || typeof saved !== "object") return;
    this.name = cleanName(saved.name);
    this.color = colorById(saved.color).id;
  }

  // Remembers the name and color. Says whether it could.
  save() {
    return writeJson(this.storage, this.key, { name: this.name, color: this.color });
  }
```

Things to notice:

- **`load` doesn't trust what it reads.** The name is cleaned and the color goes through `colorById(...).id`, so a hand-edited or out-of-date save can't put nonsense in the game. And `typeof saved !== "object"` turns `42` or `"text"` into "nothing saved".
- **`save` returns whether it worked,** which the game can ignore, and the tests don't.

Replace the placeholder `tests/profile.tests.js` with:

```js
// A stand-in for localStorage: a Map with the two methods the game uses.
const profileMemory = () => {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
};

// One that refuses to save, as a private window can.
const profileBroken = () => ({
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("full");
  },
});

QUnit.module("cleanName", () => {
  QUnit.test("keeps an ordinary name as it is", (assert) => {
    assert.strictEqual(cleanName("Ana"), "Ana");
  });

  QUnit.test("trims the spaces round it and squeezes the ones inside", (assert) => {
    assert.strictEqual(cleanName("   Ana    Maria  "), "Ana Maria");
  });

  QUnit.test("cuts a long name to NAME_MAX characters, with no space left on the end", (assert) => {
    assert.strictEqual(cleanName("abcdefghijklmnopqrstuvwxyz"), "abcdefghijkl");
    assert.strictEqual(cleanName("abcdefghijk mnop"), "abcdefghijk");
  });

  QUnit.test("an empty name, spaces, nothing at all, or something that isn't text, is the default name", (assert) => {
    for (const name of ["", "     ", undefined, null]) assert.strictEqual(cleanName(name), DEFAULT_NAME);
  });

  QUnit.test("numbers are turned into text", (assert) => {
    assert.strictEqual(cleanName(42), "42");
  });

  QUnit.test("markup is only text: it is kept as it is, for the page to show as text", (assert) => {
    assert.strictEqual(cleanName("<b>hi</b>"), "<b>hi</b>");
  });
});

QUnit.module("readJson and writeJson", () => {
  QUnit.test("a value that is written can be read back", (assert) => {
    const storage = profileMemory();

    assert.true(writeJson(storage, "k", { a: [1, 2] }));

    assert.deepEqual(readJson(storage, "k"), { a: [1, 2] });
  });

  QUnit.test("reading what was never saved gives null", (assert) => {
    assert.strictEqual(readJson(profileMemory(), "nothing"), null);
  });

  QUnit.test("reading something that isn't JSON gives null, not an error", (assert) => {
    const storage = profileMemory();
    storage.setItem("k", "{oops");

    assert.strictEqual(readJson(storage, "k"), null);
  });

  QUnit.test("with no storage at all, reading gives null and writing says it failed", (assert) => {
    assert.strictEqual(readJson(null, "k"), null);
    assert.false(writeJson(null, "k", 1));
  });

  QUnit.test("storage that throws is the same as none", (assert) => {
    const storage = profileBroken();

    assert.strictEqual(readJson(storage, "k"), null);
    assert.false(writeJson(storage, "k", 1));
  });
});

QUnit.module("Profile", () => {
  QUnit.test("starts as the default name and color", (assert) => {
    const profile = new Profile({ storage: profileMemory() });

    assert.strictEqual(profile.name, DEFAULT_NAME);
    assert.strictEqual(profile.color, DEFAULT_COLOR);
  });

  QUnit.test("a saved profile comes back in a new one", (assert) => {
    const storage = profileMemory();
    const first = new Profile({ storage });
    first.name = "Ana";
    first.color = "ocean";

    assert.true(first.save());
    const second = new Profile({ storage });

    assert.strictEqual(second.name, "Ana");
    assert.strictEqual(second.color, "ocean");
  });

  QUnit.test("uses its own key, so it doesn't mix with other saves", (assert) => {
    const storage = profileMemory();
    new Profile({ storage }).save();

    assert.true(storage.data.has(PROFILE_KEY));
    assert.strictEqual(storage.data.size, 1);
  });

  QUnit.test("a saved color that no longer exists becomes the default", (assert) => {
    const storage = profileMemory();
    storage.setItem(PROFILE_KEY, JSON.stringify({ name: "Ana", color: "plaid" }));

    const profile = new Profile({ storage });

    assert.strictEqual(profile.color, DEFAULT_COLOR);
    assert.strictEqual(profile.name, "Ana");
  });

  QUnit.test("a saved name is cleaned, in case the save was edited", (assert) => {
    const storage = profileMemory();
    storage.setItem(PROFILE_KEY, JSON.stringify({ name: "   a very long name indeed   ", color: "neon" }));

    assert.strictEqual(new Profile({ storage }).name, "a very long");
  });

  QUnit.test("a damaged save is ignored", (assert) => {
    for (const text of ["{oops", "42", "null", "[1,2]", '"text"']) {
      const storage = profileMemory();
      storage.setItem(PROFILE_KEY, text);

      const profile = new Profile({ storage });

      assert.strictEqual(profile.name, DEFAULT_NAME, text);
      assert.strictEqual(profile.color, DEFAULT_COLOR, text);
    }
  });

  QUnit.test("works without storage: it just can't remember", (assert) => {
    const profile = new Profile({ storage: null });
    profile.name = "Ana";

    assert.false(profile.save());
    assert.strictEqual(profile.name, "Ana");
  });

  QUnit.test("storage that throws doesn't stop the game", (assert) => {
    const profile = new Profile({ storage: profileBroken() });

    assert.strictEqual(profile.name, DEFAULT_NAME);
    assert.false(profile.save());
  });
});
```

Add `js/profile.js` after `colors.js`, and `tests/profile.tests.js` after `colors.tests.js`, in `tests.html`:

```html
  <script src="js/profile.js"></script>
```
```html
  <script src="tests/profile.tests.js"></script>
```

Reload `tests.html`: **19 more** tests (**359** in all). The tests use two stand-ins for storage: one that remembers (a `Map` with `getItem` and `setItem`), and one that throws, as a blocked browser does.

### 3b. The leaderboard

Open the placeholder `js/leaderboard.js` and replace its contents with:

```js
// The best scores on this device: a name and a score each, the best LEADERBOARD_SIZE,
// highest first, kept in the browser. It is local: it only knows about the scores
// set in this browser. See ../tests/leaderboard.tests.js.
const LEADERBOARD_KEY = "parkourRunner.leaderboard";
const LEADERBOARD_SIZE = 10;

class Leaderboard {
  constructor({ storage = browserStorage(), key = LEADERBOARD_KEY } = {}) {
    this.storage = storage;
    this.key = key;
    this.entries = []; // { name, score }, best first
    this.load();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LEADERBOARD_KEY, LEADERBOARD_SIZE, Leaderboard };
} else {
  Object.assign(window, { LEADERBOARD_KEY, LEADERBOARD_SIZE, Leaderboard });
}
```

Things to notice:

- **It is local.** It knows the scores set in *this browser*. A leaderboard shared by everyone needs a server to keep it, and a way to stop people posting scores they didn't earn. That's a challenge at the end.
- It reuses `browserStorage`, `readJson` and `writeJson` from `profile.js`, so `profile.js` must be loaded first.

Add these methods **inside the class**, directly above its closing `}`:

```js
  // Takes what was saved. Anything in it that isn't a name with a score is dropped, so a
  // damaged or hand-edited save can't break the game, and what is kept is put in order.
  load() {
    const saved = readJson(this.storage, this.key);
    const list = Array.isArray(saved) ? saved : [];
    this.entries = list
      .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.score) && entry.score > 0)
      .map((entry) => ({ name: cleanName(entry.name), score: Math.floor(entry.score) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, LEADERBOARD_SIZE);
  }

  // Remembers the entries. Says whether it could.
  save() {
    return writeJson(this.storage, this.key, this.entries);
  }

  // The best score so far, or 0 if there are none.
  get best() {
    return this.entries.length ? this.entries[0].score : 0;
  }

  // Whether `score` would get on the board: it must be more than nothing, and either there
  // is room or it beats the lowest.
  qualifies(score) {
    if (!(score > 0)) return false;
    return this.entries.length < LEADERBOARD_SIZE || score > this.entries[this.entries.length - 1].score;
  }

  // Whether `score` beats every score on the board. The first score is always the best.
  isBest(score) {
    return score > 0 && score > this.best;
  }

  // Adds a score, if it qualifies, and saves. Returns where it came, 1 for first, or 0 if it
  // didn't make the board. A score that ties another goes below it: first come, first served.
  add(name, score) {
    const points = Math.floor(score);
    if (!this.qualifies(points)) return 0;
    let rank = this.entries.findIndex((entry) => entry.score < points);
    if (rank === -1) rank = this.entries.length;
    this.entries.splice(rank, 0, { name: cleanName(name), score: points });
    this.entries.length = Math.min(this.entries.length, LEADERBOARD_SIZE);
    this.save();
    return rank + 1;
  }

  // Forgets every score.
  clear() {
    this.entries = [];
    this.save();
  }
```

Things to notice:

- **`load` is a filter.** It keeps only entries that are a text name with a positive number for a score, rounds the score down, cleans the name, puts them in order and cuts them to ten. A save with `null`, a missing score or a negative one is not an error: those entries just aren't there.
- **`qualifies` and `isBest` are separate questions.** A score can make the top ten without being the best, and the game over screen needs both: the banner is for the best, the highlighted row is for any place.
- **`isBest` is asked *before* `add`.** After the score is added it is the best, so the question would always say yes. The order matters in Step 5.
- **A tie goes *below* the score it ties.** `findIndex` looks for the first entry that is strictly lower, so the new score goes in after any equal ones: first come, first served. Having to *beat* the lowest score to get on a full board is the same rule.
- **`add` returns the place,** 1 for first, or 0 if it didn't get on. The game over screen uses it to highlight the row.

Replace the placeholder `tests/leaderboard.tests.js` with:

```js
// A stand-in for localStorage: a Map with the two methods the game uses.
const boardMemory = () => {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
};

// One that refuses to save, as a private window can.
const boardBroken = () => ({
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("full");
  },
});

QUnit.module("Leaderboard", () => {
  // A leaderboard on its own storage, so each test starts with nothing.
  const makeBoard = (storage = boardMemory()) => new Leaderboard({ storage });

  QUnit.test("starts empty, with a best of 0", (assert) => {
    const board = makeBoard();

    assert.deepEqual(board.entries, []);
    assert.strictEqual(board.best, 0);
  });

  QUnit.test("add() puts a score on the board and returns its place, 1 for first", (assert) => {
    const board = makeBoard();

    assert.strictEqual(board.add("Ana", 500), 1);

    assert.deepEqual(board.entries, [{ name: "Ana", score: 500 }]);
  });

  QUnit.test("the best score is first", (assert) => {
    const board = makeBoard();
    board.add("Ana", 500);
    board.add("Ben", 900);
    board.add("Cy", 700);

    assert.deepEqual(board.entries.map((e) => e.name), ["Ben", "Cy", "Ana"]);
    assert.strictEqual(board.best, 900);
  });

  QUnit.test("add() says where each score came", (assert) => {
    const board = makeBoard();
    board.add("Ana", 500);
    board.add("Ben", 900);

    assert.strictEqual(board.add("Cy", 700), 2);
    assert.strictEqual(board.add("Di", 100), 4);
  });

  QUnit.test("a score that ties another goes below it: first come, first served", (assert) => {
    const board = makeBoard();
    board.add("Ana", 500);

    assert.strictEqual(board.add("Ben", 500), 2);

    assert.deepEqual(board.entries.map((e) => e.name), ["Ana", "Ben"]);
  });

  QUnit.test("keeps only the best LEADERBOARD_SIZE", (assert) => {
    const board = makeBoard();
    for (let i = 1; i <= LEADERBOARD_SIZE + 5; i++) board.add("P" + i, i * 10);

    assert.strictEqual(board.entries.length, LEADERBOARD_SIZE);
    assert.strictEqual(board.entries[0].score, (LEADERBOARD_SIZE + 5) * 10);
    assert.strictEqual(board.entries[LEADERBOARD_SIZE - 1].score, 60);
  });

  QUnit.test("a score too low for a full board doesn't get on, and add() returns 0", (assert) => {
    const board = makeBoard();
    for (let i = 1; i <= LEADERBOARD_SIZE; i++) board.add("P" + i, i * 100);

    assert.strictEqual(board.add("Low", 50), 0);
    assert.strictEqual(board.add("Tie", 100), 0, "a tie with the lowest doesn't push it off");

    assert.false(board.entries.some((e) => e.name === "Low" || e.name === "Tie"));
  });

  QUnit.test("a score of nothing never gets on, even on an empty board", (assert) => {
    const board = makeBoard();

    assert.strictEqual(board.add("Ana", 0), 0);
    assert.strictEqual(board.add("Ana", -5), 0);
    assert.strictEqual(board.add("Ana", NaN), 0);

    assert.deepEqual(board.entries, []);
  });

  QUnit.test("scores are whole numbers", (assert) => {
    const board = makeBoard();

    board.add("Ana", 123.9);

    assert.strictEqual(board.entries[0].score, 123);
  });

  QUnit.test("names are cleaned", (assert) => {
    const board = makeBoard();

    board.add("   ", 100);
    board.add("a very long name indeed", 90);

    assert.deepEqual(board.entries.map((e) => e.name), [DEFAULT_NAME, "a very long"]);
  });

  QUnit.test("qualifies() says whether a score would get on", (assert) => {
    const board = makeBoard();
    assert.true(board.qualifies(1));
    assert.false(board.qualifies(0));

    for (let i = 1; i <= LEADERBOARD_SIZE; i++) board.add("P" + i, i * 100);
    assert.true(board.qualifies(101));
    assert.false(board.qualifies(100));
  });

  QUnit.test("isBest() is true only for a score above every score on the board", (assert) => {
    const board = makeBoard();
    assert.true(board.isBest(1), "the first score is the best");
    assert.false(board.isBest(0));

    board.add("Ana", 500);
    assert.true(board.isBest(501));
    assert.false(board.isBest(500));
    assert.false(board.isBest(300));
  });

  QUnit.test("what is added is saved, and a new leaderboard on the same storage has it", (assert) => {
    const storage = boardMemory();
    makeBoard(storage).add("Ana", 500);

    const again = makeBoard(storage);

    assert.deepEqual(again.entries, [{ name: "Ana", score: 500 }]);
  });

  QUnit.test("uses its own key", (assert) => {
    const storage = boardMemory();

    makeBoard(storage).add("Ana", 500);

    assert.deepEqual([...storage.data.keys()], [LEADERBOARD_KEY]);
  });

  QUnit.test("a damaged save is ignored", (assert) => {
    for (const text of ["{oops", "42", "null", '{"a":1}']) {
      const storage = boardMemory();
      storage.setItem(LEADERBOARD_KEY, text);

      assert.deepEqual(makeBoard(storage).entries, [], text);
    }
  });

  QUnit.test("entries in a save that aren't a name with a score are dropped, and the rest are put in order", (assert) => {
    const storage = boardMemory();
    storage.setItem(
      LEADERBOARD_KEY,
      JSON.stringify([{ name: "Low", score: 10 }, null, { name: 5, score: 99 }, { name: "NoScore" }, { name: "Neg", score: -4 }, { name: "High", score: 900.7 }, "text"])
    );

    assert.deepEqual(makeBoard(storage).entries, [
      { name: "High", score: 900 },
      { name: "Low", score: 10 },
    ]);
  });

  QUnit.test("a save with too many entries is cut to the best LEADERBOARD_SIZE", (assert) => {
    const storage = boardMemory();
    const many = Array.from({ length: LEADERBOARD_SIZE + 4 }, (_, i) => ({ name: "P" + i, score: i + 1 }));
    storage.setItem(LEADERBOARD_KEY, JSON.stringify(many));

    const board = makeBoard(storage);

    assert.strictEqual(board.entries.length, LEADERBOARD_SIZE);
    assert.strictEqual(board.best, LEADERBOARD_SIZE + 4);
  });

  QUnit.test("works without storage, for as long as the page is open", (assert) => {
    const board = new Leaderboard({ storage: null });

    assert.strictEqual(board.add("Ana", 500), 1);

    assert.strictEqual(board.best, 500);
  });

  QUnit.test("storage that throws doesn't stop a score being added", (assert) => {
    const board = new Leaderboard({ storage: boardBroken() });

    assert.strictEqual(board.add("Ana", 500), 1);
    assert.false(board.save());
  });

  QUnit.test("clear() forgets every score, and saves that", (assert) => {
    const storage = boardMemory();
    const board = makeBoard(storage);
    board.add("Ana", 500);

    board.clear();

    assert.deepEqual(board.entries, []);
    assert.deepEqual(makeBoard(storage).entries, []);
  });
});
```

Add `js/leaderboard.js` after `profile.js`, and `tests/leaderboard.tests.js` after `profile.tests.js`, in `tests.html`:

```html
  <script src="js/leaderboard.js"></script>
```
```html
  <script src="tests/leaderboard.tests.js"></script>
```

Reload `tests.html`: **20 more** tests (**379** in all).

---

## Step 4: The screens, and the look

The title, the pause and the game over are **plain HTML** laid over the canvas, like the splash screen, and not Babylon.js GUI like the score. A GUI draws into a texture and is good for things that change every frame in the scene. A menu is text, buttons and a text field, which the page already does well: you get a real `<input>` with a keyboard, focus and paste for free, buttons with hover and click, and layout with CSS.

### 4a. The HUD gets the fonts

The score is drawn by Babylon.js GUI, which uses whatever font name you give it. Open `js/hud.js`. Add the two font names above `HUD_COLOR`:

```js
// The game's two fonts, loaded in index.html. Sedgwick Ave Display is the graffiti
// lettering of the logo: good for big words and numbers, but thin, so it is not for small
// text. Bangers is its chunkier, more readable partner for everything small.
const FONT_TITLE = "Sedgwick Ave Display";
const FONT_SMALL = "Bangers";
```

Replace the constructor with this one, which adds two things to remember. The HUD can now be hidden (the title has no use for the score), and it keeps the last score it drew so it can show it again:

```js
  constructor({ ui = null } = {}) {
    this.ui = null;
    this.scoreLabel = null;
    this.distanceLabel = null;
    this.coinsLabel = null;
    this.comboLabel = null;
    this.visible = true; // whether the labels are on show at all
    this.shown = { total: 0, distance: 0, coins: 0, combo: 0, multiplier: 1 }; // the last score drawn
    if (ui) this.attachTo(ui);
  }
```

In `attachTo`, replace the four labels, and the `update` that ends the method, with:

```js
    // The top-left corner holds three lines. The page's back button sits on top of the
    // canvas from y = 12 to about y = 46, so they start below it.
    this.scoreLabel = this._label({ top: "56px", fontSize: 38, font: FONT_TITLE });
    this.distanceLabel = this._label({ top: "108px", fontSize: 24, font: FONT_SMALL });
    this.coinsLabel = this._label({ top: "138px", fontSize: 24, font: FONT_SMALL });

    // The combo is in the middle, near the top, so it is hard to miss.
    this.comboLabel = this._label({ top: "56px", fontSize: 46, font: FONT_TITLE, centered: true });
    this.comboLabel.isVisible = false;

    this.update(this.shown);
```

Replace `_label` so it takes a font, and `update` so it respects `visible`, and add `setVisible` below it:

```js
  // One piece of text, set up the way they all are, in the given font. `centered` puts it
  // in the middle of the screen's width instead of the left edge.
  _label({ top, fontSize, font, centered = false }) {
    const label = new BABYLON.GUI.TextBlock();
    label.color = HUD_COLOR;
    label.fontFamily = font;
    label.fontSize = fontSize;
    label.outlineWidth = 4;
    label.outlineColor = HUD_OUTLINE;
    label.top = top;
    label.height = fontSize + 12 + "px";
    label.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    if (!centered) {
      label.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      label.paddingLeft = "20px";
    }
    // These labels span the width of the screen, so don't let them swallow pointer
    // events meant for the canvas underneath.
    label.isHitTestVisible = false;
    this.ui.addControl(label);
    return label;
  }

  // Shows what a Score says. The combo is only on screen while there is one.
  update(score) {
    this.shown = score;
    if (!this.scoreLabel) return;
    this.scoreLabel.text = `Score ${score.total}`;
    this.distanceLabel.text = `${Math.floor(score.distance)} m`;
    this.coinsLabel.text = `Coins ${score.coins}`;
    this.comboLabel.text = `COMBO ${score.combo}  x${score.multiplier}`;
    for (const label of [this.scoreLabel, this.distanceLabel, this.coinsLabel]) label.isVisible = this.visible;
    this.comboLabel.isVisible = this.visible && score.combo > 0;
  }

  // Shows or hides all the text, for a screen that has no use for it (the title).
  setVisible(visible) {
    this.visible = visible;
    this.update(this.shown);
  }
```

and update the export block at the bottom, which now adds the two font names:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FONT_TITLE, FONT_SMALL, Hud };
} else {
  Object.assign(window, { FONT_TITLE, FONT_SMALL, Hud });
}
```

Things to notice:

- **Big and small text use different fonts.** The score and the combo are big and short, so the thin graffiti font works. The distance and coins are small, where it would be hard to read, so they use the chunkier one. The sizes went up a little, since the fonts are narrower than the system one.
- **`isVisible` is set from `this.visible` on every update.** If the HUD is hidden and the game updates it (it does, every frame), the labels stay hidden, and the combo can't pop up on the title.

In `tests/hud.tests.js`, add these five tests to the `Hud` module, directly above *"none of the labels intercept pointer events"*:

```js
  QUnit.test("the score and the combo are in the graffiti font, and the small lines in the plainer one", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.strictEqual(hud.scoreLabel.fontFamily, FONT_TITLE);
    assert.strictEqual(hud.comboLabel.fontFamily, FONT_TITLE);
    assert.strictEqual(hud.distanceLabel.fontFamily, FONT_SMALL);
    assert.strictEqual(hud.coinsLabel.fontFamily, FONT_SMALL);
  });

  QUnit.test("the two fonts are different, and named as index.html loads them", (assert) => {
    assert.notStrictEqual(FONT_TITLE, FONT_SMALL);
    assert.strictEqual(FONT_TITLE, "Sedgwick Ave Display");
    assert.strictEqual(FONT_SMALL, "Bangers");
  });

  QUnit.test("setVisible(false) hides every label, and setVisible(true) brings them back", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    hud.update(scoreOf({ combo: 4, multiplier: 2 }));

    hud.setVisible(false);
    for (const label of [hud.scoreLabel, hud.distanceLabel, hud.coinsLabel, hud.comboLabel]) assert.false(label.isVisible);

    hud.setVisible(true);
    for (const label of [hud.scoreLabel, hud.distanceLabel, hud.coinsLabel, hud.comboLabel]) assert.true(label.isVisible);
  });

  QUnit.test("while hidden, an update changes the text but shows nothing, not even the combo", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    hud.setVisible(false);

    hud.update(scoreOf({ total: 77, combo: 3, multiplier: 2 }));

    assert.strictEqual(hud.scoreLabel.text, "Score 77");
    assert.false(hud.scoreLabel.isVisible);
    assert.false(hud.comboLabel.isVisible);
  });

  QUnit.test("setVisible() before there is anything to draw on does nothing, and the labels follow it once there is", (assert) => {
    const hud = new Hud();

    hud.setVisible(false);
    hud.attachTo(new FakeUi());

    assert.false(hud.scoreLabel.isVisible);
  });
```

Reload `tests.html`: **5 more** tests (**384** in all).

### 4b. The style gets its own file

The page's `<style>` block is already a lot of CSS (the splash and the message), and this step adds a lot more: the fonts and every screen. Move it out to a file of its own. The placeholder `css/game.css` is waiting. Cut everything between `<style>` and `</style>` in `index.html`, and paste it into `css/game.css`. Then replace the whole `<style>...</style>` block in `index.html` with a link to it, directly below the line that links `sample.css`:

```html
  <link rel="stylesheet" href="css/game.css">
```

Reload the page. It should look exactly as it did, which is the check that nothing was lost.

Things to notice:

- **The order of the `<link>` tags matters.** When two rules are equally specific, the later one wins. `game.css` comes after `sample.css` so the game can override the shared rules, as it does for the back button below.
- **A `url(...)` inside a CSS file is relative to that file,** not to the page. That is why the font paths in the next step start with `../../` (out of `css/`, out of the sample folder, then into `assets/`).
- **A separate file is cached and edited on its own,** and `index.html` goes back to being about the page: what is on it, and which scripts it loads.

### 4c. The fonts, and a few shared colors

At the top of `css/game.css`, above the `.hint a` rule, add:

```css
/* The game's two fonts, from the files in assets/fonts. Sedgwick Ave Display is the
   graffiti lettering of the logo, for big words. It is thin, so Bangers, a chunkier
   font, does the small text. */
@font-face {
  font-family: "Sedgwick Ave Display";
  src: url("../../assets/fonts/SedgwickAveDisplay-Regular.ttf") format("truetype");
  font-display: swap;
}
@font-face {
  font-family: "Bangers";
  src: url("../../assets/fonts/Bangers-Regular.ttf") format("truetype");
  font-display: swap;
}
:root {
  --title-font: "Sedgwick Ave Display", "Bangers", cursive;
  --small-font: "Bangers", system-ui, sans-serif;
  --ink: #050508;
  --yellow: #ffd23a;
  --orange: #ff8a1d;
  --cyan: #29d3ff;
}
```

Things to notice:

- **`@font-face` names a font and says where its file is.** The name is what CSS and the HUD use afterwards. `font-display: swap` shows the text at once in a stand-in font and swaps when the file arrives, so a slow connection doesn't leave blank space.
- **The paths are relative to the CSS file.** `css/game.css` is two folders below `assets/`, so the fonts are at `../../assets/fonts/`.
- **The variables name the two roles,** `--title-font` and `--small-font`, and the game's few colors. The title font lists Bangers after it, so if Sedgwick can't load, the big words are in the other font and not a plain one.

### 4d. The look of the screens

Remove the rules for `#message` from `css/game.css` (the crash message is replaced by the game over screen), and add these at the **end** of the file:

```css
/* The screens over the picture: the title, the pause and the game over. */
/* The screens cover the whole page, so the back button and the hint (and its Run tests
   link) are lifted above them, or they couldn't be clicked while a screen is up. The
   splash, which should cover everything while the game loads, is higher still. */
.back-button,
.hint {
  z-index: 26;
}
.screen {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 16px 16px;
  overflow-y: auto;
  color: #fff;
  font-family: var(--small-font);
  font-size: 22px;
  letter-spacing: 0.04em;
  transition: opacity 0.25s ease, visibility 0.25s;
}
.screen.hidden {
  opacity: 0;
  visibility: hidden;
}
.screen h2 {
  margin: 0;
  font: 400 64px/1 var(--title-font);
  color: var(--yellow);
  -webkit-text-stroke: 6px var(--ink);
  paint-order: stroke fill;
  text-shadow: 0 4px 12px #000;
}
.screen p {
  margin: 0;
  text-shadow: 0 2px 6px #000;
}
.screen .keys {
  font-size: 18px;
  opacity: 0.9;
}
#pause {
  justify-content: center;
  padding-top: 16px;
  background: rgba(5, 8, 20, 0.45);
}
#over {
  background: rgba(5, 8, 20, 0.8);
}
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px 16px;
}
.panel {
  padding: 12px 18px;
  background: rgba(5, 5, 8, 0.72);
  border-radius: 14px;
}

/* The title: the logo, then the name, the color and Play. The logo is a PNG with its
   white background taken off, and a shadow lifts it off the street. */
#title .logo {
  max-width: min(60vw, 320px);
  max-height: 26vh;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.55));
}
#name {
  width: 11ch;
  padding: 6px 10px;
  border: 3px solid var(--ink);
  border-radius: 8px;
  font: 24px var(--small-font);
  letter-spacing: 0.04em;
}
.swatch {
  width: 34px;
  height: 34px;
  padding: 0;
  border: 3px solid var(--ink);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s ease;
}
.swatch.selected {
  border-color: #fff;
  box-shadow: 0 0 0 3px var(--yellow);
  transform: scale(1.12);
}
#swatches {
  display: flex;
  gap: 10px;
}
button.big,
button.quiet {
  padding: 8px 24px;
  border: 3px solid var(--ink);
  border-radius: 10px;
  font: 26px var(--small-font);
  letter-spacing: 0.06em;
  cursor: pointer;
}
button.big {
  background: linear-gradient(var(--yellow), var(--orange));
  color: var(--ink);
}
button.quiet {
  background: rgba(5, 5, 8, 0.7);
  color: #fff;
  border-color: var(--cyan);
}
button:hover {
  filter: brightness(1.15);
}

/* The game over: a picture for a new best, the score, and the leaderboard. */
#high-score {
  max-width: min(70vw, 420px);
  max-height: 22vh;
}
#high-score.hidden {
  display: none;
}
#over-score {
  font: 400 44px/1 var(--title-font);
  color: #fff;
  -webkit-text-stroke: 5px var(--ink);
  paint-order: stroke fill;
}
#over-best {
  color: var(--cyan);
  font-size: 26px;
}
#board {
  width: min(86vw, 360px);
  margin: 0;
  padding: 6px 12px;
  list-style: none;
  background: rgba(5, 5, 8, 0.6);
  border-radius: 12px;
  font-size: 20px;
}
#board li {
  display: flex;
  justify-content: space-between;
  padding: 1px 8px;
  border-radius: 6px;
}
#board li.you {
  background: var(--yellow);
  color: var(--ink);
}
```

Things to notice:

- **The back button and the hint are lifted above the screens** (`z-index: 26`, against 20 for a screen). The screens cover the whole page, so without that a screen would sit on top of the *Samples* button and its clicks would never arrive. The splash is higher still (30), because it should cover everything while the game loads.
- **A screen that is away is `visibility: hidden`,** so its buttons can't be clicked or tabbed to, and `opacity` fades it in and out. Both change together in the `transition`.
- **`paint-order: stroke fill` with `-webkit-text-stroke`** draws the outline *behind* the letters, so a thick outline doesn't eat into thin letters. That's what makes the thin graffiti font readable on any background.
- **The logo is a PNG with a transparent background.** The splash picture is a JPEG on white, which suits the splash (it is white too) but would be a white box on the street. A copy made for the title has the white taken off: the white that touches the edge becomes transparent, and the pixels along the edge fade out, so there is no white fringe. `filter: drop-shadow` follows the *shape* of the picture, unlike `box-shadow`, so the shadow is the shape of the letters.
- **The High Score picture is a PNG with a transparent background.** The original has a black background with a glow. A copy made for the game has the black turned into transparency (brightness becomes opacity), so the glow lies over the street and not in a black box.

### 4e. The markup

Remove the `<div id="message">` line, and put these directly below the splash `<div>`:

```html
  <div id="title" class="screen">
    <img class="logo" src="../assets/images/parkour_runner_logo_small.png" alt="Parkour Runner">
    <div class="row panel">
      <input id="name" type="text" maxlength="12" placeholder="Your name" autocomplete="off" spellcheck="false">
      <div id="swatches"></div>
      <button id="play" class="big" type="button">Play</button>
    </div>
    <p id="title-best"></p>
    <p class="keys">Enter to play &middot; &larr;/&rarr; lanes &middot; &uarr; jump &middot; &darr; slide &middot; P pause</p>
  </div>
  <div id="pause" class="screen hidden">
    <h2>Paused</h2>
    <div class="row">
      <button id="resume" class="big" type="button">Resume</button>
      <button id="pause-title" class="quiet" type="button">Title</button>
    </div>
    <p class="keys">P or Esc to carry on &middot; T for the title</p>
  </div>
  <div id="over" class="screen hidden">
    <img id="high-score" class="hidden" src="../assets/images/high_score_small.png" alt="High score">
    <h2>Game Over</h2>
    <p id="over-score"></p>
    <p id="over-best"></p>
    <ol id="board"></ol>
    <div class="row">
      <button id="again" class="big" type="button">Run again</button>
      <button id="over-title" class="quiet" type="button">Title</button>
    </div>
    <p class="keys">Enter or R to run again &middot; T for the title</p>
  </div>
```

Things to notice:

- **Each screen is an element with an `id`,** and `screens.js` finds them by those ids. The title is visible to begin with; the other two have the `hidden` class.
- **`maxlength="12"`** on the name field matches `NAME_MAX`, but doesn't replace it: the browser only stops *typing*, and `cleanName` is still what the game trusts.
- **The swatches are made by code,** so there is only an empty `<div id="swatches">` for them.
- **They are `<button type="button">`, not links.** A button can be reached with the keyboard and is announced as a button by a screen reader.

### 4f. The class that drives them

Open the placeholder `js/screens.js` and replace its contents with:

```js
// The screens over the picture: the title, the pause and the game over. They are plain
// HTML in index.html, not Babylon.js, because they are mostly text, buttons and a
// text field, which the page already does well. This class finds them, shows the right
// one for what the game is doing, and fills them in. It takes the `document` it
// should look in, so the tests can give it a stand-in. See ../tests/screens.tests.js.
class Screens {
  constructor(doc = document) {
    this.doc = doc;
    const get = (id) => doc.getElementById(id);

    // The three screens, by the game state that shows each.
    this.screens = { [STATES.title]: get("title"), [STATES.paused]: get("pause"), [STATES.over]: get("over") };

    this.nameInput = get("name");
    this.swatches = get("swatches");
    this.titleBest = get("title-best");
    this.overScore = get("over-score");
    this.overBest = get("over-best");
    this.highScore = get("high-score");
    this.board = get("board");
    this.buttons = {
      play: get("play"),
      resume: get("resume"),
      again: get("again"),
      pauseTitle: get("pause-title"),
      overTitle: get("over-title"),
    };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Screens };
} else {
  window.Screens = Screens;
}
```

Things to notice:

- **`this.screens` is keyed by game state,** so `show(state)` can find the screen for a state directly. `playing` has none.
- **It takes the `document` to look in** (`doc = document`), so tests can give it a stand-in page.

Add these methods **inside the class**, directly above its closing `}`:

```js
  // Shows the screen for a game state, and hides the others. The state `playing` has no
  // screen, so showing it hides them all.
  show(state) {
    for (const [name, screen] of Object.entries(this.screens)) {
      screen.classList.toggle("hidden", name !== state);
    }
  }

  // Makes the buttons do something. Each lets go of the keyboard focus when it is clicked:
  // a button that keeps focus is pressed again by the space bar, which is the jump key.
  bind({ play, resume, again, toTitle }) {
    const wire = (button, callback) =>
      button.addEventListener("click", () => {
        button.blur();
        callback();
      });
    wire(this.buttons.play, play);
    wire(this.buttons.resume, resume);
    wire(this.buttons.again, again);
    wire(this.buttons.pauseTitle, toTitle);
    wire(this.buttons.overTitle, toTitle);
  }

  // The name in the text field.
  get name() {
    return this.nameInput.value;
  }

  setName(name) {
    this.nameInput.value = name;
  }

  // The best score, shown on the title screen: the top entry of the leaderboard, if any.
  setBest(entry) {
    this.titleBest.textContent = entry ? `Best: ${entry.score} by ${entry.name}` : "";
  }

  // One round button for each color, painted with its two colors, with the chosen one
  // marked. `onPick` is told the id of the color that is clicked.
  renderSwatches(colors, selectedId, onPick) {
    this.swatches.replaceChildren();
    for (const color of colors) {
      const button = this.doc.createElement("button");
      button.type = "button";
      button.className = "swatch";
      button.title = color.name;
      button.setAttribute("aria-label", color.name);
      button.style.background = `linear-gradient(135deg, ${color.body} 55%, ${color.joints} 55%)`;
      button.classList.toggle("selected", color.id === selectedId);
      button.addEventListener("click", () => {
        button.blur();
        onPick(color.id);
        this.renderSwatches(colors, color.id, onPick);
      });
      this.swatches.appendChild(button);
    }
  }

  // The leaderboard as a list, with the row at `rank` (1 for first) marked as the
  // player's. Names are set as text, never as HTML, so a name can't add anything to the page.
  renderBoard(entries, rank = 0) {
    this.board.replaceChildren();
    if (entries.length === 0) {
      const empty = this.doc.createElement("li");
      empty.textContent = "No scores yet";
      this.board.appendChild(empty);
      return;
    }
    entries.forEach((entry, i) => {
      const row = this.doc.createElement("li");
      row.classList.toggle("you", i + 1 === rank);
      const name = this.doc.createElement("span");
      name.textContent = `${i + 1}. ${entry.name}`;
      const points = this.doc.createElement("span");
      points.textContent = String(entry.score);
      row.appendChild(name);
      row.appendChild(points);
      this.board.appendChild(row);
    });
  }

  // Fills in and shows the game over screen. The High Score picture is only there for a
  // new best score.
  showResult({ score, best, newBest, rank, entries }) {
    this.overScore.textContent = `Score ${score}`;
    this.overBest.textContent = newBest ? "New best!" : `Best ${best}`;
    this.highScore.classList.toggle("hidden", !newBest);
    this.renderBoard(entries, rank);
    this.show(STATES.over);
  }
```

Things to notice:

- **`show` hides every screen but one.** `classList.toggle("hidden", on)` adds the class when `on` is true and removes it when it's false: one line instead of an `if`. Passing `playing` hides all three.
- **Every button lets go of the keyboard when clicked** (`button.blur()`). A button that keeps focus is pressed again by the space bar, which is the jump key. After clicking Play, the first jump would restart the run. It's a real bug, and easy to miss, because it only happens with the mouse and then the keyboard.
- **A name is set as `textContent`, never `innerHTML`.** A name typed by a player goes into the page. If it were HTML, a name like `<img src=x onerror=...>` would run code in everyone's page that loads the saved board. `textContent` shows it as the text it is. There's a test for exactly this.
- **`replaceChildren()`** empties an element, so rendering twice doesn't stack rows.

### 4g. Tests

The screens need a page to work in. The tests give them a stand-in: elements that remember what is done to them, and a `document` that makes more. Replace the placeholder `tests/screens.tests.js` with:

```js
// The screens need a page with certain elements in it. These tests give them a stand-in
// page: elements that remember what is done to them, and a `document` that makes them.
QUnit.module("Screens", () => {
  class FakeElement {
    constructor() {
      this.children = [];
      this.classes = new Set();
      this.listeners = {};
      this.attributes = {};
      this.style = {};
      this.textContent = "";
      this.value = "";
      this.blurred = 0;
      this.classList = {
        add: (name) => this.classes.add(name),
        remove: (name) => this.classes.delete(name),
        toggle: (name, on) => (on ? this.classes.add(name) : this.classes.delete(name)),
        contains: (name) => this.classes.has(name),
      };
    }

    appendChild(child) {
      this.children.push(child);
    }
    replaceChildren() {
      this.children = [];
    }
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
    addEventListener(type, callback) {
      this.listeners[type] = callback;
    }
    click() {
      this.listeners.click();
    }
    blur() {
      this.blurred++;
    }
    get hidden() {
      return this.classes.has("hidden");
    }
  }

  const IDS = [
    "title", "pause", "over", "name", "swatches", "title-best", "over-score", "over-best",
    "high-score", "board", "play", "resume", "again", "pause-title", "over-title",
  ];

  // A page with every element the screens look for.
  const makePage = () => {
    const elements = Object.fromEntries(IDS.map((id) => [id, new FakeElement()]));
    return { elements, getElementById: (id) => elements[id], createElement: () => new FakeElement() };
  };

  const makeScreens = () => {
    const page = makePage();
    return { page, screens: new Screens(page), els: page.elements };
  };

  const entries = [
    { name: "Ana", score: 900 },
    { name: "Ben", score: 500 },
    { name: "Cy", score: 100 },
  ];

  QUnit.test("show() shows the screen for the state and hides the others", (assert) => {
    const { screens, els } = makeScreens();

    screens.show(STATES.paused);

    assert.true(els.title.hidden);
    assert.false(els.pause.hidden);
    assert.true(els.over.hidden);
  });

  QUnit.test("each state shows its own screen", (assert) => {
    const { screens, els } = makeScreens();

    screens.show(STATES.title);
    assert.deepEqual([els.title.hidden, els.pause.hidden, els.over.hidden], [false, true, true]);

    screens.show(STATES.over);
    assert.deepEqual([els.title.hidden, els.pause.hidden, els.over.hidden], [true, true, false]);
  });

  QUnit.test("while playing there is no screen: show() hides them all", (assert) => {
    const { screens, els } = makeScreens();
    screens.show(STATES.title);

    screens.show(STATES.playing);

    assert.deepEqual([els.title.hidden, els.pause.hidden, els.over.hidden], [true, true, true]);
  });

  QUnit.test("the name field is read and set", (assert) => {
    const { screens, els } = makeScreens();

    screens.setName("Ana");

    assert.strictEqual(els.name.value, "Ana");
    els.name.value = "Ben";
    assert.strictEqual(screens.name, "Ben");
  });

  QUnit.test("setBest() shows the best entry on the title screen, or nothing", (assert) => {
    const { screens, els } = makeScreens();

    screens.setBest({ name: "Ana", score: 900 });
    assert.strictEqual(els["title-best"].textContent, "Best: 900 by Ana");

    screens.setBest(null);
    assert.strictEqual(els["title-best"].textContent, "");
  });

  QUnit.test("renderSwatches() makes a button for each color, painted with its colors", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderSwatches(RUNNER_COLORS, "sunset", () => {});

    assert.strictEqual(els.swatches.children.length, RUNNER_COLORS.length);
    const ocean = els.swatches.children[1];
    assert.strictEqual(ocean.title, "Ocean");
    assert.strictEqual(ocean.attributes["aria-label"], "Ocean");
    assert.true(ocean.style.background.includes(colorById("ocean").body));
    assert.true(ocean.style.background.includes(colorById("ocean").joints));
  });

  QUnit.test("the chosen color is marked", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderSwatches(RUNNER_COLORS, "neon", () => {});

    const marked = els.swatches.children.map((b) => b.classes.has("selected"));
    assert.deepEqual(marked, RUNNER_COLORS.map((c) => c.id === "neon"));
  });

  QUnit.test("clicking a swatch tells the game which color, and moves the mark", (assert) => {
    const { screens, els } = makeScreens();
    const picked = [];
    screens.renderSwatches(RUNNER_COLORS, "sunset", (id) => picked.push(id));

    els.swatches.children[1].click();

    assert.deepEqual(picked, ["ocean"]);
    const marked = els.swatches.children.map((b) => b.classes.has("selected"));
    assert.deepEqual(marked, RUNNER_COLORS.map((c) => c.id === "ocean"));
  });

  QUnit.test("rendering again replaces the swatches instead of adding to them", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderSwatches(RUNNER_COLORS, "sunset", () => {});
    screens.renderSwatches(RUNNER_COLORS, "ghost", () => {});

    assert.strictEqual(els.swatches.children.length, RUNNER_COLORS.length);
  });

  QUnit.test("renderBoard() makes a row for each entry, with the place, the name and the score", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderBoard(entries);

    assert.strictEqual(els.board.children.length, 3);
    const [name, points] = els.board.children[1].children;
    assert.strictEqual(name.textContent, "2. Ben");
    assert.strictEqual(points.textContent, "500");
  });

  QUnit.test("renderBoard() marks the player's own row", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderBoard(entries, 2);

    assert.deepEqual(els.board.children.map((row) => row.classes.has("you")), [false, true, false]);
  });

  QUnit.test("renderBoard() with no rank marks no row", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderBoard(entries);

    assert.true(els.board.children.every((row) => !row.classes.has("you")));
  });

  QUnit.test("an empty leaderboard says so", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderBoard([]);

    assert.strictEqual(els.board.children.length, 1);
    assert.strictEqual(els.board.children[0].textContent, "No scores yet");
  });

  QUnit.test("a name is shown as text, never as markup", (assert) => {
    const { screens, els } = makeScreens();

    screens.renderBoard([{ name: "<img src=x onerror=alert(1)>", score: 5 }]);

    const [name] = els.board.children[0].children;
    assert.strictEqual(name.textContent, "1. <img src=x onerror=alert(1)>");
    assert.strictEqual(name.innerHTML, undefined, "innerHTML is never used");
  });

  QUnit.test("showResult() fills in the game over screen and shows it", (assert) => {
    const { screens, els } = makeScreens();

    screens.showResult({ score: 500, best: 900, newBest: false, rank: 2, entries });

    assert.strictEqual(els["over-score"].textContent, "Score 500");
    assert.strictEqual(els["over-best"].textContent, "Best 900");
    assert.true(els["high-score"].hidden, "no picture without a new best");
    assert.false(els.over.hidden);
    assert.true(els.title.hidden);
    assert.strictEqual(els.board.children.length, 3);
  });

  QUnit.test("a new best shows the High Score picture", (assert) => {
    const { screens, els } = makeScreens();

    screens.showResult({ score: 950, best: 950, newBest: true, rank: 1, entries });

    assert.strictEqual(els["over-best"].textContent, "New best!");
    assert.false(els["high-score"].hidden);
  });

  QUnit.test("the picture goes away again for the next, lower, score", (assert) => {
    const { screens, els } = makeScreens();
    screens.showResult({ score: 950, best: 950, newBest: true, rank: 1, entries });

    screens.showResult({ score: 100, best: 950, newBest: false, rank: 0, entries });

    assert.true(els["high-score"].hidden);
  });

  QUnit.test("bind() makes each button do its job", (assert) => {
    const { screens, els } = makeScreens();
    const calls = [];
    screens.bind({
      play: () => calls.push("play"),
      resume: () => calls.push("resume"),
      again: () => calls.push("again"),
      toTitle: () => calls.push("title"),
    });

    for (const id of ["play", "resume", "again", "pause-title", "over-title"]) els[id].click();

    assert.deepEqual(calls, ["play", "resume", "again", "title", "title"]);
  });

  QUnit.test("a clicked button lets go of the keyboard, so the space bar doesn't press it again", (assert) => {
    const { screens, els } = makeScreens();
    screens.bind({ play() {}, resume() {}, again() {}, toTitle() {} });

    els.play.click();

    assert.strictEqual(els.play.blurred, 1);
  });

  QUnit.test("a clicked swatch lets go of the keyboard too", (assert) => {
    const { screens, els } = makeScreens();
    screens.renderSwatches(RUNNER_COLORS, "sunset", () => {});
    const swatch = els.swatches.children[2];

    swatch.click();

    assert.strictEqual(swatch.blurred, 1);
  });
});
```

Add the script and its tests to `tests.html`, after `leaderboard.js` and `leaderboard.tests.js` (`game.js` is already before it):

```html
  <script src="js/screens.js"></script>
```
```html
  <script src="tests/screens.tests.js"></script>
```

Reload `tests.html`: **20 more** tests (**404** in all).

---

## Step 5: Wiring it up

Every piece works on its own. Now `main.js` makes them one game.

### 5a. `index.html`

Add the five new scripts to the list of your own scripts at the **bottom of `<body>`**, the ones after the canvas that end with `main.js`. (Not the `<script>` tags in `<head>`: those load Babylon.js. Your own scripts must come after the canvas, because `main.js` looks for it as soon as it runs.) They go after `hud.js` and before `splash.js`, in this order:

```html
  <script src="js/colors.js"></script>
  <script src="js/profile.js"></script>
  <script src="js/leaderboard.js"></script>
  <script src="js/game.js"></script>
  <script src="js/screens.js"></script>
```

`profile.js` must come before `leaderboard.js`, which uses it, and everything must come before `main.js`.

and replace the `.hint` line:

```html
  <div class="hint">&larr;/&rarr; (A/D) lanes &middot; &uarr; (W/Space) jump or vault &middot; &darr; (S) slide &middot; P pause &middot; R restart &middot; C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
```

Also change the `<title>` to `Parkour Runner Screens - Babylon.js`.

### 5b. `js/main.js`: the top of the file

Change the `started` line, which now means "the splash has gone", and add a constant below it:

```js
let started = false; // the splash has gone, so the game can be played
const CRASH_PAUSE_MS = 1200; // after a crash, how long the runner is left to fall before the game over screen
```

Directly above `const createScene = async () => {`, add a function that loads the fonts:

```js
// The fonts are files the browser loads only when text first needs them, and a GUI label
// draws its text once, so ask for them now and wait, or the score would be drawn in a plain
// font. (If a font can't be loaded the game carries on without it.)
const loadFonts = () => Promise.all([FONT_TITLE, FONT_SMALL].map((font) => document.fonts.load(`32px "${font}"`))).catch(() => {});
```

Things to notice:

- **A web font loads only when text first uses it,** and a GUI label draws its text once, at the moment it is made. If the score were drawn before the file arrived, it would be drawn in a plain font and stay that way. `document.fonts.load` asks for a font now and returns a promise for when it's ready.
- **A failed load is not a failed game.** The `catch` swallows the error and carries on without the font.

### 5c. `js/main.js`: the objects

In `createScene`, **replace** the block that makes the crash message (the comment, `message` and `messageDetail`) and the score and the hud that follow it, with:

```js
  // Who is playing, the best scores so far, what the game is doing (the title, a run, a
  // pause, the end of a run), and the screens that go with each.
  const profile = new Profile();
  const leaderboard = new Leaderboard();
  const game = new Game();
  const screens = new Screens(document);

  // The score, and the heads-up display that shows it: text drawn over the picture by
  // Babylon.js GUI, in the game's fonts.
  const score = new Score();
  await loadFonts();
  const hud = new Hud({ ui: BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("hud", true, scene) });
```

Things to notice:

- **`await loadFonts()` comes before the `Hud` is made.** Everything before it in `createScene` already waited for the models, so there's no extra delay once the fonts are fast.

### 5d. `js/main.js`: what the game does

Directly below the `buildObstacles(runner.z);` line near the runner, and above the `LEFT_KEYS` constants, add:

```js
  let spin = 0; // how far the coins have turned
  let overTimer = 0; // the wait for the runner to fall, before the game over screen

  // Shows the screen for what the game is doing. The score has no place on the title.
  const showScreen = () => {
    screens.show(game.state);
    hud.setVisible(game.state !== STATES.title);
  };

  // The runner is painted in the color that was chosen last time, and the title screen
  // shows the choices. Picking a color paints the runner at once, so he is the preview.
  tintRunner(character.root, colorById(profile.color));
  screens.setName(profile.name);
  screens.setBest(leaderboard.entries[0] || null);
  screens.renderSwatches(RUNNER_COLORS, profile.color, (id) => {
    profile.color = id;
    tintRunner(character.root, colorById(id));
  });
  showScreen();

  // Puts everything back at the start of the street: the runner, the street, the
  // obstacles and the score.
  const resetRun = () => {
    clearTimeout(overTimer);
    runner.reset();
    for (const piece of stream.reset()) release(piece); // the street starts again too
    for (const obstacle of field.reset()) releaseObstacle(obstacle); // and the obstacles
    vaultQueued = false;
    score.reset();
    hud.update(score);
  };

  const startRun = () => {
    resetRun();
    game.start();
    showScreen();
  };

  // The Play button, or Enter on the title: remember who is playing, then run.
  const playFromTitle = () => {
    if (!started || game.state !== STATES.title) return; // not until the splash has gone
    profile.name = cleanName(screens.name);
    screens.setName(profile.name);
    profile.save();
    startRun();
  };

  const goToTitle = () => {
    if (!game.toTitle()) return;
    resetRun();
    screens.setBest(leaderboard.entries[0] || null);
    showScreen();
  };

  const togglePause = () => {
    if (game.togglePause()) showScreen();
  };

  // The game pauses by itself when the player looks away.
  const pauseIfPlaying = () => {
    if (game.pause()) showScreen();
  };
  window.addEventListener("blur", pauseIfPlaying);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseIfPlaying();
  });

  // The runner has crashed: record the score, and once he has had a moment to fall,
  // show how it went.
  const endRun = () => {
    runner.crash();
    game.end();
    const total = score.total;
    const newBest = leaderboard.isBest(total);
    const rank = leaderboard.add(profile.name, total);
    overTimer = setTimeout(() => {
      screens.showResult({ score: total, best: leaderboard.best, newBest, rank, entries: leaderboard.entries });
    }, CRASH_PAUSE_MS);
  };

  screens.bind({ play: playFromTitle, resume: togglePause, again: startRun, toTitle: goToTitle });
```

Things to notice:

- **`resetRun` is the old restart,** moved out of the `R` key so more than one thing can use it. `startRun` resets and begins; `goToTitle` resets and goes back. Both also clear `overTimer`, so a game over screen that was about to appear doesn't turn up in the next run.
- **`showScreen` keeps the screens and the score in step.** The title has no use for the score, so it hides the HUD there.
- **`playFromTitle` is where the profile is saved.** It cleans the name, shows the cleaned name back in the field (so a name that got trimmed is seen to be), saves, and starts. It does nothing until the splash has gone.
- **The game pauses itself** when the page loses focus or the tab is hidden. A runner who keeps running while you answer the door is a lost run.
- **`endRun` asks `isBest` first, then adds.** After `add`, the new score is on the board and would always be "the best". It starts a timer for the game over screen: the runner has just crashed, and showing the screen at once would cover the fall.
- **`screens.bind` connects the buttons** to the same functions the keys use, so a click and a key do exactly the same thing.

### 5e. `js/main.js`: the keys

Replace the whole `keydown` handler with this one. It now does everything the game has a key for, not only the moves:

```js
  window.addEventListener("keydown", (event) => {
    // While a name is being typed the keys are letters, not moves. Enter starts the run.
    if (event.target instanceof HTMLInputElement) {
      if (event.code === "Enter" && !event.repeat) playFromTitle();
      return;
    }

    // The moves, while a run is going.
    const isControl = [LEFT_KEYS, RIGHT_KEYS, JUMP_KEYS, SLIDE_KEYS].some((keys) => keys.has(event.code));
    if (isControl && game.playing) {
      event.preventDefault(); // arrow keys and the space bar otherwise scroll the page
      if (event.repeat) return; // one move per press; holding the key doesn't repeat it

      if (LEFT_KEYS.has(event.code)) runner.moveLane(-1);
      else if (RIGHT_KEYS.has(event.code)) runner.moveLane(1);
      else if (JUMP_KEYS.has(event.code)) {
        // Next to a barrier, a jump is a vault: a quick, low hop over it. A little
        // further back, the vault waits until the barrier is close enough.
        const gap = field.barrierGap(runner);
        if (gap <= VAULT_RANGE) runner.vault();
        else if (gap <= VAULT_QUEUE_RANGE) vaultQueued = true;
        else runner.jump();
      } else runner.slide();
      return;
    }

    // The rest are about the game itself, and act once for each press.
    if (event.repeat) return;
    if (event.code === "Enter") {
      if (game.state === STATES.title) playFromTitle();
      else if (game.state === STATES.over) startRun();
      else if (game.state === STATES.paused) togglePause();
    } else if (event.code === "KeyP" || event.code === "Escape") togglePause();
    else if (event.code === "KeyT") goToTitle();
    else if (event.code === "KeyR" && game.state !== STATES.title) startRun();
  });
```

Things to notice:

- **The first check is for the name field.** `event.target` is the element the key was pressed in. In a text field, the keys are letters: without this check, typing "Dana" would move the runner, and Space would be swallowed by `preventDefault` and never type a space. Only Enter gets through, to start the run.
- **The moves only work while `game.playing`.** On the title or when paused, an arrow key does nothing (and doesn't stop the page doing its own thing with it).
- **One handler, one set of keys:** Enter starts, restarts or resumes depending on the state; **P** or **Esc** pause; **T** goes to the title; **R** restarts, but not on the title. A key that makes no sense in the current state does nothing.

### 5f. `js/main.js`: the frame loop

In the frame loop, replace the line that works out `dt`:

```js
    const dt = game.frozen ? 0 : Math.min(engine.getDeltaTime() / 1000, 0.05);
    scene.animationsEnabled = game.state !== STATES.paused; // a pause holds the animation clips too
```

Change the `if (!runner.crashed) {` that scores, so that it only scores in a run:

```js
    if (game.playing) {
```

Change the coins' spin, so a pause stops them too:

```js
    spin += dt * 2.5;
```

Replace the crash check (the whole `if`, with the message in it) with:

```js
    if (game.playing && field.hit(runner)) endRun();
```

and, where the clip is chosen, make him stand still on the title:

```js
    const clip = game.state === STATES.title ? { name: CLIPS.idle, loop: true, speed: 1 } : clipFor(runner); // he stands still on the title
```

Things to notice:

- **A pause is two things:** no `dt` (so the runner, the street and the coins stay put), and `scene.animationsEnabled = false` (so the animation clips stop too, because Babylon.js plays them itself, by the clock, and not by your `dt`).
- **Only a pause stops the animations,** not the title or the end of a run. The mannequin has to breathe on the title, and fall over after a crash.
- **The coins spin with `dt`,** not with the clock, which is why a pause holds them. Before, `performance.now()` kept going.
- **The title has the runner in the Idle clip.** He is still at the start of the street, running on the spot would look wrong, and he's the preview for the color you choose.

---

## Step 6: Try it

Serve the page and open it. After the splash you should see the title.

- [ ] The **title** shows the logo, a name field, five colored circles and **Play**, with the runner standing behind
- [ ] **Clicking a color** repaints the runner at once, and the choice is marked
- [ ] **Typing a name** (try one with a W, an A, an S or a D in it, and a space) doesn't move anything
- [ ] **Play**, or **Enter** in the name field, starts the run. The score appears, in the graffiti font
- [ ] **P** or **Esc** pauses: the picture dims, the runner, the coins and the street all stop. Pressing it again carries on from the same spot
- [ ] Switching to another window or tab **pauses** by itself
- [ ] **T** from the pause goes back to the title, and the run starts from the beginning when you play again
- [ ] After a **crash**, the runner falls over, and a second later the **game over** screen shows the score, **Best**, and the leaderboard with your row highlighted
- [ ] A score higher than every earlier one shows **New best!** and the **High Score** picture; a lower one doesn't
- [ ] **Enter** or **R** runs again, and **T** goes to the title, where the best score is shown
- [ ] **Reload the page:** your name, your color and your scores are still there
- [ ] Clicking **Play** and then pressing **Space** to jump doesn't restart the run

**If something's wrong**

- **`Game is not defined`, `Screens is not defined`, and so on:** a script tag is missing from `index.html`, or comes after `main.js`. `profile.js` has to come before `leaderboard.js`.
- **The text is in a plain font:** open the Network tab (F12) and look for a red `.ttf` file. The path in `@font-face` is relative to the CSS file, so it is `../../assets/fonts/...`. The names in `hud.js` must match `font-family` in the CSS exactly.
- **The score is in a plain font but the screens aren't:** `await loadFonts()` is missing, or comes after `new Hud`.
- **Nothing happens when you click Play:** `screens.bind` isn't called, or an ID in `index.html` doesn't match the one `screens.js` looks for (the console will say `Cannot read properties of null`).
- **Typing a name moves the runner, or Space doesn't type a space:** the `event.target instanceof HTMLInputElement` check is missing, or comes after the moves.
- **The runner doesn't change color:** the material names. `tintRunner` looks for `M_Main` and `M_Joints`. Log `mesh.material.name` for each of `character.root.getChildMeshes()`.
- **The runner is in a T-pose on the title:** `scene.animationsEnabled` is false there. Only a pause should turn it off.
- **Pausing doesn't stop the runner's legs:** `scene.animationsEnabled` isn't being set.
- **The game over screen never shows:** `endRun` isn't called, or `game.playing` was already false when the crash check ran.
- **"New best!" every time:** `isBest` is called after `add`, not before.
- **Nothing is remembered:** `profile.save()` isn't called. A private window won't remember either, by design: that's the guarded storage working.
- **A restart after a pause is still paused:** `startRun` must call `game.start()`, which works from any state.

**Experiments** (change one, reload, then change it back):

- `CRASH_PAUSE_MS` of `0`: the game over screen covers the fall. Of `4000`: a long look at the crash
- `LEADERBOARD_SIZE` of `3`: only the top three. Clear the saved scores first with `localStorage.removeItem("parkourRunner.leaderboard")` in the console
- `NAME_MAX` of `4`: arcade initials. `maxlength` in the HTML must change too
- A sixth color in `RUNNER_COLORS`: it appears on the title and is tested like the others
- `font: 22px var(--title-font)` on `.screen`: see why the thin font is not for small text
- In the console: `localStorage.setItem("parkourRunner.leaderboard", "nonsense")`, then reload. The game starts as if there were no scores

---

## Step 7: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="js/world.js"></script>
  <script src="js/models.js"></script>
  <script src="js/pool.js"></script>
  <script src="js/stream.js"></script>
  <script src="js/runner.js"></script>
  <script src="js/score.js"></script>
  <script src="js/obstacles.js"></script>
  <script src="js/clips.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/hud.js"></script>
  <script src="js/colors.js"></script>
  <script src="js/profile.js"></script>
  <script src="js/leaderboard.js"></script>
  <script src="js/game.js"></script>
  <script src="js/screens.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/world.tests.js"></script>
  <script src="tests/models.tests.js"></script>
  <script src="tests/pool.tests.js"></script>
  <script src="tests/stream.tests.js"></script>
  <script src="tests/runner.tests.js"></script>
  <script src="tests/score.tests.js"></script>
  <script src="tests/obstacles.tests.js"></script>
  <script src="tests/clips.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/hud.tests.js"></script>
  <script src="tests/colors.tests.js"></script>
  <script src="tests/profile.tests.js"></script>
  <script src="tests/leaderboard.tests.js"></script>
  <script src="tests/game.tests.js"></script>
  <script src="tests/screens.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **404 passing tests**: the 317 you started with, plus 12 for the game states, 11 for the colors, 19 for the profile, 20 for the leaderboard, 5 for the HUD and 20 for the screens.

> **What these tests don't cover.** They check the rules and the calls the code makes, using stand-ins for the browser and for Babylon.js. They can't tell you the title looks good, that the fonts are the right ones, or that the pause feels right. That check is Step 6, with your own eyes.

> **Try breaking something.** In `Leaderboard.add`, change `entry.score < points` to `entry.score <= points`, so a tie goes *above* the score it ties. A test notices. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| A state machine: a value, and rules for changing it | `Game` |
| Freezing time without freezing everything | `frozen`, `dt`, `scene.animationsEnabled` |
| Storage that may not be there, and data that can't be trusted | `browserStorage`, `readJson`, `load` |
| A sorted, capped, repeatable leaderboard | `Leaderboard` |
| Asking a question *before* the thing that changes the answer | `isBest` before `add` |
| Repainting a model through its materials | `tintRunner` |
| HTML menus over a 3D scene | `index.html`, `Screens` |
| Putting untrusted text in a page safely | `textContent` |
| Web fonts, and waiting for them | `@font-face`, `document.fonts.load` |
| Keys that mean different things in different places | the `keydown` handler |

## Challenges

1. **A shared leaderboard.** Everyone playing the same copy of the game could share a board, but that needs a server to keep the scores, and a way to stop anyone posting a score they didn't earn. (Hint: the `Leaderboard` only needs somewhere to `load` from and `save` to. What if that were a `fetch` to a server you control?)
2. **A countdown.** Three, two, one, before the run starts, so the player is ready. (Hint: another state, `ready`, that is `frozen`, with a timer that calls `start`.)
3. **Names for the runner's color on the game over screen.** Show the player's chosen color next to their row. (Hint: save the color id with each entry, and let `renderBoard` paint a swatch.)
4. **Arrow keys on the title.** Left and right change the color. (Hint: you have `RUNNER_COLORS` and the profile's `color`; the tests for the colors don't need to change.)
5. **A reset button.** Clear the scores from the title screen. (Hint: `leaderboard.clear()` already exists and is tested. It needs a button, and probably an "are you sure?".)

---
