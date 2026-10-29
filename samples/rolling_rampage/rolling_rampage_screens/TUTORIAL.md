# Tutorial: Rolling Rampage Screens -- A Title, a Pause, a Score and Sound

This is the eighth tutorial in the Rolling Rampage series. The game has everything a game needs except a way to *start*, *stop* and *finish*. It begins mid-roll the moment the page loads, can't be paused, and when the time runs out it just tries the level again. In this step it becomes a real game. There is a **title screen** with the logo and a place for your name. There is a **pause**. A game is three levels, and each one you finish is worth points (more for every second left), so a game has a **score**, and a **result screen** that says how it ended, with a **leaderboard** of the best scores on your device. And the game gets a voice: every checkpoint, bump, fall and goal has a **sound**, made in code, with nothing to download. First, though, the marble gets the look the logo promised: a **shiny chrome pinball**. You write the code; this document tells you what to write and why.

By the end you'll have:

- A **pinball marble**: polished chrome, dark and glassy with a pale glow at its edge and sharp white highlights, as the ball in the logo is
- A **game state** (title, playing, paused, over) kept as plain rules, so a game can't be paused when it isn't being played
- A **score** (a bonus for each level and a hundred points a second left) and a **tally** of a whole game
- A **profile** (your name, and whether the sound is off) and a **leaderboard**, both **remembered in the browser**, and safe when the browser won't remember
- **Sounds** made with the Web Audio API, from a table of beeps and noise, with a mute that is remembered
- **Screens** (title, pause, result) as plain HTML, each in a CSS file of its own, that **fit a phone on its side** as well as a desktop
- A game that **freezes completely** while paused, **starts** from the title, and **ends** with a result
- Unit tests for all of it, using **stand-ins** for the page, the storage and the sound card

**What you'll learn:** how a material is made to look like polished metal (a sharp highlight and a glowing edge), a game as a state machine, a score as a pure function, `localStorage` and why every use of it is guarded, a tested leaderboard, sound made from oscillators and noise (and why the browser keeps it locked until the player does something), screens as HTML over a canvas, a page that fits a short screen, pausing so that *nothing* moves (including forces that build up), keys that must not steer while typing a name, and testing code that needs a page, a disk and a sound card by giving it fakes of them.

## Where you're starting

This folder is a copy of the finished Enemies sample, plus empty placeholder files for the new code and its tests:

```
rolling_rampage_screens/
├── index.html, tests.html   (change -- Steps 1 and 6)
├── css/
│   ├── theme.css, page.css, splash.css, buttons.css, responsive.css,
│   │   stick.css, tilt.css, levels.css, hud.css   (from the Enemies sample)
│   └── panel.css, title.css, pause.css, result.css, leaderboard.css, controls.css   (new -- Step 6)
├── js/
│   ├── game.js             (placeholder -- Step 2)
│   ├── score.js            (placeholder -- Step 3)
│   ├── profile.js          (placeholder -- Step 4)
│   ├── leaderboard.js      (placeholder -- Step 4)
│   ├── sounds.js           (placeholder -- Step 5)
│   ├── screens.js          (placeholder -- Step 6)
│   ├── marble.js           (changes -- Step 1)
│   ├── controls.js         (changes -- Step 7)
│   ├── main.js             (changes -- Step 7)
│   └── physics.js, course.js, level.js, clock.js, zones.js, movers.js, slime.js, enemies.js, steering.js, tilt.js, camera.js, splash.js   (from the Enemies sample)
└── tests/
    ├── game, score, profile, leaderboard, sounds and screens tests   (placeholders)
    └── controls tests grow, and the rest   (from the Enemies sample)
```

### Serving the page

As before, the page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/rolling_rampage/rolling_rampage_screens/` (the command prints the exact address), or use the *Live Server* extension in VS Code.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Enemies sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**406**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step. Where a step adds a long function, paste it **whole**. Where it **replaces** something, **delete the old one**: a class with two methods of the same name runs the last, and so does a file with two functions of the same name.

> **A note on scripts.** The scripts you add in this tutorial can go in the list in any order, as long as they are **above `main.js`** in `index.html`. Nothing in them is used until the game is running. In `tests.html`, put each script in the list of game scripts and each test file in the list of tests.

---

## Step 1: A pinball marble

The logo's marble is a ball of polished chrome, and what makes a ball look like one is two things. It has **sharp, small, white highlights** where the lights bounce straight into your eye, and it is **dark and glassy in the middle** with a **pale glow round its edge**. Our marble is a plain, matt-ish grey-blue. We change its material, and nothing else: no new file, and no picture to draw.

Open `js/marble.js`. **Replace `makeSteel`** (with the comment above it) with:

```js
// A pinball's look: polished chrome. A ball like that is dark and glassy with a bright edge, and it
// throws back small, hard, white highlights from the lights. (The name is from before it was chrome.)
function makeSteel(scene) {
  const material = new BABYLON.StandardMaterial("steel", scene);
  material.diffuseColor = new BABYLON.Color3(0.42, 0.47, 0.58);
  material.specularColor = new BABYLON.Color3(1, 1, 1);
  material.specularPower = 160; // a very small, sharp highlight
  material.emissiveFresnelParameters = new BABYLON.FresnelParameters({
    bias: 0.05,
    power: 2.5,
    leftColor: BABYLON.Color3.Black(), // facing us: nothing added
    rightColor: new BABYLON.Color3(0.7, 0.8, 0.95), // at the edge: a pale glow, as chrome has
  });
  return material;
}
```

Things to notice:

- **`specularPower` of 160** makes the highlight very small and sharp. A low number (the default is 64) gives a wide, soft shine, like plastic. A high one gives a hard, bright dot, like glass or metal. That dot, once for each light in the scene, is the sparkle of a pinball.
- **`specularColor` is white**, so the highlight is white, not tinted.
- **`diffuseColor` is a darkish blue-grey.** The darker the body, the more the highlights and the edge stand out. Make it light and the marble looks painted.
- **`emissiveFresnelParameters`** adds light that depends on the *angle* you see the surface at. Facing the camera, the marble adds nothing (`leftColor`, black). At the edge, where the surface turns away, it adds a pale blue-white (`rightColor`). That glowing rim is what makes a sphere look polished and round. `power` says how quickly it fades in, and `bias` how much there is even in the middle.
- **The enemies are unchanged.** They have their own material (dark steel, glowing orange), so the two kinds of marble are easy to tell apart.
- **The name `makeSteel` stays**, so nothing that calls it changes. (It is a polished steel ball: that is all a pinball is.)

### Tests

Open `tests/marble.tests.js`. In the module with the marble made from options (the one with *"with none, it is the player's marble..."*), add this test **below** that one and above *"it can be given a name, a look and a weight"*:

```js
  QUnit.test("the player's marble is shiny: a sharp highlight and a pale glow at its edge", (assert) => {
    const material = new Marble(scene).mesh.material;

    assert.true(material.specularPower >= 128, "a small, sharp highlight");
    assert.deepEqual(material.specularColor.asArray(), [1, 1, 1], "a white one");
    assert.true(Boolean(material.emissiveFresnelParameters), "something at the edge");
    assert.true(material.emissiveFresnelParameters.rightColor.b > material.emissiveFresnelParameters.leftColor.b, "brighter at the edge than in the middle");
  });
```

It checks the properties that make it chrome: a small sharp highlight, a white one, and an edge that is brighter than the middle. It can't check that it *looks* right: you do that with your eyes.

Open `tests.html`, and then the game. The marble should now be a shiny ball with bright highlights and a pale rim. You should see **407 passing tests**: the 406 you started with and 1 new one.

---

## Step 2: What the game is doing

So far the game has no *states*. It is always playing. A real game is always in exactly one of four:

| State | Meaning |
|---|---|
| `title` | the title screen is up, and nothing moves |
| `playing` | a game is being played |
| `paused` | a game was being played, and time is standing still |
| `over` | the game has ended, and the result is shown |

Only some changes make sense: you can't pause the title, or the result; you can't end a game that isn't being played. Those rules are a state machine, and like `Run` (which is the same idea for *one level*), it is plain numbers and words, with no Babylon.js and no page. Open the placeholder `js/game.js` and replace its contents with:

```js
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
```

Things to notice:

- **`_change(from, state)` is the one place a state changes.** Every method says which states it may come *from*, and it refuses (returns `false`) otherwise. A method that changes the state says whether it did, so a caller can do something only if it worked (play a click only if the pause happened).
- **`frozen` is the one question the game loop asks.** While the title is up, or the game is paused, nothing moves: no time passes, and the physics isn't stepped. (When a game is *over*, time goes on, so the marble can finish rolling behind the result screen.)
- **`start()` works from anywhere**, so *Play* on the title, *Play again* on the result, and a restart are all the same call.
- **`togglePause` is `pause() || resume()`**: one key does both, and only the one that can work does.

### Tests

Add the script and its tests to `tests.html`, the script below `enemies.js` and the tests below `enemies.tests.js`:

```html
  <script src="js/game.js"></script>
  <script src="tests/game.tests.js"></script>
```

Open the placeholder `tests/game.tests.js` and replace its contents with:

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
    assert.false(gameIn(STATES.over).frozen, "when a game is over the marble can finish rolling");
  });

  QUnit.test("only a run that is going is playing", (assert) => {
    for (const state of Object.values(STATES)) {
      assert.strictEqual(gameIn(state).playing, state === STATES.playing, state);
    }
  });
});
```

Open `tests.html`. You should see **419 passing tests**: twelve more.

---

## Step 3: What a game is worth

A game is three levels, and each is worth points. A fixed bonus for finishing it, and a hundred for every whole second left on the clock, so a quick, clean run beats a slow one, and a bump (three seconds) or a fall (time lost walking back) cost points without any rule about them. It is a pure function, with a small class to add the levels up. Open the placeholder `js/score.js` and replace its contents with:

```js
// Score: what a game is worth. A level that is finished is worth a fixed bonus, and more for every
// whole second left on the clock, so a quick, clean run beats a slow one, and a bump or a fall (which cost
// seconds) cost points. The score of a game is the sum of its levels. It is plain numbers, with no Babylon.js
// and no page, so the rules are easy to test. See ../tests/score.tests.js.

const LEVEL_BONUS = 500; // for finishing a level at all
const SECOND_POINTS = 100; // for every whole second left on the clock when it is finished

// What a level is worth, finished with `remaining` seconds left. Part of a second isn't counted.
function levelScore(remaining) {
  return LEVEL_BONUS + Math.floor(Math.max(0, remaining)) * SECOND_POINTS;
}

// A score as it is shown, with a comma between thousands: 12345 is "12,345".
function formatScore(points) {
  return String(Math.floor(points)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// The levels finished in a game so far, and what each was worth.
class Tally {
  constructor() {
    this.levels = []; // { remaining, points } for each, in order
  }

  // Back to the start of a game.
  reset() {
    this.levels = [];
  }

  // A level has been finished with `remaining` seconds left. Says what it was worth.
  add(remaining) {
    const points = levelScore(remaining);
    this.levels.push({ remaining: Math.floor(Math.max(0, remaining)), points });
    return points;
  }

  // How many levels have been finished.
  get completed() {
    return this.levels.length;
  }

  // The score of the game so far.
  get total() {
    return this.levels.reduce((sum, level) => sum + level.points, 0);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LEVEL_BONUS, SECOND_POINTS, levelScore, formatScore, Tally };
} else {
  Object.assign(window, { LEVEL_BONUS, SECOND_POINTS, levelScore, formatScore, Tally });
}
```

Things to notice:

- **`levelScore` counts whole seconds** (`Math.floor`), so part of a second isn't worth anything, and it can't go below the bonus, even if something gives it a negative time.
- **`Tally` keeps each level**: how many seconds were left and what it was worth, as well as the total. The result screen could show a breakdown, and the tests can say exactly what happened.
- **`formatScore` puts commas in** (`12,345`). The regular expression finds each place that has a multiple of three digits after it and isn't at the start (`\B(?=(\d{3})+(?!\d))`).
- **Nothing here knows about levels or the clock.** It is given a number of seconds. That is why it can be tested with round numbers.

### Tests

```html
  <script src="js/score.js"></script>
  <script src="tests/score.tests.js"></script>
```

Open the placeholder `tests/score.tests.js` and replace its contents with:

```js
QUnit.module("levelScore", () => {
  QUnit.test("a finished level is worth the bonus, and a hundred for every whole second left", (assert) => {
    assert.strictEqual(levelScore(0), LEVEL_BONUS);
    assert.strictEqual(levelScore(10), LEVEL_BONUS + 10 * SECOND_POINTS);
    assert.strictEqual(levelScore(23), 500 + 2300);
  });

  QUnit.test("part of a second isn't counted", (assert) => {
    assert.strictEqual(levelScore(10.99), levelScore(10));
    assert.strictEqual(levelScore(0.9), LEVEL_BONUS);
  });

  QUnit.test("time can't be worth less than nothing", (assert) => {
    assert.strictEqual(levelScore(-5), LEVEL_BONUS);
  });

  QUnit.test("more time left is always worth more", (assert) => {
    for (let seconds = 0; seconds < 60; seconds++) assert.true(levelScore(seconds + 1) > levelScore(seconds), `${seconds}`);
  });
});

QUnit.module("formatScore", () => {
  QUnit.test("puts a comma between thousands", (assert) => {
    assert.strictEqual(formatScore(0), "0");
    assert.strictEqual(formatScore(999), "999");
    assert.strictEqual(formatScore(1000), "1,000");
    assert.strictEqual(formatScore(12345), "12,345");
    assert.strictEqual(formatScore(1234567), "1,234,567");
  });

  QUnit.test("shows a whole number", (assert) => {
    assert.strictEqual(formatScore(1500.7), "1,500");
  });
});

QUnit.module("Tally", () => {
  QUnit.test("starts with nothing finished and a score of 0", (assert) => {
    const tally = new Tally();

    assert.strictEqual(tally.completed, 0);
    assert.strictEqual(tally.total, 0);
  });

  QUnit.test("adding a level says what it was worth, and counts it", (assert) => {
    const tally = new Tally();

    assert.strictEqual(tally.add(20), levelScore(20));

    assert.strictEqual(tally.completed, 1);
    assert.strictEqual(tally.total, levelScore(20));
  });

  QUnit.test("the total is the sum of the levels", (assert) => {
    const tally = new Tally();
    tally.add(20);
    tally.add(5.5);
    tally.add(0);

    assert.strictEqual(tally.total, levelScore(20) + levelScore(5) + levelScore(0));
    assert.strictEqual(tally.completed, 3);
  });

  QUnit.test("it keeps what each level was worth, in order, with the seconds that were left", (assert) => {
    const tally = new Tally();
    tally.add(12.7);
    tally.add(3);

    assert.deepEqual(tally.levels, [{ remaining: 12, points: levelScore(12) }, { remaining: 3, points: levelScore(3) }]);
  });

  QUnit.test("reset starts again", (assert) => {
    const tally = new Tally();
    tally.add(20);

    tally.reset();

    assert.strictEqual(tally.total, 0);
    assert.strictEqual(tally.completed, 0);
  });
});
```

Open `tests.html`. You should see **430 passing tests**: eleven more.

---

## Step 4: Remembering

The game should remember two things between visits: **who is playing** and whether they turned the **sound** off, and the **best scores** on this device. A browser can keep small things for a page in `localStorage`. It has a catch that every use of it has to expect: it can be *missing*, or *refuse to save* (a private window, a full disk, a user who blocked site data), and what is in it may have been *damaged* or *edited by hand*. A game that stops working because it couldn't save a name is a bad game. So every use is guarded, and the game carries on without it.

Open the placeholder `js/profile.js` and replace its contents with:

```js
// Who is playing: a name, and whether the sound is off, remembered in the browser between
// visits.
// It is kept with `localStorage`, which can be missing or refuse to save (a private
// window, blocked site data), so every use of it is guarded and the game works without
// it. The same storage is used by the leaderboard. See ../tests/profile.tests.js.
const PROFILE_KEY = "rollingRampage.profile";
const NAME_MAX = 12; // the longest name, in characters
const DEFAULT_NAME = "Player 1";

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
    this.muted = false; // whether the sound is off
    this.load();
  }

  // Takes the saved name and sound setting, if there are any, and if they are usable.
  load() {
    const saved = readJson(this.storage, this.key);
    if (!saved || typeof saved !== "object") return;
    this.name = cleanName(saved.name);
    this.muted = saved.muted === true; // anything but a yes means sound
  }

  // Remembers the name and sound setting. Says whether it could.
  save() {
    return writeJson(this.storage, this.key, { name: this.name, muted: this.muted });
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

- **`browserStorage`, `readJson` and `writeJson` are the guards.** Each one returns a plain answer (null, or true or false) instead of an error, and they are given the storage to use, so the tests give them a fake one that throws.
- **`cleanName` makes a name fit to show.** Spaces trimmed and squeezed to one, no longer than twelve characters, and a default name if nothing is left. **Names are only ever shown as text, never as HTML**: the screens set `textContent`, so a name with markup in it is shown as the letters it is made of, and does nothing.
- **`load` doesn't trust what it finds.** A saved name is cleaned again (in case someone edited it), and the sound is only off if the save says `true` *exactly*, so a damaged save can't switch it off.
- **`Profile` takes its storage as an option**, with the browser's as the default, which is how it is tested.

Then the leaderboard. Open the placeholder `js/leaderboard.js` and replace its contents with:

```js
// The best scores on this device: a name and a score each, the best LEADERBOARD_SIZE,
// highest first, kept in the browser. It is local: it only knows about the scores
// set in this browser. See ../tests/leaderboard.tests.js.
const LEADERBOARD_KEY = "rollingRampage.leaderboard";
const LEADERBOARD_SIZE = 10;

class Leaderboard {
  constructor({ storage = browserStorage(), key = LEADERBOARD_KEY } = {}) {
    this.storage = storage;
    this.key = key;
    this.entries = []; // { name, score }, best first
    this.load();
  }

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

- **It keeps the best ten, highest first**, and `add` says where the score came: 1 for first, or 0 if it didn't make the board. A score that ties another goes *below* it: first come, first served.
- **`isBest` is asked before `add`.** A score is a new best if it beats everything on the board *now*; after it is added it would be tied with itself. The game asks first.
- **`load` filters what it reads.** Anything that isn't a name with a positive score is dropped, so a hand-edited save can't put a nonsense row on the board.
- **It is local.** It only knows about scores set in this browser. (A shared leaderboard needs a server, which this project doesn't have.)

### Tests

```html
  <script src="js/profile.js"></script>
  <script src="js/leaderboard.js"></script>
  <script src="tests/profile.tests.js"></script>
  <script src="tests/leaderboard.tests.js"></script>
```

Open the placeholder `tests/profile.tests.js` and replace its contents with:

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
  QUnit.test("starts as the default name", (assert) => {
    const profile = new Profile({ storage: profileMemory() });

    assert.strictEqual(profile.name, DEFAULT_NAME);
  });

  QUnit.test("a saved profile comes back in a new one", (assert) => {
    const storage = profileMemory();
    const first = new Profile({ storage });
    first.name = "Ana";

    assert.true(first.save());
    const second = new Profile({ storage });

    assert.strictEqual(second.name, "Ana");
  });

  QUnit.test("the sound is on to begin with", (assert) => {
    assert.false(new Profile({ storage: profileMemory() }).muted);
  });

  QUnit.test("turning the sound off is remembered", (assert) => {
    const storage = profileMemory();
    const first = new Profile({ storage });
    first.muted = true;
    first.save();

    assert.true(new Profile({ storage }).muted);
  });

  QUnit.test("a saved profile from before there was a sound setting has the sound on", (assert) => {
    const storage = profileMemory();
    storage.setItem(PROFILE_KEY, JSON.stringify({ name: "Ana" }));

    assert.false(new Profile({ storage }).muted);
  });

  QUnit.test("only a real true turns the sound off, so a damaged save can't", (assert) => {
    for (const value of ["true", 1, "yes", null, {}]) {
      const storage = profileMemory();
      storage.setItem(PROFILE_KEY, JSON.stringify({ name: "Ana", muted: value }));

      assert.false(new Profile({ storage }).muted, JSON.stringify(value));
    }
  });


  QUnit.test("uses its own key, so it doesn't mix with other saves", (assert) => {
    const storage = profileMemory();
    new Profile({ storage }).save();

    assert.true(storage.data.has(PROFILE_KEY));
    assert.strictEqual(storage.data.size, 1);
  });

  QUnit.test("a saved name is cleaned, in case the save was edited", (assert) => {
    const storage = profileMemory();
    storage.setItem(PROFILE_KEY, JSON.stringify({ name: "   a very long name indeed   " }));

    assert.strictEqual(new Profile({ storage }).name, "a very long");
  });

  QUnit.test("a damaged save is ignored", (assert) => {
    for (const text of ["{oops", "42", "null", "[1,2]", '"text"']) {
      const storage = profileMemory();
      storage.setItem(PROFILE_KEY, text);

      const profile = new Profile({ storage });

      assert.strictEqual(profile.name, DEFAULT_NAME, text);
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

and the placeholder `tests/leaderboard.tests.js` with:

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

Things to notice:

- **The tests use a fake storage**: a `Map` with the two methods the game uses. A second one *throws*, as a private window's does. Every guard is tested against both.
- **They test the awkward cases**: a name with markup, a save that isn't JSON, a save that is JSON but the wrong shape, a sound setting that is `"true"` or `1` instead of `true`, a leaderboard that is full, a tie, a score of 0.

Open `tests.html`. You should see **472 passing tests**: 42 more.

---

## Step 5: Sound

The game's sounds are made **in code**, with the Web Audio API: nothing to download, nothing to license. A sound is a table entry: a few **tones** (a wave shape, a pitch that glides from one note to another, a start time, a length and a volume) and **noise** (a rush of random samples, with its highs cut off), all played together. Open the placeholder `js/sounds.js` and replace its contents with:

```js
// The game's sounds, made with the Web Audio API instead of sound files: each one is a
// few beeps and bursts of noise described as data, and played by wiring up
// oscillators for as long as they last. There is nothing to download and nothing to
// license. The browser won't make a sound until the player has done something on the
// page (a click, a key), so the sounds are "unlocked" by the first one. The audio is
// reached through a function that makes the `AudioContext`, so the tests can give it a
// stand-in. See ../tests/sounds.tests.js.

// Each sound is a list of parts, played together, each starting `start` seconds in:
//   a tone:  { wave, from, to, start, length, volume }  a pitch that glides from `from` to `to` Hz
//   a noise: { noise: true, filter, start, length, volume }  a rush of noise, with its highs cut off above `filter` Hz
const SOUNDS = {
  click: [{ wave: "square", from: 520, to: 780, start: 0, length: 0.06, volume: 0.14 }], // a button
  start: [
    { wave: "sawtooth", from: 150, to: 600, start: 0, length: 0.35, volume: 0.2 }, // a game begins: a rising rush
    { noise: true, filter: 3000, start: 0, length: 0.25, volume: 0.1 },
  ],
  checkpoint: [
    { wave: "triangle", from: 784, to: 784, start: 0, length: 0.1, volume: 0.24 }, // G, then the C above it
    { wave: "triangle", from: 1047, to: 1047, start: 0.1, length: 0.25, volume: 0.24 },
  ],
  goal: [
    { wave: "square", from: 523, to: 523, start: 0, length: 0.1, volume: 0.16 }, // C, E, G, and C an octave up
    { wave: "square", from: 659, to: 659, start: 0.09, length: 0.1, volume: 0.16 },
    { wave: "square", from: 784, to: 784, start: 0.18, length: 0.1, volume: 0.16 },
    { wave: "square", from: 1047, to: 1047, start: 0.27, length: 0.35, volume: 0.16 },
  ],
  bump: [
    { noise: true, filter: 700, start: 0, length: 0.2, volume: 0.35 }, // two heavy things meet
    { wave: "sine", from: 140, to: 55, start: 0, length: 0.22, volume: 0.35 },
  ],
  fall: [{ wave: "sine", from: 700, to: 70, start: 0, length: 0.7, volume: 0.2 }], // a long drop
  dissolve: [
    { noise: true, filter: 4500, start: 0, length: 0.6, volume: 0.18 }, // a sizzle
    { noise: true, filter: 1500, start: 0.1, length: 0.5, volume: 0.1 },
  ],
  tick: [{ wave: "square", from: 1250, to: 1250, start: 0, length: 0.04, volume: 0.1 }], // the last seconds of the clock
  over: [
    { wave: "triangle", from: 392, to: 392, start: 0, length: 0.2, volume: 0.24 }, // G, E and C going down
    { wave: "triangle", from: 330, to: 330, start: 0.2, length: 0.2, volume: 0.24 },
    { wave: "triangle", from: 262, to: 262, start: 0.4, length: 0.5, volume: 0.24 },
  ],
  best: [
    { wave: "triangle", from: 523, to: 523, start: 0, length: 0.14, volume: 0.25 },
    { wave: "triangle", from: 659, to: 659, start: 0.13, length: 0.14, volume: 0.25 },
    { wave: "triangle", from: 784, to: 784, start: 0.26, length: 0.14, volume: 0.25 },
    { wave: "triangle", from: 1047, to: 1047, start: 0.39, length: 0.14, volume: 0.25 },
    { wave: "triangle", from: 1319, to: 1319, start: 0.52, length: 0.45, volume: 0.25 },
  ],
};
const MASTER_VOLUME = 0.6; // every volume above is multiplied by this
const SILENCE = 0.0001; // an exponential fade can't reach 0, so it fades to this

// Makes the browser's audio context. (Some older browsers call it by another name.)
function createAudioContext() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) throw new Error("This browser has no Web Audio");
  return new Context();
}

class Sounds {
  constructor({ createContext = createAudioContext, muted = false } = {}) {
    this.createContext = createContext;
    this.muted = muted;
    this.context = null; // made by unlock(), once the player has done something
    this.noise = null; // a second of random samples, made once, that the noise parts play
  }

  // Makes the audio context, or wakes it if the browser started it asleep. Call it from
  // a click or a key press. Safe to call as often as you like. Says whether there is
  // sound to be had: it can't if the browser has no Web Audio.
  unlock() {
    if (!this.context) {
      try {
        this.context = this.createContext();
      } catch (error) {
        this.context = null;
        return false;
      }
    }
    if (this.context.state === "suspended") this.context.resume();
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
  }

  // The noise: a buffer of random samples, made the first time one is needed.
  _noiseBuffer() {
    if (!this.noise) {
      const { sampleRate } = this.context;
      this.noise = this.context.createBuffer(1, sampleRate, sampleRate);
      const samples = this.noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  // Makes a gain node that starts at `volume` and fades away over `length` seconds from `at`,
  // and joins it to the speakers. Everything a part makes goes through one.
  _fade(at, length, volume) {
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume * MASTER_VOLUME, at);
    gain.gain.exponentialRampToValueAtTime(SILENCE, at + length);
    gain.connect(this.context.destination);
    return gain;
  }

  // Plays the named sound. `rate` multiplies every pitch: 1 is as written, 1.5 is a fifth
  // higher. Says whether anything was played: not when muted, or before unlock().
  play(name, { rate = 1 } = {}) {
    const parts = SOUNDS[name];
    if (!parts) throw new Error(`There is no sound called "${name}"`);
    if (this.muted || !this.context) return false;

    const now = this.context.currentTime;
    for (const part of parts) {
      const at = now + part.start;
      const gain = this._fade(at, part.length, part.volume);
      if (part.noise) {
        const source = this.context.createBufferSource();
        source.buffer = this._noiseBuffer();
        const filter = this.context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(part.filter * rate, at);
        source.connect(filter);
        filter.connect(gain);
        source.start(at);
        source.stop(at + part.length);
      } else {
        const oscillator = this.context.createOscillator();
        oscillator.type = part.wave;
        oscillator.frequency.setValueAtTime(part.from * rate, at);
        oscillator.frequency.exponentialRampToValueAtTime(part.to * rate, at + part.length);
        oscillator.connect(gain);
        oscillator.start(at);
        oscillator.stop(at + part.length);
      }
    }
    return true;
  }
  
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SOUNDS, MASTER_VOLUME, SILENCE, createAudioContext, Sounds };
} else {
  Object.assign(window, { SOUNDS, MASTER_VOLUME, SILENCE, createAudioContext, Sounds });
}
```

Things to notice:

- **A sound is data.** Adding one is adding a row to `SOUNDS`, and a test checks every row is sane (starts at or after 0, lasts under a second, isn't too loud, has pitches above 0 because an exponential fade can't pass through 0).
- **The audio context is made on `unlock()`, not on load.** Browsers won't make a sound until the player has *done something* on the page (a click, a key). The first button the player presses calls `unlock`, which makes the context, or wakes it if the browser started it asleep.
- **`play` says whether anything was played**, and does nothing (rather than failing) when muted, before `unlock`, or in a browser with no Web Audio at all. A game without sound is still a game.
- **The noise is made once**: a second of random samples in a buffer, played through a low-pass filter. A different filter makes a different noise: a low filter is a thud, a high one a sizzle.
- **`rate` multiplies every pitch**, so the same sound can be played higher or lower. (Nothing uses it yet. It is in the challenges.)
- **The context is created through a function** (`createContext`), so the tests give it a fake one that remembers everything made on it.

The sounds of this game: `click` for a button, `start` for a game beginning, `checkpoint` (two notes up), `goal` (a rising run of four), `bump` (noise and a low thud), `fall` (a long drop), `dissolve` (a sizzle), `tick` for each of the last ten seconds, `over` (three notes down) and `best` (a fanfare for a new best score).

### Tests

```html
  <script src="js/sounds.js"></script>
  <script src="tests/sounds.tests.js"></script>
```

Open the placeholder `tests/sounds.tests.js` and replace its contents with:

```js
QUnit.module("SOUNDS", () => {
  const parts = (name) => SOUNDS[name];

  QUnit.test("every sound the game plays is there", (assert) => {
    for (const name of ["click", "start", "checkpoint", "goal", "bump", "fall", "dissolve", "tick", "over", "best"]) {
      assert.true(Array.isArray(SOUNDS[name]) && SOUNDS[name].length > 0, name);
    }
  });

  QUnit.test("every part starts at or after 0, lasts a little while, and is not too loud", (assert) => {
    const problems = [];
    for (const [name, list] of Object.entries(SOUNDS)) {
      for (const part of list) {
        if (!(part.start >= 0)) problems.push(`${name}: start`);
        if (!(part.length > 0 && part.length < 1)) problems.push(`${name}: length`);
        if (!(part.volume > 0 && part.volume <= 0.5)) problems.push(`${name}: volume`);
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("a tone has a wave and two pitches above 0 (a fade can't pass through 0)", (assert) => {
    const problems = [];
    for (const [name, list] of Object.entries(SOUNDS)) {
      for (const part of list.filter((p) => !p.noise)) {
        if (!["sine", "square", "triangle", "sawtooth"].includes(part.wave)) problems.push(`${name}: wave`);
        if (!(part.from > 0 && part.to > 0)) problems.push(`${name}: pitch`);
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("a noise has a filter, and a noise is never a tone", (assert) => {
    for (const list of Object.values(SOUNDS)) {
      for (const part of list.filter((p) => p.noise)) {
        assert.true(part.filter > 0);
        assert.strictEqual(part.wave, undefined);
      }
    }
  });

  QUnit.test("a bump is louder than a click, and a dissolve is only noise", (assert) => {
    const loudest = (name) => Math.max(...parts(name).map((p) => p.volume));

    assert.true(loudest("bump") > loudest("click"));
    assert.true(parts("dissolve").every((p) => p.noise));
  });

  QUnit.test("the goal is a rising run of notes, one after another, and the game over a falling one", (assert) => {
    const notes = parts("goal");
    for (let i = 1; i < notes.length; i++) {
      assert.true(notes[i].from > notes[i - 1].from, "each note is higher");
      assert.true(notes[i].start > notes[i - 1].start, "and starts later");
    }
    const down = parts("over");
    for (let i = 1; i < down.length; i++) assert.true(down[i].from < down[i - 1].from, "each note of the game over is lower");
  });
});

// The sounds need an audio context. These tests give them a stand-in that remembers
// everything made on it, so they can check what was played without making a sound.
QUnit.module("Sounds", () => {
  class FakeParam {
    constructor() {
      this.calls = [];
    }
    setValueAtTime(value, time) {
      this.calls.push(["set", value, time]);
    }
    exponentialRampToValueAtTime(value, time) {
      this.calls.push(["ramp", value, time]);
    }
  }

  class FakeNode {
    constructor(kind) {
      this.kind = kind;
      this.connected = [];
      this.started = null;
      this.stopped = null;
      this.frequency = new FakeParam();
      this.gain = new FakeParam();
    }
    connect(to) {
      this.connected.push(to);
    }
    start(time) {
      this.started = time;
    }
    stop(time) {
      this.stopped = time;
    }
  }

  class FakeContext {
    constructor() {
      this.currentTime = 10;
      this.state = "running";
      this.sampleRate = 100;
      this.destination = { kind: "speakers" };
      this.nodes = [];
      this.buffers = 0;
      this.resumed = 0;
    }
    _node(kind) {
      const node = new FakeNode(kind);
      this.nodes.push(node);
      return node;
    }
    createOscillator() {
      return this._node("oscillator");
    }
    createGain() {
      return this._node("gain");
    }
    createBufferSource() {
      return this._node("source");
    }
    createBiquadFilter() {
      return this._node("filter");
    }
    createBuffer(channels, length) {
      this.buffers++;
      const data = new Float32Array(length);
      return { getChannelData: () => data, length };
    }
    resume() {
      this.resumed++;
      this.state = "running";
    }
    ofKind(kind) {
      return this.nodes.filter((n) => n.kind === kind);
    }
  }

  // Sounds that are already unlocked, with the context they made.
  const unlocked = (options = {}) => {
    const context = new FakeContext();
    const sounds = new Sounds({ createContext: () => context, ...options });
    sounds.unlock();
    return { sounds, context };
  };

  QUnit.test("makes no audio context until unlock(), because the browser wouldn't let it make a sound anyway", (assert) => {
    let made = 0;
    const sounds = new Sounds({ createContext: () => (made++, new FakeContext()) });

    assert.strictEqual(made, 0);
    assert.strictEqual(sounds.context, null);

    assert.true(sounds.unlock());
    assert.strictEqual(made, 1);
  });

  QUnit.test("unlock() again doesn't make another context", (assert) => {
    let made = 0;
    const sounds = new Sounds({ createContext: () => (made++, new FakeContext()) });

    sounds.unlock();
    sounds.unlock();

    assert.strictEqual(made, 1);
  });

  QUnit.test("unlock() wakes a context the browser started asleep", (assert) => {
    const context = new FakeContext();
    context.state = "suspended";
    const sounds = new Sounds({ createContext: () => context });

    sounds.unlock();

    assert.strictEqual(context.resumed, 1);
  });

  QUnit.test("with no Web Audio, unlock() says so and the game carries on without sound", (assert) => {
    const sounds = new Sounds({
      createContext: () => {
        throw new Error("no audio");
      },
    });

    assert.false(sounds.unlock());
    assert.false(sounds.play("checkpoint"));
  });

  QUnit.test("play() does nothing before unlock()", (assert) => {
    const sounds = new Sounds({ createContext: () => new FakeContext() });

    assert.false(sounds.play("checkpoint"));
  });

  QUnit.test("an unknown sound is a mistake, and says which", (assert) => {
    const { sounds } = unlocked();

    assert.throws(() => sounds.play("moo"), /no sound called "moo"/);
  });

  QUnit.test("a tone makes an oscillator and a gain, wired to the speakers", (assert) => {
    const { sounds, context } = unlocked();

    assert.true(sounds.play("click"));

    const [oscillator] = context.ofKind("oscillator");
    const [gain] = context.ofKind("gain");
    assert.strictEqual(oscillator.type, "square");
    assert.deepEqual(oscillator.connected, [gain]);
    assert.deepEqual(gain.connected, [context.destination]);
  });

  QUnit.test("it starts now and stops after its length", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("click");

    const [oscillator] = context.ofKind("oscillator");
    assert.strictEqual(oscillator.started, 10);
    assert.true(Math.abs(oscillator.stopped - (10 + SOUNDS.click[0].length)) < 1e-9);
  });

  QUnit.test("the pitch glides from one note to the other", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("click");

    const [oscillator] = context.ofKind("oscillator");
    const [set, ramp] = oscillator.frequency.calls;
    assert.deepEqual(set.slice(0, 2), ["set", SOUNDS.click[0].from]);
    assert.deepEqual(ramp.slice(0, 2), ["ramp", SOUNDS.click[0].to]);
  });

  QUnit.test("the volume starts at the part's volume, times the master volume, and fades away", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("click");

    const [gain] = context.ofKind("gain");
    const [set, ramp] = gain.gain.calls;
    assert.true(Math.abs(set[1] - SOUNDS.click[0].volume * MASTER_VOLUME) < 1e-9);
    assert.strictEqual(ramp[1], SILENCE);
  });

  QUnit.test("rate multiplies every pitch: 2 is an octave higher", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("click", { rate: 2 });

    const [oscillator] = context.ofKind("oscillator");
    const [set, ramp] = oscillator.frequency.calls;
    assert.strictEqual(set[1], SOUNDS.click[0].from * 2);
    assert.strictEqual(ramp[1], SOUNDS.click[0].to * 2);
  });

  QUnit.test("a sound with several parts makes one of each, and starts them when they say", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("goal");

    const oscillators = context.ofKind("oscillator");
    assert.strictEqual(oscillators.length, SOUNDS.goal.length);
    oscillators.forEach((oscillator, i) => assert.true(Math.abs(oscillator.started - (10 + SOUNDS.goal[i].start)) < 1e-9));
  });

  QUnit.test("a noise part plays the noise through a lowpass filter, then the gain", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("dissolve");

    const [source] = context.ofKind("source");
    const [filter] = context.ofKind("filter");
    const [gain] = context.ofKind("gain");
    assert.strictEqual(filter.type, "lowpass");
    assert.strictEqual(filter.frequency.calls[0][1], SOUNDS.dissolve[0].filter);
    assert.deepEqual(source.connected, [filter]);
    assert.deepEqual(filter.connected, [gain]);
    assert.strictEqual(source.started, 10);
  });

  QUnit.test("the noise is made once, and shared, because it is the same for every sound", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("dissolve");
    sounds.play("fall");
    sounds.play("bump");

    assert.strictEqual(context.buffers, 1);
    const sources = context.ofKind("source");
    assert.true(sources.every((s) => s.buffer === sources[0].buffer));
  });

  QUnit.test("the noise is random samples between -1 and 1", (assert) => {
    const { sounds, context } = unlocked();
    sounds.play("dissolve");

    const samples = context.ofKind("source")[0].buffer.getChannelData(0);

    assert.true(samples.every((v) => v >= -1 && v <= 1));
    assert.true(new Set(samples).size > samples.length / 2, "not all the same");
  });

  QUnit.test("a muted game makes no sound, and doesn't even touch the audio", (assert) => {
    const { sounds, context } = unlocked({ muted: true });

    assert.false(sounds.play("checkpoint"));

    assert.strictEqual(context.nodes.length, 0);
  });

  QUnit.test("setMuted() turns the sound off and on again", (assert) => {
    const { sounds, context } = unlocked();

    sounds.setMuted(true);
    assert.false(sounds.play("checkpoint"));

    sounds.setMuted(false);
    assert.true(sounds.play("checkpoint"));
    assert.true(context.nodes.length > 0);
  });

  QUnit.test("sounds can be played over each other", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("checkpoint");
    sounds.play("checkpoint");

    assert.strictEqual(context.ofKind("oscillator").length, SOUNDS.checkpoint.length * 2);
  });
});
```

Things to notice:

- **A `FakeContext` records every node made on it**: oscillators, gains, filters, buffer sources. The tests check what was *made* (an oscillator wired to a gain wired to the speakers, started now, stopped after its length, with the pitch gliding from one note to the next and the volume fading away), without a sound ever being made.
- **The edge cases are tested**: unknown sound names (a mistake, and says which), muting, unlocking twice, a browser with no audio, and the noise being made once and reused.

Open `tests.html`. You should see **496 passing tests**: 24 more.

---

## Step 6: The screens

A title, a pause and a result are mostly text, buttons and a text box: exactly what the page is good at. So they are plain **HTML over the canvas**, not Babylon.js, and a small class finds them and fills them in.

First, the markup. In `index.html`, directly above the `<button id="next-level" ...>` line, add:

```html
  <div id="title" class="screen">
    <img class="logo" src="../assets/images/rolling_rampage_logo_small.webp" alt="Rolling Rampage">
    <div class="row panel">
      <input id="name" type="text" maxlength="12" placeholder="Your name" autocomplete="off" spellcheck="false">
      <button id="play" class="hazard big" type="button">Play</button>
    </div>
    <p id="title-best"></p>
    <p class="keys desktop-only">Enter to play &middot; arrows or WASD to roll &middot; P pause &middot; M sound</p>
    <p class="keys touch-only">Drag anywhere to steer, or tilt your phone.</p>
  </div>
  <div id="pause" class="screen hidden">
    <h2>Paused</h2>
    <div class="row">
      <button id="resume" class="hazard big" type="button">Resume</button>
      <button id="pause-title" class="hazard" type="button">Title</button>
    </div>
    <p class="keys desktop-only">P or Esc to carry on &middot; T for the title</p>
  </div>
  <div id="over" class="screen hidden">
    <h2 id="over-heading">Game over</h2>
    <p id="over-score"></p>
    <p id="over-best"></p>
    <ol id="board"></ol>
    <div class="row">
      <button id="again" class="hazard big" type="button">Play again</button>
      <button id="over-title" class="hazard" type="button">Title</button>
    </div>
    <p class="keys desktop-only">Enter or R to play again &middot; T for the title</p>
  </div>
  <button id="sound" class="hazard quiet" type="button">Sound: on</button>
  <button id="pause-button" class="hazard quiet hidden" type="button" aria-label="Pause">II</button>
```

and change the hint at the top so it mentions the new keys:

```html
  <div class="hint">Arrows or WASD to roll &middot; R to start again &middot; N for the next level &middot; P pause &middot; M sound &middot; C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
```

Things to notice:

- **Each screen is a `div` with the class `screen`**, and only one is shown at a time. The class `hidden` hides one.
- **The title is shown to begin with** (no `hidden`), and the pause and the result are hidden.
- **The result's heading is an element of its own** (`#over-heading`), because it says *You win!* or *Time's up*.
- **The back button and the hint are above all of this** (their `z-index` is higher, from the first tutorial), so the way back to the samples is always there.

### One CSS file for each part

The styles are new parts of the page, so they go in **new files**, one for each, and each has a `<link>`. Create these six in the `css/` folder of **this** sample (`rolling_rampage_screens/css/`, not the Enemies sample's).

`css/panel.css`: what all three screens share (the full-screen steel backdrop, the headings, the rows of buttons, and what changes on a short screen):

```css
/* The screens over the picture (title, pause and result) share one look: a full-screen steel backdrop, a
   heading in the logo's lettering, and a row of buttons. Each has a file for what is its own (title.css,
   pause.css, result.css, leaderboard.css). They sit under the back button and the hint, so the way back
   to the samples is always there. */
.screen {
  position: fixed;
  inset: 0;
  z-index: 24;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 56px 16px 16px;
  overflow-y: auto;
  background: radial-gradient(circle at 50% 40%, rgba(48, 56, 74, 0.94), rgba(22, 27, 38, 0.97) 75%);
  color: var(--chrome-light);
  text-align: center;
}
.screen.hidden {
  display: none;
}
.screen h2 {
  margin: 0;
  color: var(--yellow);
  font: 400 clamp(30px, 6vw, 52px) / 1.1 var(--title-font);
  letter-spacing: 0.06em;
  text-shadow: 0 3px 6px var(--ink);
  text-transform: uppercase;
}
.screen p {
  margin: 0;
}
.screen .row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.screen .keys {
  color: var(--chrome-dark);
  font: 600 18px / 1.3 var(--small-font);
  letter-spacing: 0.04em;
}
.big {
  padding: 10px 34px;
  font-size: 28px;
}

/* Keys are for a keyboard, and a screen touched with a finger has none (and the other way round for touch). */
.touch-only {
  display: none;
}
@media (pointer: coarse) {
  .desktop-only {
    display: none;
  }
  .touch-only {
    display: block;
  }
}

/* A short screen (a phone on its side) has no room to spare, so everything gets closer. */
@media (max-height: 520px) {
  .screen {
    gap: 6px;
    padding-top: 52px;
  }
  .screen h2 {
    font-size: 26px;
  }
  .big {
    padding: 6px 24px;
    font-size: 22px;
  }
}
```

`css/title.css`: the logo, the name box and the best score:

```css
/* The title: the logo, a place to put a name, and the Play button. */
#title .logo {
  max-width: min(78vw, 480px);
  max-height: 44vh;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.6));
}
#title .panel {
  padding: 10px 14px;
  border: 4px solid var(--steel);
  background: rgba(11, 9, 9, 0.5);
}
#name {
  width: 11em;
  max-width: 50vw;
  padding: 8px 10px;
  border: 3px solid var(--chrome-dark);
  background: var(--ink);
  color: var(--chrome-light);
  font: 700 22px / 1 var(--small-font);
  letter-spacing: 0.05em;
  text-align: center;
  user-select: text;
  -webkit-user-select: text;
}
#name:focus {
  border-color: var(--yellow);
  outline: none;
}
#title-best {
  min-height: 1.2em;
  color: var(--blue);
  font: 700 24px / 1.2 var(--small-font);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

@media (max-height: 520px) {
  #title .logo {
    max-height: 36vh;
  }
  #name {
    padding: 4px 8px;
    font-size: 18px;
  }
  #title-best {
    font-size: 18px;
  }
}
```

`css/pause.css`: the pause, which is see-through:

```css
/* The pause: the game, dimmed, with a way to carry on or to leave. It is see-through, so the player can see
   where they were. */
#pause {
  background: rgba(11, 9, 9, 0.72);
}
```

`css/result.css`: the score and the best:

```css
/* The result: how the game ended, and what it was worth. */
#over-score {
  color: var(--chrome-light);
  font: 400 clamp(26px, 5vw, 40px) / 1.1 var(--title-font);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
#over-best {
  color: var(--chrome);
  font: 700 22px / 1.2 var(--small-font);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
#over-best.new {
  color: var(--orange);
  font-size: 28px;
}

@media (max-height: 520px) {
  #over-score {
    font-size: 22px;
  }
  #over-best {
    font-size: 16px;
  }
  #over-best.new {
    font-size: 20px;
  }
}
```

`css/leaderboard.css`: the list of scores, in two columns on a short screen:

```css
/* The leaderboard, a list of names and scores, with the player's own row picked out. */
#board {
  width: min(86vw, 420px);
  margin: 4px 0;
  padding: 0;
  list-style: none;
  border: 4px solid var(--steel);
  background: rgba(11, 9, 9, 0.5);
}
#board li {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 3px 12px;
  color: var(--chrome);
  font: 600 20px / 1.2 var(--small-font);
  letter-spacing: 0.04em;
}
#board li.you {
  background: var(--yellow);
  color: var(--ink);
  font-weight: 700;
}

/* On a short screen there isn't room for ten rows in a column, so there are two columns of five. */
@media (max-height: 520px) {
  #board {
    width: min(92vw, 560px);
    column-count: 2;
    column-gap: 0;
  }
  #board li {
    break-inside: avoid;
    padding: 1px 10px;
    font-size: 16px;
  }
}
```

`css/controls.css`: the sound button and the pause button, which are at hand while playing:

```css
/* The two small buttons that are always at hand while playing: the sound, and (for a screen with no P key) the pause. */
button.quiet {
  padding: 4px 12px;
  font-size: 18px;
}
#sound {
  position: fixed;
  left: 12px;
  bottom: 56px;
  z-index: 26;
}
#sound.off {
  color: var(--chrome-dark);
}
#pause-button {
  position: fixed;
  left: 12px;
  bottom: 104px;
  z-index: 20;
  min-width: 44px;
  letter-spacing: 0.2em;
}
#pause-button.hidden {
  display: none;
}
```

Link them in `index.html`, **after** the other stylesheets (directly below the `hud.css` line):

```html
  <link rel="stylesheet" href="css/panel.css">
  <link rel="stylesheet" href="css/title.css">
  <link rel="stylesheet" href="css/pause.css">
  <link rel="stylesheet" href="css/result.css">
  <link rel="stylesheet" href="css/leaderboard.css">
  <link rel="stylesheet" href="css/controls.css">
```

Things to notice:

- **A screen is `position: fixed; inset: 0`**, and sits above the game's own buttons and the clock (which are `z-index: 20`) but below the back button (26), so the HUD is hidden behind it and the way out isn't.
- **Phones come first.** Every file that has anything to fit has a `@media (max-height: 520px)` block: a phone on its side is only about 390 pixels high, and a title with a logo, a name box, a button and a hint would not fit at desktop sizes. There the logo shrinks, the headings and buttons are smaller, and the leaderboard becomes **two columns of five** (`column-count: 2`).
- **Keys are for keyboards.** `.desktop-only` is hidden on a screen touched with a finger (`pointer: coarse`), and `.touch-only` is shown instead. A phone doesn't need to be told about the P key.
- **The name box has `user-select: text`**, because the page turns text selection off everywhere (so a finger on the canvas doesn't select things), and a text box needs it back.
- **The pause is see-through** (`rgba(..., 0.72)`), so the player can see where they were.

### The screens class

Now the class that finds them and fills them in. Open the placeholder `js/screens.js` and replace its contents with:

```js
// The screens over the picture: the title, the pause and the result. They are plain HTML in
// index.html, not Babylon.js, because they are mostly text, buttons and a text field, which the page
// already does well. This class finds them, shows the right one for what the game is doing, and fills
// them in. It takes the `document` it should look in, so the tests can give it a stand-in. See
// ../tests/screens.tests.js.
class Screens {
  constructor(doc = document) {
    this.doc = doc;
    const get = (id) => doc.getElementById(id);

    // The three screens, by the game state that shows each.
    this.screens = { [STATES.title]: get("title"), [STATES.paused]: get("pause"), [STATES.over]: get("over") };

    this.nameInput = get("name");
    // Clicking in the name selects it all, so that typing replaces it instead of adding to it.
    this.nameInput.addEventListener("focus", () => this.nameInput.select());
    this.titleBest = get("title-best");
    this.overHeading = get("over-heading");
    this.overScore = get("over-score");
    this.overBest = get("over-best");
    this.board = get("board");
    this.pauseButton = get("pause-button");
    this.buttons = {
      play: get("play"),
      resume: get("resume"),
      again: get("again"),
      pauseTitle: get("pause-title"),
      overTitle: get("over-title"),
      sound: get("sound"),
      pause: this.pauseButton,
    };
  }

  // Shows the screen for a game state, and hides the others. The state `playing` has no
  // screen, so showing it hides them all.
  show(state) {
    for (const [name, screen] of Object.entries(this.screens)) {
      screen.classList.toggle("hidden", name !== state);
    }
  }

  // Makes the buttons do something. Each lets go of the keyboard focus when it is clicked:
  // a button that keeps focus is pressed again by the space bar.
  bind({ play, resume, again, toTitle, sound, pause }) {
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
    wire(this.buttons.sound, sound);
    wire(this.buttons.pause, pause);
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
    this.titleBest.textContent = entry ? `Best: ${formatScore(entry.score)} by ${entry.name}` : "";
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
      points.textContent = formatScore(entry.score);
      row.appendChild(name);
      row.appendChild(points);
      this.board.appendChild(row);
    });
  }

  // Shows the pause button, for a touch screen with no P key, while a game is being played, and
  // hides it the rest of the time (the screens have their own buttons).
  setPlaying(playing) {
    this.pauseButton.classList.toggle("hidden", !playing);
  }

  // Says on the sound button whether the sound is on.
  setSound(on) {
    this.buttons.sound.textContent = on ? "Sound: on" : "Sound: off";
    this.buttons.sound.classList.toggle("off", !on);
  }

  // Fills in and shows the result screen: a heading (*You win!*, or *Time's up*), the score, whether it is a
  // new best, and the leaderboard with the player's place marked.
  showResult({ heading, score, best, newBest, rank, entries }) {
    this.overHeading.textContent = heading;
    this.overScore.textContent = `Score ${formatScore(score)}`;
    this.overBest.textContent = newBest ? "New best!" : `Best ${formatScore(best)}`;
    this.overBest.classList.toggle("new", newBest);
    this.renderBoard(entries, rank);
    this.show(STATES.over);
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

- **It is given the `document`**, so the tests can give it a fake page, and it looks everything up once, in the constructor.
- **`show(state)` shows one screen and hides the others.** `playing` has no screen, so showing it hides all three: that is how the game is seen.
- **`bind` makes every button `blur()` when it is clicked.** A button that keeps keyboard focus is pressed again by the space bar, and a player steering with the keyboard would restart the game.
- **Names go in as `textContent`, never `innerHTML`**, in the title's best score and every row of the leaderboard. A test puts markup in a name and checks it is shown as the letters it is.
- **Focusing the name box selects what is in it**, so typing replaces the old name, as a player expects, instead of adding to it.
- **`showResult` does one thing**: given the heading, the score and the leaderboard, it fills the result screen in and shows it. It marks the player's own row (`you`) and a new best (`new`), so the page can make them stand out.

### Tests

```html
  <script src="js/screens.js"></script>
  <script src="tests/screens.tests.js"></script>
```

Open the placeholder `tests/screens.tests.js` and replace its contents with:

```js
// The screens need a page with certain elements in it. These tests give them a stand-in
// page: elements that remember what is done to them, and a `document` that makes them.
QUnit.module("Screens", () => {
  class FakeElement {
    constructor() {
      this.children = [];
      this.classes = new Set();
      this.listeners = {};
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
    "title", "pause", "over", "name", "title-best", "over-heading", "over-score", "over-best", "board",
    "play", "resume", "again", "pause-title", "over-title", "sound", "pause-button",
  ];

  // A page with every element the screens look for, and the screens made from it.
  const make = () => {
    const els = {};
    for (const id of IDS) els[id] = new FakeElement();
    const doc = {
      getElementById: (id) => els[id],
      createElement: () => new FakeElement(),
    };
    return { screens: new Screens(doc), els };
  };

  const ENTRIES = [
    { name: "Ana", score: 12500 },
    { name: "Bo", score: 4300 },
    { name: "Cy", score: 900 },
  ];

  QUnit.test("show() shows the screen for a state, and hides the others", (assert) => {
    const { screens, els } = make();

    screens.show(STATES.paused);

    assert.true(els.title.hidden);
    assert.false(els.pause.hidden);
    assert.true(els.over.hidden);
  });

  QUnit.test("playing has no screen, so showing it hides them all", (assert) => {
    const { screens, els } = make();

    screens.show(STATES.playing);

    assert.true(els.title.hidden && els.pause.hidden && els.over.hidden);
  });

  QUnit.test("the title is the one to show first", (assert) => {
    const { screens, els } = make();

    screens.show(STATES.title);

    assert.false(els.title.hidden);
  });

  QUnit.test("the name is read from the text field, and can be put there", (assert) => {
    const { screens, els } = make();

    screens.setName("Ana");

    assert.strictEqual(els.name.value, "Ana");
    els.name.value = "Bo";
    assert.strictEqual(screens.name, "Bo");
  });

  QUnit.test("focusing the name field selects what is in it, so typing replaces it", (assert) => {
    const { els } = make();
    let selected = 0;
    els.name.select = () => selected++;

    els.name.listeners.focus();

    assert.strictEqual(selected, 1);
  });

  QUnit.test("setBest() shows the top score and who made it, or nothing if there isn't one", (assert) => {
    const { screens, els } = make();

    screens.setBest(ENTRIES[0]);
    assert.strictEqual(els["title-best"].textContent, "Best: 12,500 by Ana");

    screens.setBest(null);
    assert.strictEqual(els["title-best"].textContent, "");
  });

  QUnit.test("renderBoard() makes a row for each entry, with the place and the name, and the score with its commas", (assert) => {
    const { screens, els } = make();

    screens.renderBoard(ENTRIES);

    assert.strictEqual(els.board.children.length, 3);
    const [name, points] = els.board.children[1].children;
    assert.strictEqual(name.textContent, "2. Bo");
    assert.strictEqual(points.textContent, "4,300");
  });

  QUnit.test("the player's own row is marked", (assert) => {
    const { screens, els } = make();

    screens.renderBoard(ENTRIES, 2);

    assert.deepEqual(els.board.children.map((row) => row.classes.has("you")), [false, true, false]);
  });

  QUnit.test("with no rank, nothing is marked", (assert) => {
    const { screens, els } = make();

    screens.renderBoard(ENTRIES);

    assert.true(els.board.children.every((row) => !row.classes.has("you")));
  });

  QUnit.test("an empty board says there are no scores, in one row", (assert) => {
    const { screens, els } = make();

    screens.renderBoard([]);

    assert.strictEqual(els.board.children.length, 1);
    assert.strictEqual(els.board.children[0].textContent, "No scores yet");
  });

  QUnit.test("rendering again replaces the rows instead of adding to them", (assert) => {
    const { screens, els } = make();

    screens.renderBoard(ENTRIES);
    screens.renderBoard(ENTRIES.slice(0, 1));

    assert.strictEqual(els.board.children.length, 1);
  });

  QUnit.test("a name is shown as text, so markup in it does nothing", (assert) => {
    const { screens, els } = make();

    screens.renderBoard([{ name: "<img src=x onerror=boom()>", score: 5 }]);

    assert.strictEqual(els.board.children[0].children[0].textContent, "1. <img src=x onerror=boom()>");
  });

  QUnit.test("showResult() fills in the heading and the score, and shows the result screen", (assert) => {
    const { screens, els } = make();

    screens.showResult({ heading: "You win!", score: 3100, best: 12500, newBest: false, rank: 0, entries: ENTRIES });

    assert.strictEqual(els["over-heading"].textContent, "You win!");
    assert.strictEqual(els["over-score"].textContent, "Score 3,100");
    assert.strictEqual(els["over-best"].textContent, "Best 12,500");
    assert.false(els.over.hidden);
    assert.true(els.title.hidden);
  });

  QUnit.test("a new best says so, and is marked so the page can make it stand out", (assert) => {
    const { screens, els } = make();

    screens.showResult({ heading: "Time's up", score: 13000, best: 13000, newBest: true, rank: 1, entries: ENTRIES });

    assert.strictEqual(els["over-best"].textContent, "New best!");
    assert.true(els["over-best"].classes.has("new"));
  });

  QUnit.test("and an ordinary score takes the mark away again", (assert) => {
    const { screens, els } = make();
    screens.showResult({ heading: "Time's up", score: 13000, best: 13000, newBest: true, rank: 1, entries: ENTRIES });

    screens.showResult({ heading: "Time's up", score: 500, best: 13000, newBest: false, rank: 0, entries: ENTRIES });

    assert.false(els["over-best"].classes.has("new"));
  });

  QUnit.test("showResult() marks the player's row on the board", (assert) => {
    const { screens, els } = make();

    screens.showResult({ heading: "x", score: 4300, best: 12500, newBest: false, rank: 2, entries: ENTRIES });

    assert.true(els.board.children[1].classes.has("you"));
  });

  QUnit.test("the pause button is shown while a game is played, and hidden the rest of the time", (assert) => {
    const { screens, els } = make();

    screens.setPlaying(true);
    assert.false(els["pause-button"].hidden);

    screens.setPlaying(false);
    assert.true(els["pause-button"].hidden);
  });

  QUnit.test("setSound() says on the button whether the sound is on", (assert) => {
    const { screens, els } = make();

    screens.setSound(false);
    assert.strictEqual(els.sound.textContent, "Sound: off");
    assert.true(els.sound.classes.has("off"));

    screens.setSound(true);
    assert.strictEqual(els.sound.textContent, "Sound: on");
    assert.false(els.sound.classes.has("off"));
  });

  QUnit.test("bind() makes each button do its own thing", (assert) => {
    const { screens, els } = make();
    const calls = [];
    screens.bind({
      play: () => calls.push("play"),
      resume: () => calls.push("resume"),
      again: () => calls.push("again"),
      toTitle: () => calls.push("title"),
      sound: () => calls.push("sound"),
      pause: () => calls.push("pause"),
    });

    for (const id of ["play", "resume", "again", "pause-title", "over-title", "sound", "pause-button"]) els[id].click();

    assert.deepEqual(calls, ["play", "resume", "again", "title", "title", "sound", "pause"]);
  });

  QUnit.test("every button lets go of the keyboard when it is clicked, so the space bar doesn't press it again", (assert) => {
    const { screens, els } = make();
    screens.bind({ play() {}, resume() {}, again() {}, toTitle() {}, sound() {}, pause() {} });

    for (const id of ["play", "resume", "again", "pause-title", "over-title", "sound", "pause-button"]) {
      els[id].click();
      assert.strictEqual(els[id].blurred, 1, id);
    }
  });
});
```

Things to notice:

- **`FakeElement` is a stand-in for a page element.** It remembers its classes, its children, its text and its listeners, and `make()` builds a fake page with every id the screens look for. The tests then say what the screens *did* to it.
- **The tests cover the rules**: one screen at a time; the title is the first; the board has a row for each entry, the player's marked, and one row saying *No scores yet* when empty; markup in a name does nothing; a new best is marked and an ordinary score takes the mark away again; every button lets go of the keyboard.

Open `tests.html`. You should see **516 passing tests**: 20 more.

---

## Step 7: The game

Last, the game itself. Two files: `controls.js` for a small fix, and `main.js`, which does most of the work.

### 7a. Typing a name must not steer

The title has a text box, and the keys to steer are the arrow keys *and WASD*. A player typing "Wanda" would find the W and the A and the D vanished: the controls stop the browser from acting on a steering key (so the arrow keys don't scroll the page), and that stops a letter being typed. The controls must **ignore keys pressed while typing**. In `js/controls.js`, directly above the comment `// Which keys are held right now`, add:

```js
// Whether a key was pressed while the player was typing in a text field (the name on the title screen), where
// the letters W, A, S and D are for spelling.
function typesText(event) {
  const target = event.target;
  return Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"));
}
```

and at the top of the `keydown` handler (inside `KeyboardInput`'s constructor), add the first line below, above the existing check:

```js
        if (typesText(event)) return; // the letters of a name aren't steering
```

and the export block has one more name:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STEERING_KEYS, typesText, KeyboardInput, StickControls };
} else {
  Object.assign(window, { STEERING_KEYS, typesText, KeyboardInput, StickControls });
}
```

Add these tests to the **bottom** of `tests/controls.tests.js`, below everything that is there:

```js
QUnit.module("typing in a text field", () => {
  QUnit.test("a key pressed in a text field is for typing", (assert) => {
    assert.true(typesText({ target: { tagName: "INPUT" } }));
    assert.true(typesText({ target: { tagName: "TEXTAREA" } }));
  });

  QUnit.test("a key pressed anywhere else isn't", (assert) => {
    assert.false(typesText({ target: { tagName: "BUTTON" } }));
    assert.false(typesText({ target: { tagName: "BODY" } }));
    assert.false(typesText({ target: null }));
    assert.false(typesText({}));
  });

  QUnit.test("the steering keys don't steer, and aren't stopped from typing, when they are pressed in a text field", (assert) => {
    const listeners = {};
    const input = new KeyboardInput({
      addEventListener: (type, listener) => (listeners[type] = listener),
      removeEventListener() {},
    });
    let prevented = false;

    listeners.keydown({ code: "KeyW", target: { tagName: "INPUT" }, preventDefault: () => (prevented = true) });

    assert.false(prevented, "the browser is let type the letter");
    assert.deepEqual(input.stick, NO_STICK, "and the marble isn't steered");
  });

  QUnit.test("pressed anywhere else, they steer, as before", (assert) => {
    const listeners = {};
    const input = new KeyboardInput({
      addEventListener: (type, listener) => (listeners[type] = listener),
      removeEventListener() {},
    });

    listeners.keydown({ code: "KeyW", target: { tagName: "BODY" }, preventDefault() {} });

    assert.true(input.stick.y > 0);
  });
});
```

Open `tests.html`. You should see **520 passing tests**: four more.

### 7b. The game's things

Now `js/main.js`, in several places. Find `const exposure = new Exposure();` and directly below it add:

```js
  // The game as a whole: what the screen is showing, who is playing, what they have scored, the best scores
  // on this device, the sound, and the screens themselves.
  const game = new Game();
  const profile = new Profile();
  const board = new Leaderboard();
  const tally = new Tally();
  const sounds = new Sounds({ muted: profile.muted });
  const screens = new Screens(document);
```

Things to notice:

- **One of each thing.** A `Game` (the state), a `Profile` (who is playing and the sound setting), a `Leaderboard`, a `Tally` (what this game has scored so far), `Sounds` (told at once whether it is muted) and the `Screens`.

### 7c. Only while playing

The **R** and **N** keys, and the *Drop again* and *Next level* buttons, work only while a game is being played, and **not while typing a name**. In the `R` handler change the line to:

```js
    if (event.code === "KeyR" && !event.repeat && game.playing && !typesText(event)) dropAgain();
```

and the *Drop again* click to:

```js
    if (game.playing) dropAgain();
```

Likewise for **N** and the *Next level* button:

```js
    if (event.code === "KeyN" && !event.repeat && game.playing && !typesText(event)) nextLevel();
    if (game.playing) nextLevel();
```

### 7d. The sounds

Directly below the goal's `zones.markTaken(zone);` add one line, and under the checkpoint's `say(...)`, and in the hit watcher:

```js
        sounds.play("goal");
    sounds.play("checkpoint");
```

and replace the line that says *Bumped!* (the `if (lost > 0) say(...)` line in the `watchHits` call) with:

```js
    if (lost > 0) {
      say("Bumped!", `-${lost} seconds`, 1200);
      sounds.play("bump");
    }
```

### 7e. The flow of a game

**Replace the whole of `announceEnd`**, with the comment above it, by the flow of the game and the new `announceEnd`:

```js
  // The flow of a game. A game begins at the title, on the first level with nothing scored. It ends when the
  // last level is finished, or when the time runs out, and then the result is shown, and the score goes on the
  // leaderboard if it is good enough.
  const showTitle = () => {
    screens.setName(profile.name);
    screens.setBest(board.entries[0]);
    screens.setSound(!profile.muted);
    screens.setPlaying(false);
    screens.show(STATES.title);
  };
  const startGame = () => {
    sounds.unlock(); // the browser only allows sound after the player has done something
    profile.name = cleanName(screens.name);
    profile.save();
    screens.setName(profile.name);
    tally.reset();
    loadLevel(0);
    game.start();
    screens.setPlaying(true);
    screens.show(STATES.playing);
    sounds.play("start");
  };
  const endGame = (won) => {
    const score = tally.total;
    const newBest = board.isBest(score);
    const rank = board.add(profile.name, score);
    game.end();
    screens.setPlaying(false);
    screens.showResult({ heading: won ? "You win!" : "Time's up", score, best: board.best, newBest, rank, entries: board.entries });
    sounds.play(newBest ? "best" : won ? "goal" : "over");
  };
  const toTitle = () => {
    if (!game.toTitle()) return;
    loadLevel(0); // the first level waits behind the title
    showTitle();
    sounds.play("click");
  };
  const togglePause = () => {
    if (run.status === "won" || run.status === "timeup") return; // the end of a level is already on its way
    if (!game.togglePause()) return;
    screens.setPlaying(game.playing);
    screens.show(game.state);
    sounds.play("click");
  };
  const toggleSound = () => {
    sounds.unlock();
    profile.muted = !profile.muted;
    sounds.setMuted(profile.muted);
    profile.save();
    screens.setSound(!profile.muted);
    sounds.play("click");
  };
  screens.bind({ play: startGame, resume: togglePause, again: startGame, toTitle, sound: toggleSound, pause: togglePause });
  showTitle();

  // The keys. (Not while typing a name: the keys of a name are for spelling.)
  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.code === "Enter" && (game.state === STATES.title || game.state === STATES.over)) {
      startGame();
      return;
    }
    if (typesText(event)) return;
    if (event.code === "KeyP" || event.code === "Escape") togglePause();
    else if (event.code === "KeyM") toggleSound();
    else if (event.code === "KeyT") toTitle();
    else if (event.code === "KeyR" && game.state === STATES.over) startGame();
  });
  // A page that is put in the background (another tab, a phone's lock button) is paused.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.playing) togglePause();
  });

  // When a run is won or lost, say so, wait a moment, then go on: to the next level, or to the result. The
  // wait is a timer, and the player might press N in the meantime, which starts a new run; so the timer only
  // goes on if the run it was set for is still the one being played.
  let announced = null;
  const announceEnd = () => {
    if (run === announced || (run.status !== "won" && run.status !== "timeup")) return;
    announced = run;
    const thisRun = run;
    if (run.status === "won") {
      const points = tally.add(run.remaining);
      const last = levelIndex === LEVELS.length - 1;
      say("Goal!", `${formatTime(run.remaining)} left, +${formatScore(points)}`, END_PAUSE_MS);
      setTimeout(() => run === thisRun && (last ? endGame(true) : nextLevel()), END_PAUSE_MS);
    } else {
      say("Time's up", "", END_PAUSE_MS);
      setTimeout(() => run === thisRun && endGame(false), END_PAUSE_MS);
    }
  };
```

Things to notice:

- **`startGame`** is what *Play*, *Play again* and **Enter** all do. It unlocks the sound (the browser only allows it after the player has done something), keeps the name, clears the score, loads the first level, and starts the game.
- **`endGame(won)`** asks `board.isBest(score)` *before* `board.add(...)`, makes the result screen, and plays the right sound: the fanfare for a new best, the goal's for a win, and a sad one for time running out.
- **`togglePause` refuses at the end of a level.** After a win or a loss, a timer is already counting down to the next level or the result. A pause in that moment would let the timer go off while the game is paused. So the pause waits.
- **The keys live in one handler.** Enter starts a game from the title or the result, *even while typing the name*. Everything else is ignored while typing (`typesText`). **P** or **Esc** pause, **M** is the sound, **T** the title, and **R** plays again from the result.
- **A page in the background is paused** (`visibilitychange`): switching tabs, or locking a phone, shouldn't cost the player their game.
- **`announceEnd` keeps its timer check** (`run === thisRun`), and now scores the level (`tally.add`), says what it was worth, and ends the *game* after the last level, or after time runs out, instead of starting the level again.

### 7f. Every frame

**Replace the start of the frame loop** (from `scene.onBeforeRenderObservable.add(() => {` down to `announceEnd();`) with:

```js
  let lastTick = null; // the second of the clock that last ticked
  scene.onBeforeRenderObservable.add(() => {
    // Time stands still on the title and in a pause: no time passes, and the physics isn't moved on.
    scene.physicsEnabled = !game.frozen;
    const dt = game.frozen ? 0 : Math.min(engine.getDeltaTime() / 1000, 0.05);

    // The clock starts when the game does (the physics is held until then), and counts down
    // until the run is won or lost.
    if (game.playing && run.status === "ready") run.start();
    run.tick(dt);
    showClock();
    announceEnd();

    // A tick for every second of the last ten.
    if (run.low && Math.ceil(run.remaining) !== lastTick) {
      lastTick = Math.ceil(run.remaining);
      sounds.play("tick");
    } else if (!run.low) {
      lastTick = null;
    }
```

(Keep the block about the marble gliding to the goal, directly below it, as it is.) Then change the enemies' line, the slime block, and the steering and falling:

```js
    if (!game.frozen && run.status === "running") enemies.update(dt, marble.position);
```

```js
    // Slime slows the marble and turns it green, and if it stays in too long, it dissolves, and starts again.
    if (!game.frozen && run.status === "running") {
      exposure.tick(dt);
      marble.slow(exposure.inSlime);
      marble.tint(exposure.level);
      if (exposure.dissolved) {
        say("Dissolved!", "Keep out of the slime");
        sounds.play("dissolve");
        dropAgain();
      }
    }
```

```js
    if (!game.frozen && run.status === "running") {
      const stick = combineSticks(combineSticks(keyboard.stick, thumb.value), tilt.stick);
      marble.push(worldDirection(stick, camera.alpha));
    }

    if (hasFallen(marble.position.y, fallLimit(level.grid))) {
      if (game.playing) sounds.play("fall");
      dropAgain();
    }
```

And last, in the bootstrap at the bottom of the file, **take away** the line that started the physics when the splash went (`scene.physicsEnabled = true;`), so that it reads:

```js
    splash.classList.add("hidden"); // and the title is there underneath, waiting for Play
```

Things to notice:

- **Time stands still in one place.** `scene.physicsEnabled = !game.frozen`, and `dt` is 0 while frozen. The physics isn't stepped, nothing counts down, and the camera and everything else hold still.
- **But pushes must stop too.** This is the subtle one. A push is a *force*, and a force is stored until the next step. With the physics frozen, a player or an enemy still being asked to push would pile up forces that the physics released all at once the moment the game resumed: the marble would shoot off. So the marble's push, the enemies' thinking and the slime all check `!game.frozen`.
- **The clock starts with the game**, not with the splash (`game.playing && run.status === "ready"`).
- **The tick** plays once for each second of the last ten, by remembering which second it last ticked for.
- **A fall makes a sound only in a game being played**, so the marble put back behind the title doesn't.
- **The splash no longer starts the physics.** It goes away, and underneath, the title is waiting. The game starts when the player presses *Play*.

---

## Step 8: Try it

Serve the page and open it. After the splash, the **title** shows, with the chrome marble in the logo.

- [ ] The marble in the game is **chrome**: small, bright white highlights, and a pale glow round its edge. The enemies are still dark with an orange glow
- [ ] The **title** has the logo, a name box with your name in it, **Play**, and your best score if you have one
- [ ] **Clicking the name box selects it**, and you can type a name **with W, A, S and D in it**. The marble doesn't move, and the page doesn't scroll
- [ ] **Play** (or **Enter**) starts: the clock runs, and the marble can be steered
- [ ] **P** or **Esc** (or the **II** button on a phone) **pauses**: the screen dims, the clock stops, nothing moves. Wait a few seconds, then **P** again: it carries on, with **no jolt** from the marble
- [ ] An enemy that is **chasing** you stops dead while paused, and doesn't dart off when you resume
- [ ] **Switching to another tab** pauses the game
- [ ] **Checkpoint**, **bump**, **dissolve**, **fall** and **goal** each have a **sound**, and the last ten seconds **tick**
- [ ] **M** (or the **Sound** button) turns the sound off, and the button says so. **Reload**: it is still off
- [ ] Finishing a level says **Goal!** and what it was worth, for example `0:39 left, +4,300`
- [ ] After the **third** level, **You win!** and the **score** appear, with the leaderboard, and your row marked
- [ ] Letting the **time run out** shows **Time's up** with your score so far, and a sad sound
- [ ] **Play again** (or **Enter**, or **R**) starts a new game from the first level, with the score at 0
- [ ] **Title** (or **T**) from the pause or the result goes back to the title
- [ ] **Reload**: your **name** and the **leaderboard** are still there
- [ ] The **back button** (*Samples*) can be reached from every screen
- [ ] On a **phone** (Chrome's device mode, on its side and upright), every screen **fits**: nothing is cut off, and the leaderboard is in two columns when on its side

**If something's wrong**

- **`ReferenceError: Screens is not defined`, `Game`, `Sounds`, `Tally`, `Profile`, or `Leaderboard`:** a script tag is missing from `index.html`. They go in the list at the bottom of `<body>`, above `main.js`.
- **`Class extends value undefined is not a constructor or null`:** still the same one: `enemies.js` must be below `marble.js`.
- **`SyntaxError: Unexpected token '}'` in a file:** a pasted block has landed inside another function. Every function should start at the left edge, and the one above it should already have closed.
- **The marble looks flat or like plastic:** `specularPower` is too low, or `specularColor` isn't white. It should be a small, hard dot.
- **The marble has no glowing edge:** `emissiveFresnelParameters` is missing, or its `rightColor` is black.
- **The title never goes away, or the game never starts:** `startGame` and `screens.bind(...)`. Check the console.
- **The title is still there after Play:** `screens.show(STATES.playing)` hides all three.
- **A game starts as soon as the page loads, behind the title:** the line `scene.physicsEnabled = true;` is still in the bootstrap, or `scene.physicsEnabled = !game.frozen` is missing from the frame.
- **The marble shoots off when the game is resumed:** forces were stored while the physics was frozen. The marble's push and the enemies' update need `!game.frozen`.
- **The clock keeps running in a pause:** `dt` must be 0 while `game.frozen`.
- **P pauses, and a second P does nothing:** `togglePause` and `game.togglePause()`.
- **Typing W, A, S or D in the name box does nothing:** `typesText` isn't being checked in `KeyboardInput`'s `keydown`, or isn't passed the event.
- **The page scrolls when the arrow keys are pressed in the name box:** the same.
- **There is no sound, and no error:** the browser keeps sound locked until a click or a key. The first sound must come after a button, or **Enter**: `startGame` calls `sounds.unlock()`. Check the sound isn't muted.
- **The score doesn't appear, or is the wrong size:** `tally.add(run.remaining)` in `announceEnd`, and `formatScore`.
- **A new best is not marked:** `isBest` has to be asked *before* `add`.
- **The leaderboard doesn't survive a reload:** `localStorage` can be blocked (a private window). The game still works, it just can't remember. Look in `Application, Local Storage` in the developer tools.
- **A screen doesn't fit on a phone:** the `@media (max-height: 520px)` blocks. Check them in device mode on its side.
- **The pause button is missing on a phone:** `screens.setPlaying(true)` in `startGame`.
- **Pressing the space bar presses the last button clicked:** the button must `blur()` when clicked, in `Screens.bind`.

**Experiments** (change one, reload, then change it back):

- `specularPower` of `16`: a wide, soft shine, like plastic. Of `512`: a pin-prick
- The `rightColor` of the glow set to orange: a marble that looks hot
- `diffuseColor` of `(0.5, 0.5, 0.5)`: the marble is painted grey, and the chrome is gone
- `LEVEL_BONUS` of `0`, and `SECOND_POINTS` of `1000`: a game that is all about speed
- `LEADERBOARD_SIZE` of `3`: a short board, and the other scores are dropped as new ones come
- `MASTER_VOLUME` of `0.1`: quiet. Of `1`: loud
- Add a sound to `SOUNDS` and play it from the console: `sounds.play("click", { rate: 2 })` isn't reachable (it is inside the game), so try putting the call in the `click` handler of the pause button
- Block storage (a private window) and see that everything still works, but nothing is remembered

---

## Step 9: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/havok/HavokPhysics_umd.js"></script>
  <script src="js/physics.js"></script>
  <script src="js/course.js"></script>
  <script src="js/level.js"></script>    
  <script src="js/clock.js"></script>
  <script src="js/zones.js"></script>
  <script src="js/slime.js"></script>
  <script src="js/movers.js"></script>
  <script src="js/steering.js"></script>
  <script src="js/marble.js"></script>
  <script src="js/enemies.js"></script>
  <script src="js/score.js"></script>
  <script src="js/profile.js"></script>
  <script src="js/leaderboard.js"></script>
  <script src="js/game.js"></script>
  <script src="js/sounds.js"></script>
  <script src="js/screens.js"></script>
  <script src="js/controls.js"></script>
  <script src="js/tilt.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/physics.tests.js"></script>
  <script src="tests/course.tests.js"></script>
  <script src="tests/level.tests.js"></script>  
  <script src="tests/clock.tests.js"></script>  
  <script src="tests/zones.tests.js"></script>  
  <script src="tests/slime.tests.js"></script>
  <script src="tests/movers.tests.js"></script>
  <script src="tests/steering.tests.js"></script>
  <script src="tests/marble.tests.js"></script>
  <script src="tests/enemies.tests.js"></script>
  <script src="tests/score.tests.js"></script>
  <script src="tests/profile.tests.js"></script>
  <script src="tests/leaderboard.tests.js"></script>
  <script src="tests/game.tests.js"></script>
  <script src="tests/sounds.tests.js"></script>
  <script src="tests/screens.tests.js"></script>
  <script src="tests/controls.tests.js"></script>
  <script src="tests/tilt.tests.js"></script>  
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **520 passing tests**: the 406 you started with, plus 1 for the pinball marble, 12 for the game state, 11 for the score, 42 for the profile and leaderboard, 24 for the sounds, 20 for the screens and 4 for typing.

> **What these tests don't cover.** They check every rule of the game state, the score, the saving and the sounds that are *played*, and what the screens do to a page. They can't tell you what any of it *looks* or *sounds* like: that the marble is shiny enough, that a screen is easy to read on your phone, or that a sound is pleasant and not annoying. Those are Step 8, with your eyes, your ears and a thumb. And `main.js` itself, the glue, isn't unit-tested: it is checked by playing.

> **Try breaking something.** In `Leaderboard.add`, remove the `this.qualifies(points)` check, so a score of 0 is added. The tests for the leaderboard fail, and on the page the board fills up with zeros whenever the time runs out in the first level. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Making a material look like polished metal | `specularPower`, `emissiveFresnelParameters` |
| A game as a state machine | `Game`, `STATES`, `frozen` |
| A score as a pure function | `levelScore`, `Tally`, `formatScore` |
| Saving in the browser, safely | `browserStorage`, `readJson`, `writeJson` |
| Not trusting what was saved | `cleanName`, `Profile.load`, `Leaderboard.load` |
| A leaderboard | `Leaderboard.add`, `qualifies`, `isBest` |
| Sound from nothing | `SOUNDS`, `Sounds`, oscillators and noise |
| Sound locked until the player acts | `unlock()` |
| Screens as HTML over a canvas | `Screens`, `.screen`, `show(state)` |
| A page that fits a short screen | `@media (max-height: 520px)` in each file |
| A new part of the page is a new file | `panel.css`, `title.css`, `pause.css`, `result.css`, `leaderboard.css`, `controls.css` |
| Names as text, never as HTML | `textContent` |
| Keys that mustn't act while typing | `typesText` |
| Pausing everything, including forces | `game.frozen` and the push |
| Pausing when the page is hidden | `visibilitychange` |
| Testing a page, a disk and a sound card | `FakeElement`, a fake `Storage`, `FakeContext` |

## Challenges

1. **A level-complete screen.** Between levels, show the score of the level and the total so far, with a *Next* button, instead of a banner. (Hint: a new state in `Game`, and a new screen in a new file in `css/`.)
2. **A breakdown.** On the result screen, list each level with its seconds left and points. (Hint: `Tally.levels` already has them.)
3. **A different voice.** Use `rate` so a sound is higher as the clock gets lower, for the tick. (Hint: `sounds.play("tick", { rate })`, and what the number should be.)
4. **A rolling sound.** A low rumble that gets louder as the marble goes faster. (Hint: this is a *continuous* sound, not a one-off: an oscillator that is kept and changed every frame. It needs a new method in `Sounds`.)
5. **Choose a level.** From the title, start at any level you have already finished. (Hint: the profile could remember the furthest level, and the title could show a button for each.)
6. **Reset the scores.** A button on the leaderboard to clear it. (Hint: `Leaderboard.clear` is already there, and tested.)

---
