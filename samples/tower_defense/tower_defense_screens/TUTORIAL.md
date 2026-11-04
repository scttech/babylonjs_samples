# Tutorial: Tower Defense Screens -- A Title, a Pause and a Result

This is the ninth tutorial in the Tower Defense series. The game so far starts the moment the page loads, can't be stopped, and ends with a banner and a reload. This tutorial gives it **screens**: a **title** with a card for each map (a small picture of it, and the stars that it has earned), a **pause** (a button, the P key, Escape, and leaving the page all pause it), and a **result** for a game won or lost, with stars, the numbers of the game, and a note when it was a best. You write the code; this document tells you what to write and why.

By the end you'll have:

- **A flow**: a small state machine that says which screen the game is on (title, playing, paused, won, lost), and in which of them time passes
- **Stats, stars and records**: the numbers kept while a game is played, what they are worth in stars, and the best on each map, kept in the browser's storage, which is allowed to fail
- **A minimap**: each map drawn small, from the same parsed map that the game uses
- **The screens**: made from empty elements of the page, told what to show, and saying when a button is pressed
- **A game that uses them**: the title, a map chosen as a new page, the pause, and the result worked out when the game ends
- Unit tests for all of it: **801 passing tests**, 57 of them new

**What you'll learn:** a state machine in which an action that is not allowed from here simply does nothing, why a game is told to stand still and does not stop itself, how to keep a record in `localStorage` when storage can throw, how to draw a thumbnail of data you already have, how to take a screen out of the game so that a press on it does not reach the board behind it, and why a new map is a new page.

**Before you start:** do the [Elements tutorial](../tower_defense_elements/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Elements sample, plus placeholders for the new files:

```
tower_defense_screens/
├── index.html, tests.html   (already list the new scripts, and the page has the three screens in it)
├── css/
│   ├── screens.css           (placeholder -- Step 4)
│   └── hud.css               (changes -- Step 4)
├── js/
│   ├── flow.js               (placeholder -- Step 1)
│   ├── stats.js              (placeholder -- Step 2)
│   ├── minimap.js            (placeholder -- Step 3)
│   ├── screens.js            (placeholder -- Step 4)
│   ├── economy.js, battle.js, hand.js   (a few lines each -- Step 2)
│   ├── hud.js                (changes -- Step 4)
│   ├── main.js               (changes -- Step 5)
│   └── everything else, from the Elements sample
└── tests/
    ├── flow.tests.js         (placeholder -- Step 1)
    ├── stats.tests.js        (placeholder -- Step 2)
    ├── minimap.tests.js      (placeholder -- Step 3)
    ├── screens.tests.js      (placeholder -- Step 4)
    ├── economy, battle, hand and hud tests   (additions and changes)
    └── everything else, from the Elements sample
```

Open `tests.html` before you change anything, through the web server. You should see **744 passing tests**, the Elements sample's.

**The page won't start until Step 5.** `index.html` is already the finished one: it has no banner (the result is a screen now) and has the three screens, and `main.js` still looks for the banner. The tests are the check until Step 5, and then the page is too.

### Serving the page

Like the earlier samples, this one loads models from files, so it needs a web server. In the repo's root folder run `npx serve` and open `http://localhost:3000/samples/tower_defense/tower_defense_screens/` (the command prints the exact address), or use the *Live Server* extension in VS Code.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the tutorial

1. **Flow**: which screen it is.
2. **Stats**: what a game came to, in stars and in numbers, and the best on each map.
3. **A minimap**: a map, drawn small.
4. **The screens**: title, pause and result.
5. **The game**: the screens in the game.

---

## Step 1: Flow

A game is in one of a few states: it hasn't begun, it is going, it is paused, it has been won, it has been lost. Which one it is decides what is on the screen and whether time passes, and a bug in what the game is in is a bug that shows up everywhere (a pause that lets you build, a result that comes up twice). So it is one small object that says it, and nothing else.

Open `js/flow.js` (the placeholder) and **replace the TODO line** with:

```js
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
```

Things to notice:

- **The table is the machine.** `FLOW` says, for each state, what can be done and where it goes. A state with nothing in its row (`won`, `lost`) is an end. To add a state, or a way between two, is a line in the table, and no `if` anywhere changes.
- **An action that isn't allowed does nothing, and says so.** `go` gives back `false`. Pressing pause at the title, finishing a game twice, a result arriving while it is paused: none is an error, and none needs a check at the place that does it.
- **Only `playing` is running.** The game is advanced only while the flow is playing, and that one getter is how a pause stops everything.
- **It tells whoever asks, and does not know who.** `onChange` takes a function, which gets the new state and the old. The page's screens listen, and so does the code that writes the result; a test listens too.
- **There is no way out of the end.** A game that is won or lost is over, and what comes next (play again, another map) is a new page. That is not laziness: starting over means a new scene, new towers and a new director, and a page is the one thing that is certain to have none of what the last game left behind.

Open `tests/flow.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("Flow", () => {
  QUnit.test("begins at the title, and is not running or over", (assert) => {
    const flow = new Flow();

    assert.strictEqual(flow.state, "title");
    assert.false(flow.running);
    assert.false(flow.over);
  });

  QUnit.test("start goes to playing, and only from the title", (assert) => {
    const flow = new Flow();

    assert.true(flow.start());
    assert.strictEqual(flow.state, "playing");
    assert.true(flow.running);
    assert.false(flow.start(), "it is going already");
  });

  QUnit.test("a game that is going can be paused, and a paused one resumed, and only those", (assert) => {
    const flow = new Flow();
    assert.false(flow.pause(), "not from the title");
    assert.false(flow.resume());
    flow.start();
    assert.true(flow.pause());
    assert.strictEqual(flow.state, "paused");
    assert.false(flow.running, "no time passes while it is paused");
    assert.false(flow.pause(), "it is paused already");
    assert.true(flow.resume());
    assert.true(flow.running);
  });

  QUnit.test("toggle pauses a game that is going and resumes one that is paused, and does nothing at the title", (assert) => {
    const flow = new Flow();
    assert.false(flow.toggle());
    flow.start();
    flow.toggle();
    assert.strictEqual(flow.state, "paused");
    flow.toggle();
    assert.strictEqual(flow.state, "playing");
  });

  QUnit.test("a game that is going can be won or lost, and then it is over", (assert) => {
    for (const result of ["won", "lost"]) {
      const flow = new Flow();
      flow.start();

      assert.true(flow.finish(result), result);
      assert.strictEqual(flow.state, result);
      assert.true(flow.over, result);
      assert.false(flow.running, result);
    }
  });

  QUnit.test("a game that is paused, or over, or at the title, is not finished again: the end is once", (assert) => {
    const flow = new Flow();
    assert.false(flow.finish("won"), "not from the title");
    flow.start();
    flow.pause();
    assert.false(flow.finish("lost"), "not while paused");
    flow.resume();
    flow.finish("lost");
    assert.false(flow.finish("won"), "not twice, and not the other way");
    assert.strictEqual(flow.state, "lost");
  });

  QUnit.test("nothing leaves an end: it is a new page that starts again", (assert) => {
    const flow = new Flow();
    flow.start();
    flow.finish("won");

    for (const action of ["start", "pause", "resume"]) assert.false(flow.go(action), action);
  });

  QUnit.test("an action that isn't one does nothing", (assert) => {
    assert.false(new Flow().go("explode"));
  });

  QUnit.test("whoever asks is told of every change, with the state it is in and the state it was in, and not of what didn't happen", (assert) => {
    const flow = new Flow();
    const heard = [];
    flow.onChange((now, before) => heard.push(`${before} to ${now}`));
    flow.pause();
    flow.start();
    flow.pause();
    flow.resume();
    flow.finish("won");

    assert.deepEqual(heard, ["title to playing", "playing to paused", "paused to playing", "playing to won"]);
  });

  QUnit.test("every state that the table names is one that it has a row for", (assert) => {
    for (const row of Object.values(FLOW)) for (const next of Object.values(row)) assert.true(next in FLOW, next);
  });
});
```

- **"A game that is paused, or over, or at the title, is not finished again"** is the one to read: the end happens once, however many times the game says so.
- **"Every state that the table names is one that it has a row for"** is what stops a typo in the table from making a state that nothing can leave and nothing can be said of.

**Check:** open `tests.html`. 754 tests pass.

---

## Step 2: Stats

The result screen says how the game went, and there are three things to know for it: the numbers of the game, what they are worth in stars, and whether it is the best that the player has done on that map.

### The numbers

The wallet already knows two of them. It adds up what it has taken in (and not what it began with):

In `js/economy.js`, after line 12, add:

```js
    this.earned = 0; // all that has been taken in since the start (not the gold that it began with)
```

In `js/economy.js`, after line 30, add:

```js
    this.earned += amount;
```

The frame of the game keeps the rest: how long it has been played, how many enemies were defeated and how many got through. The `Stats` is *given* to the frame (it is optional), so the tests of the frame that don't care about it are as they were:

In `js/battle.js`, **replace** line 10:

```js
function settle(enemies, wallet, director) {
```

with:

```js
function settle(enemies, wallet, director, stats = null) {
```

In `js/battle.js`, after line 16, add:

```js
      if (stats) stats.count("defeated");
```

In `js/battle.js`, after line 20, add:

```js
      if (stats) stats.count("leaked");
```

In `js/battle.js`, after line 35, add:

```js
  if (world.stats) world.stats.time += dt;
```

In `js/battle.js`, **replace** line 51:

```js
  const { events, gone } = settle(world.enemies, wallet, director);
```

with:

```js
  const { events, gone } = settle(world.enemies, wallet, director, world.stats);
```

and the hand counts what the player does: an upgrade, a sale and a tower built (each only if it *worked*, so a podium that is refused is not counted):

In `js/hand.js`, after line 117, add:

```js
    if (result.ok && this.stats) this.stats.count("upgraded");
```

In `js/hand.js`, after line 130, add:

```js
      if (this.stats) this.stats.count("sold");
```

In `js/hand.js`, after line 186, add:

```js
    if (result.ok && this.stats) this.stats.count("built");
```

### The results

Open `js/stats.js` (the placeholder) and **replace the TODO line** with:

```js
// How a game went: the numbers kept while it is played (`Stats`), what they are worth in stars (`starsFor`), and the best a
// player has done on each map (`Records`, kept in the browser's storage, which can fail). None of it knows about the page, so
// a test can play a game in a moment and say what its results page would say. See ../tests/stats.tests.js.

const RATING = {
  threeStars: 0.9, // the share of the lives left that wins three stars
  twoStars: 0.5, // and two
};

// What the result screen says as its title and its line, for a game that is won or lost.
const RESULTS = {
  won: { title: "The island is safe!", text: "Every wave has been beaten." },
  lost: { title: "The island has fallen", text: "Too many got through." },
};

class Stats {
  constructor() {
    this.time = 0; // seconds that the game has been played (not the time that it was paused)
    this.defeated = 0; // enemies that were defeated
    this.leaked = 0; // enemies that got to the end
    this.built = 0; // towers that were built
    this.upgraded = 0; // upgrades that were bought
    this.sold = 0; // towers that were sold
  }

  // Adds one to a count.
  count(name) {
    this[name]++;
  }
}

// How many stars a game is worth: none for a game that was lost, one for winning, two for winning with half the lives left,
// and three for nearly all of them.
function starsFor(result, lives, total) {
  if (result !== "won") return 0;
  const share = total > 0 ? lives / total : 0;
  if (share >= RATING.threeStars) return 3;
  if (share >= RATING.twoStars) return 2;
  return 1;
}

// Seconds as minutes and seconds: 75 is "1:15".
function clock(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

// The lines of the result screen, as [label, value] pairs, for a game that has ended.
function summarize(stats, { wave, total, lives, gold }) {
  return [
    ["Waves", `${wave} of ${total}`],
    ["Lives left", String(lives)],
    ["Enemies defeated", String(stats.defeated)],
    ["Gold earned", String(Math.floor(gold))],
    ["Towers built", String(stats.built)],
    ["Upgrades", String(stats.upgraded)],
    ["Time", clock(stats.time)],
  ];
}

// The best a player has done on each map. `storage` is anything with `getItem` and `setItem` (the page's `localStorage`),
// and it is allowed to fail: a private window, full or blocked storage. Then there are no records, and the game goes on.
class Records {
  constructor(storage, key = "tower_defense_records") {
    this.storage = storage;
    this.key = key;
    this.data = this.load();
  }

  load() {
    try {
      const data = JSON.parse(this.storage.getItem(this.key));
      return data && typeof data === "object" ? data : {};
    } catch (error) {
      return {};
    }
  }

  // The best for a map, by its name: { stars, wave } (nothing at all is no stars and wave 0).
  get(map) {
    return { stars: 0, wave: 0, ...this.data[map] };
  }

  // Puts a game on the record: { stars, wave }. It says whether it was a best, in stars or in how far it got.
  update(map, { stars, wave }) {
    const best = this.get(map);
    const improved = stars > best.stars || wave > best.wave;
    this.data[map] = { stars: Math.max(stars, best.stars), wave: Math.max(wave, best.wave) };
    try {
      this.storage.setItem(this.key, JSON.stringify(this.data));
    } catch (error) {
      // Not saved; it is still kept until the page is closed.
    }
    return improved;
  }
}

// The page's local storage, or a stand-in that keeps nothing when it can't be had (a private window, or storage that is blocked: even
// asking for it can throw).
function safeStorage(page) {
  try {
    const storage = page.localStorage;
    storage.getItem("tower_defense_probe");
    return storage;
  } catch (error) {
    return { getItem: () => null, setItem: () => {} };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RATING, RESULTS, Stats, starsFor, clock, summarize, Records, safeStorage };
} else {
  Object.assign(window, { RATING, RESULTS, Stats, starsFor, clock, summarize, Records, safeStorage });
}
```

Things to notice:

- **Stars are a function of how it ended and how many lives were left,** and the numbers that decide it (`RATING`) are in a table. Winning is one star, with half the lives two, and with nine tenths three. A game that was lost is worth nothing, however much was left.
- **`summarize` gives pairs, not text,** `[label, value]`, so that the page decides how to show them (a list of terms and definitions) and a test can compare them.
- **`Records` is given its storage,** anything with `getItem` and `setItem`. In the page it is `localStorage`; in a test it is an object. It keeps the best stars and the furthest wave for each map by name, and `update` says whether the game was a best.
- **Storage can fail in three ways, and the game must not care about any of them.** The page may not have it (a private window, a setting that blocks it, and *even asking for `localStorage` can throw*); what is in it may not be records (it is empty, or it is something else, or it isn't JSON); and writing can fail (it is full). `safeStorage` takes the first, `load` takes the second, and `update` takes the third: in each the game goes on and the player has no records.
- **A best is a best in stars or a best in how far it got.** A loss in wave 6 that was a loss in wave 4 last time is a new best, and says so.

Open `tests/stats.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("Stats", () => {
  QUnit.test("begin at nothing", (assert) => {
    const stats = new Stats();

    for (const name of ["time", "defeated", "leaked", "built", "upgraded", "sold"]) assert.strictEqual(stats[name], 0, name);
  });

  QUnit.test("count adds one to what it is told", (assert) => {
    const stats = new Stats();
    stats.count("built");
    stats.count("built");
    stats.count("sold");

    assert.strictEqual(stats.built, 2);
    assert.strictEqual(stats.sold, 1);
    assert.strictEqual(stats.defeated, 0);
  });
});

QUnit.module("starsFor", () => {
  QUnit.test("a game that was lost is worth nothing, however much is left", (assert) => {
    assert.strictEqual(starsFor("lost", 15, 20), 0);
    assert.strictEqual(starsFor("running", 20, 20), 0);
  });

  QUnit.test("one star for winning, two for half the lives left, and three for nearly all", (assert) => {
    assert.strictEqual(starsFor("won", 1, 20), 1);
    assert.strictEqual(starsFor("won", 9, 20), 1);
    assert.strictEqual(starsFor("won", 10, 20), 2);
    assert.strictEqual(starsFor("won", 17, 20), 2);
    assert.strictEqual(starsFor("won", 18, 20), 3);
    assert.strictEqual(starsFor("won", 20, 20), 3);
  });

  QUnit.test("the numbers that decide it are in the table", (assert) => {
    assert.true(RATING.threeStars > RATING.twoStars && RATING.twoStars > 0 && RATING.threeStars <= 1);
  });

  QUnit.test("a game with no lives to lose is not a division by nothing", (assert) => {
    assert.strictEqual(starsFor("won", 0, 0), 1);
  });
});

QUnit.module("clock", () => {
  QUnit.test("is minutes and seconds, with the seconds in two figures", (assert) => {
    assert.strictEqual(clock(0), "0:00");
    assert.strictEqual(clock(75), "1:15");
    assert.strictEqual(clock(600), "10:00");
    assert.strictEqual(clock(61.9), "1:01");
  });

  QUnit.test("is never below nothing", (assert) => {
    assert.strictEqual(clock(-5), "0:00");
  });
});

QUnit.module("summarize", () => {
  QUnit.test("says what the game came to, line by line", (assert) => {
    const stats = new Stats();
    stats.defeated = 42;
    stats.built = 7;
    stats.upgraded = 3;
    stats.time = 400;
    const rows = summarize(stats, { wave: 10, total: 10, lives: 17, gold: 1234.9 });

    assert.deepEqual(rows, [
      ["Waves", "10 of 10"],
      ["Lives left", "17"],
      ["Enemies defeated", "42"],
      ["Gold earned", "1234"],
      ["Towers built", "7"],
      ["Upgrades", "3"],
      ["Time", "6:40"],
    ]);
  });
});

QUnit.module("RESULTS", () => {
  QUnit.test("a win says something different from a loss", (assert) => {
    assert.notStrictEqual(RESULTS.won.title, RESULTS.lost.title);
    for (const result of Object.values(RESULTS)) assert.true(result.title.length > 0 && result.text.length > 0);
  });
});

QUnit.module("Records", () => {
  // Storage like the page's, in an object.
  const memory = () => {
    const data = {};
    return { getItem: (key) => (key in data ? data[key] : null), setItem: (key, value) => (data[key] = value), data };
  };

  QUnit.test("a map that has not been played has nothing on record", (assert) => {
    assert.deepEqual(new Records(memory()).get("The Winding Road"), { stars: 0, wave: 0 });
  });

  QUnit.test("a game is put on the record, and says it was a best", (assert) => {
    const records = new Records(memory());

    assert.true(records.update("A", { stars: 2, wave: 10 }));
    assert.deepEqual(records.get("A"), { stars: 2, wave: 10 });
  });

  QUnit.test("a worse game does not take the place of a better one, and does not say it was a best", (assert) => {
    const records = new Records(memory());
    records.update("A", { stars: 3, wave: 10 });

    assert.false(records.update("A", { stars: 1, wave: 10 }));
    assert.false(records.update("A", { stars: 0, wave: 4 }));
    assert.deepEqual(records.get("A"), { stars: 3, wave: 10 });
  });

  QUnit.test("getting further is a best, even without a star, and each is kept on its own", (assert) => {
    const records = new Records(memory());
    records.update("A", { stars: 0, wave: 4 });

    assert.true(records.update("A", { stars: 0, wave: 6 }));
    assert.deepEqual(records.get("A"), { stars: 0, wave: 6 });
    assert.deepEqual(records.get("B"), { stars: 0, wave: 0 });
  });

  QUnit.test("they are kept: a new Records on the same storage has them", (assert) => {
    const storage = memory();
    new Records(storage).update("A", { stars: 3, wave: 10 });

    assert.deepEqual(new Records(storage).get("A"), { stars: 3, wave: 10 });
  });

  QUnit.test("storage that has something that isn't records, or isn't there, is no records and no error", (assert) => {
    const broken = { getItem: () => "{not json", setItem: () => {} };
    const empty = { getItem: () => null, setItem: () => {} };
    const text = { getItem: () => '"hello"', setItem: () => {} };

    for (const storage of [broken, empty, text]) assert.deepEqual(new Records(storage).get("A"), { stars: 0, wave: 0 });
  });

  QUnit.test("storage that can't be written to loses nothing for the game that is going, and does not throw", (assert) => {
    const full = { getItem: () => null, setItem: () => { throw new Error("full"); } };
    const records = new Records(full);

    assert.true(records.update("A", { stars: 2, wave: 5 }));
    assert.deepEqual(records.get("A"), { stars: 2, wave: 5 });
  });
});

QUnit.module("safeStorage", () => {
  QUnit.test("is the page's storage if it works", (assert) => {
    const storage = { getItem: () => null, setItem: () => {} };

    assert.strictEqual(safeStorage({ localStorage: storage }), storage);
  });

  QUnit.test("is one that keeps nothing if it can't be had, even if just asking for it throws", (assert) => {
    const blocked = {
      get localStorage() {
        throw new Error("blocked");
      },
    };
    const storage = safeStorage(blocked);

    assert.strictEqual(storage.getItem("x"), null);
    storage.setItem("x", "y");
    assert.strictEqual(storage.getItem("x"), null);
  });

  QUnit.test("is one that keeps nothing if it is there and throws when it is used", (assert) => {
    const storage = safeStorage({ localStorage: { getItem: () => { throw new Error("denied"); } } });

    assert.strictEqual(storage.getItem("x"), null);
  });
});
```

and the tests of the numbers that the wallet, the frame and the hand keep:

In `tests/economy.tests.js`, after line 28, add:

```js
  QUnit.test("it keeps count of what it has taken in, and not of what it began with, or what was spent", (assert) => {
    const wallet = new Wallet(100);
    wallet.earn(30);
    wallet.spend(50);
    wallet.earn(5);

    assert.strictEqual(wallet.earned, 35);
    assert.strictEqual(wallet.gold, 85);
    assert.strictEqual(new Wallet(100).earned, 0);
  });

```

In `tests/battle.tests.js`, after line 240, add:

```js

  QUnit.test("a game that keeps the numbers says what came of it: every enemy defeated, none that got through, and how long it took", (assert) => {
    const { world } = makeWorld(defense, 1000);
    world.stats = new Stats();
    play(world, 200);

    assert.strictEqual(world.stats.defeated, 6);
    assert.strictEqual(world.stats.leaked, 0);
    assert.true(world.stats.time > 5 && world.stats.time < 200, `${world.stats.time.toFixed(1)} seconds`);
    world.towers.forEach((tower) => tower.dispose());
  });

  QUnit.test("an enemy that gets to the end is counted as one that leaked, and not as one that was defeated", (assert) => {
    const { world } = makeWorld([]);
    world.stats = new Stats();
    play(world, 200);

    assert.strictEqual(world.stats.defeated, 0);
    assert.strictEqual(world.stats.leaked, rules.lives, "one life each, until the game is lost");
  });

  QUnit.test("the time is the time that the game was played: it does not go on when the game is over", (assert) => {
    const { world } = makeWorld([]);
    world.stats = new Stats();
    play(world, 200);
    const time = world.stats.time;
    advance(world, 1);

    assert.strictEqual(world.stats.time, time);
  });

  QUnit.test("a game that is not given any numbers to keep still plays", (assert) => {
    const { world, ended } = makeWorld(defense, 1000);
    play(world, 200);

    assert.deepEqual(ended, ["won"]);
    world.towers.forEach((tower) => tower.dispose());
  });
```

In `tests/hand.tests.js`, after line 528, add:

```js

  QUnit.test("it counts what is done: a tower built, an upgrade, a sale", (assert) => {
    hand.stats = new Stats();
    build("water", GRASS);
    tap(at(GRASS));
    hand.upgrade();
    hand.sell();

    assert.strictEqual(hand.stats.built, 1);
    assert.strictEqual(hand.stats.upgraded, 1);
    assert.strictEqual(hand.stats.sold, 1);
  });

  QUnit.test("and not what is not: a podium that can't be put down, and an upgrade that can't be paid for", (assert) => {
    hand.stats = new Stats();
    drag("water", at(ROAD));
    hand.release(at(ROAD));
    build("fire", GRASS);
    state.wallet.gold = 0;
    tap(at(GRASS));
    hand.upgrade();

    assert.strictEqual(hand.stats.built, 1);
    assert.strictEqual(hand.stats.upgraded, 0);
  });
```

- **"Storage that can't be written to loses nothing for the game that is going, and does not throw"** is the test of a full storage; **"is one that keeps nothing if it can't be had, even if just asking for it throws"** is the one of a blocked page. They are the tests that would catch a game that stops working in a private window.
- **"The time is the time that the game was played: it does not go on when the game is over"** is the test that the clock stops when `advance` stops (it begins with `if (director.over) return`, and the clock is after it).

**Check:** open `tests.html`. 781 tests pass.

---

## Step 3: A minimap

The card for a map has a picture of it. There is no picture to load: the map is text, parsed into a grid, and a grid can be drawn at any size. So the card is drawn from the very thing that the game plays, and can't disagree with it.

Open `js/minimap.js` (the placeholder) and **replace the TODO line** with:

```js
// A map drawn small, for the card that chooses it: a square of color for each cell (grass, road, the two ends, and scenery)
// on a canvas. It is drawn from the same parsed map that the game is, so it can't disagree with it. See ../tests/minimap.tests.js.

const MINIMAP = {
  grass: "#5e9c3b",
  road: "#d3b078",
  start: "#e0482b",
  goal: "#f2c230",
  prop: "#2f5a22",
  edge: "#1d110b", // the line round the whole of it
};

// What a cell of a map looks like: "start", "goal", "road", "prop" or "grass".
function minimapCell(grid, col, row) {
  if (grid.start && grid.start.col === col && grid.start.row === row) return "start";
  if (grid.goal && grid.goal.col === col && grid.goal.row === row) return "goal";
  if (isRoad(grid, col, row)) return "road";
  if (propAt(grid, col, row)) return "prop";
  return "grass";
}

// Draws a map to fill a canvas context of `width` by `height` pixels, in cells as big as will fit (and square), in the middle.
function drawMinimap(context, grid, width, height) {
  const cell = Math.floor(Math.min(width / grid.cols, height / grid.rows));
  const left = Math.floor((width - cell * grid.cols) / 2);
  const top = Math.floor((height - cell * grid.rows) / 2);
  context.clearRect(0, 0, width, height);
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      context.fillStyle = MINIMAP[minimapCell(grid, col, row)];
      context.fillRect(left + col * cell, top + row * cell, cell, cell);
    }
  }
  context.strokeStyle = MINIMAP.edge;
  context.lineWidth = 2;
  context.strokeRect(left - 1, top - 1, cell * grid.cols + 2, cell * grid.rows + 2);
  return { cell, left, top };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MINIMAP, minimapCell, drawMinimap };
} else {
  Object.assign(window, { MINIMAP, minimapCell, drawMinimap });
}
```

Things to notice:

- **`minimapCell` says what a cell is, and `drawMinimap` only knows colors.** The question *is this the start, the goal, a road, a prop?* is answered by the functions of the map (`isRoad`, `propAt`) that the game already uses, in the same order that makes the start a start and not a road.
- **The cells are the biggest that fit, and square,** and the picture is centered in the space it has, so a wide map and a tall one both look right on a card of any shape. `drawMinimap` says where it put them, so that a test can look at a cell.
- **It is a plain function of a canvas context.** The page gives it a real one, and so does the test, which reads the pixels back.

Open `tests/minimap.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("minimapCell", () => {
  const grid = parseMap({ name: "t", rows: ["S#c.", "..#G"] });

  QUnit.test("says what each cell is", (assert) => {
    assert.strictEqual(minimapCell(grid, 0, 0), "start");
    assert.strictEqual(minimapCell(grid, 1, 0), "road");
    assert.strictEqual(minimapCell(grid, 2, 0), "prop");
    assert.strictEqual(minimapCell(grid, 3, 0), "grass");
    assert.strictEqual(minimapCell(grid, 3, 1), "goal");
    assert.strictEqual(minimapCell(grid, 2, 1), "road");
  });

  QUnit.test("the two ends are not roads, though a road is under them", (assert) => {
    assert.notStrictEqual(minimapCell(grid, 0, 0), "road");
    assert.notStrictEqual(minimapCell(grid, 3, 1), "road");
  });

  QUnit.test("every cell of both maps is one of the kinds that have a color", (assert) => {
    for (const map of MAPS) {
      const real = parseMap(map);
      for (let row = 0; row < real.rows; row++) for (let col = 0; col < real.cols; col++) assert.true(minimapCell(real, col, row) in MINIMAP, `${map.name} ${col},${row}`);
    }
  });
});

QUnit.module("drawMinimap", () => {
  const draw = (map, width = 140, height = 90) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const placed = drawMinimap(context, parseMap(map), width, height);
    const colorAt = (x, y) => {
      const [r, g, b] = context.getImageData(x, y, 1, 1).data;
      return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    };
    return { placed, colorAt };
  };
  const map = { name: "t", rows: ["S#.G", "..c."] };

  QUnit.test("the cells are as big as will fit, and square, in the middle", (assert) => {
    const { placed } = draw(map, 140, 90);

    assert.strictEqual(placed.cell, Math.floor(Math.min(140 / 4, 90 / 2)));
    assert.strictEqual(placed.left, Math.floor((140 - placed.cell * 4) / 2));
    assert.true(placed.top >= 0);
  });

  QUnit.test("each cell is its color: the road, the grass, the two ends and the scenery", (assert) => {
    const { placed, colorAt } = draw(map);
    const at = (col, row) => colorAt(placed.left + col * placed.cell + 4, placed.top + row * placed.cell + 4);

    assert.strictEqual(at(0, 0), MINIMAP.start);
    assert.strictEqual(at(1, 0), MINIMAP.road);
    assert.strictEqual(at(2, 0), MINIMAP.grass);
    assert.strictEqual(at(3, 0), MINIMAP.goal);
    assert.strictEqual(at(2, 1), MINIMAP.prop);
  });

  QUnit.test("a real map fits in the card that it is drawn on, and nothing is drawn outside it", (assert) => {
    for (const real of MAPS) {
      const { placed } = draw(real, 140, 90);
      const grid = parseMap(real);

      assert.true(placed.left >= 0 && placed.top >= 0, real.name);
      assert.true(placed.left + placed.cell * grid.cols <= 140 && placed.top + placed.cell * grid.rows <= 90, real.name);
      assert.true(placed.cell >= 4, `${real.name}: a cell is ${placed.cell} pixels`);
    }
  });

  QUnit.test("the two maps look different", (assert) => {
    const picture = (real) => {
      const canvas = document.createElement("canvas");
      canvas.width = 140;
      canvas.height = 90;
      const context = canvas.getContext("2d");
      drawMinimap(context, parseMap(real), 140, 90);
      return canvas.toDataURL();
    };

    assert.notStrictEqual(picture(MAPS[0]), picture(MAPS[1]));
  });
});
```

- **"A real map fits in the card that it is drawn on"** says that a cell is at least four pixels, so that a map made bigger in a later tutorial (the editor makes them) still draws as a picture and not a smear.

**Check:** open `tests.html`. 788 tests pass.

---

## Step 4: The screens

Three screens, and a button. They are made from empty elements of the page, like the tray and the panel: they have no game in them, they are told what to show, and they say when a button is pressed.

Open `js/screens.js` (the placeholder) and **replace the TODO line** with:

```js
// The screens that go over the game: the title, with a card for each map; the pause; and the result of a game won or lost,
// with its stars and numbers. They are made from a few empty elements of the page, have no game in them, and are told what to
// show: they say when a button is pressed. Starting a different map is a new page (the address says which map and whether to
// start at once), and `gameUrl` works that address out. See ../tests/screens.tests.js.

// The address of the game for a map, from the address now: `?map=1`, and `&go=1` to skip the title and begin at once.
function gameUrl(href, map, go = false) {
  const url = new URL(href);
  url.searchParams.set("map", String(map));
  if (go) url.searchParams.set("go", "1");
  else url.searchParams.delete("go");
  return url.toString();
}

// Three stars, as text: the ones earned, and the ones not (★★☆).
function starText(stars, total = 3) {
  return "★".repeat(stars) + "☆".repeat(total - stars);
}

class Screens {
  // `parts` is { title, pause, result, pauseButton }: the elements of the page that this fills in, and the ones it shows and
  // hides. `logo` is the address of the picture on the title. `records` says the best for each map.
  constructor(parts, document, maps, records, logo) {
    this.parts = parts;
    this.document = document;
    this.maps = maps;
    this.records = records;
    this.selected = 0;
    this.listeners = { play: [], resume: [], restart: [], menu: [], pause: [] };
    this.buildTitle(logo);
    this.buildPause();
    this.buildResult();
    // A press on a screen is for the screen, and is not for the board behind it.
    for (const part of [parts.title, parts.pause, parts.result, parts.pauseButton]) part.addEventListener("pointerup", (event) => event.stopPropagation());
    parts.pauseButton.addEventListener("click", () => this.say("pause"));
  }

  // Asks to be told when a button is pressed: on("play", (map) => ...), and "resume", "restart", "menu" and "pause".
  on(name, listener) {
    this.listeners[name].push(listener);
  }

  say(name, ...args) {
    this.listeners[name].forEach((listener) => listener(...args));
  }

  // A button with text, that says something when it is pressed.
  button(text, className, action) {
    const button = element(this.document, "button", className, text);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
  }

  buildTitle(logo) {
    const { title } = this.parts;
    const picture = element(this.document, "img", "logo");
    picture.src = logo;
    picture.alt = "Avatar: The Last Airbender Tower Defense";
    this.cards = this.maps.map((map, index) => {
      const card = element(this.document, "button", "map-card");
      card.type = "button";
      const canvas = element(this.document, "canvas", "minimap");
      canvas.width = 140;
      canvas.height = 90;
      drawMinimap(canvas.getContext("2d"), parseMap(map), canvas.width, canvas.height);
      const stars = element(this.document, "span", "stars");
      card.append(canvas, element(this.document, "span", "map-name", map.name), stars);
      card.addEventListener("click", () => this.selectMap(index));
      return { card, stars };
    });
    this.playButton = this.button("Play", "play", () => this.say("play", this.selected));
    const choices = element(this.document, "div", "map-cards");
    choices.append(...this.cards.map(({ card }) => card));
    title.append(
      picture,
      element(this.document, "h2", "", "Choose your battlefield"),
      choices,
      this.playButton,
      element(this.document, "p", "help", "Drag a podium from the tray onto the grass, then start the waves. Tap a tower to upgrade it.")
    );
    this.selectMap(0);
  }

  buildPause() {
    this.parts.pause.append(
      element(this.document, "h2", "", "Paused"),
      this.button("Resume", "play", () => this.say("resume")),
      this.button("Start again", "plain", () => this.say("restart")),
      this.button("Choose map", "plain", () => this.say("menu"))
    );
  }

  buildResult() {
    this.resultTitle = element(this.document, "h2");
    this.resultText = element(this.document, "p", "result-text");
    this.resultStars = element(this.document, "div", "result-stars");
    this.resultRows = element(this.document, "dl", "result-rows");
    this.resultRecord = element(this.document, "p", "record");
    this.parts.result.append(
      this.resultTitle,
      this.resultStars,
      this.resultText,
      this.resultRows,
      this.resultRecord,
      this.button("Play again", "play", () => this.say("restart")),
      this.button("Choose map", "plain", () => this.say("menu"))
    );
  }

  // Marks the map that will be played, and shows the stars that it has been given before.
  selectMap(index) {
    this.selected = index;
    this.cards.forEach(({ card, stars }, i) => {
      card.classList.toggle("selected", i === index);
      stars.textContent = starText(this.records.get(this.maps[i].name).stars);
    });
  }

  // Shows the screen for a state of the flow, and hides the others. The button to pause is there while the game is going.
  show(state) {
    this.parts.title.hidden = state !== "title";
    this.parts.pause.hidden = state !== "paused";
    this.parts.result.hidden = state !== "won" && state !== "lost";
    this.parts.pauseButton.hidden = state !== "playing";
    if (state === "title") this.selectMap(this.selected);
  }

  // Fills in the result screen: { result, stars, rows, improved }. `rows` are [label, value] pairs.
  showResult({ result, stars, rows, improved }) {
    this.parts.result.dataset.result = result;
    this.resultTitle.textContent = RESULTS[result].title;
    this.resultText.textContent = RESULTS[result].text;
    this.resultStars.textContent = result === "won" ? starText(stars) : "";
    this.resultRows.replaceChildren(...rows.flatMap(([label, value]) => [element(this.document, "dt", "", label), element(this.document, "dd", "", value)]));
    this.resultRecord.textContent = improved ? "A new best on this map!" : "";
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { gameUrl, starText, Screens };
} else {
  Object.assign(window, { gameUrl, starText, Screens });
}
```

Things to notice:

- **`gameUrl` is how a map is chosen, and it is a function.** The address of the game for a map is the address now with `map=` replaced, and `go=1` if the game is to begin at once (a game that is started again, or a map that was chosen on the title, skips the title on the new page). It keeps anything else in the address, so that a later tutorial's `?dev` still works.
- **The title is built from the list of maps.** A card for each, with its name, its picture and its stars. A third map is a line in `MAPS` and appears on the title with nothing else changed.
- **`on(name, listener)` is how it says what was pressed.** `play` says *which map* is chosen, and the other four say only that they were pressed. Who does what is the game's: the screens know nothing of the director or the page.
- **`show(state)` is the one place that says what is hidden.** It is told the state of the flow, and shows the one screen for it. The button that pauses is there only while the game is going.
- **A pointer let go on a screen stops there** (`stopPropagation`). The game listens for a pointer let go *anywhere*, and a press on the Resume button would be taken for a tap on the cell behind it.
- **`showResult` replaces what was there:** a result is a title, stars, a line for each number and, for a best, a note.

Its style:

```css
/* The screens over the game: the title with a card for each map, the pause, and the result. Each is a card in the middle of a
   dim layer that covers the board, so that nothing behind it can be pressed. They are above the readouts and the tray, and under
   the splash and the back button. */
.screen {
  position: fixed;
  inset: 0;
  z-index: 24;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
  background: rgba(20, 40, 70, 0.55);
  color: var(--ink);
  text-align: center;
}
#title-screen {
  background: linear-gradient(to bottom, rgba(95, 176, 238, 0.92), rgba(185, 222, 247, 0.92));
}
.screen[hidden] {
  display: none;
}
.screen h2 {
  margin: 0;
  font: 700 clamp(22px, 5vw, 34px) / 1.1 var(--title-font);
  text-shadow: 0 2px 0 rgba(255, 255, 255, 0.5);
}
#pause-screen,
#result-screen {
  gap: 14px;
}
#pause-screen > *,
#result-screen > * {
  max-width: 360px;
}

/* The title: the logo, the cards, and a line of help. */
#title-screen .logo {
  max-width: min(78vw, 420px);
  max-height: 24vh;
  object-fit: contain;
  border: 4px solid var(--ink);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(20, 40, 70, 0.45);
}
.map-cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}
.map-card {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 10px;
  background: #fff7e0;
  color: var(--ink);
  border: 4px solid var(--ink);
  border-radius: 12px;
  cursor: pointer;
  font: 700 16px / 1.1 var(--title-font);
  touch-action: manipulation;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.map-card:hover {
  transform: translateY(-3px);
}
.map-card.selected {
  box-shadow: 0 0 0 5px var(--gold), 0 8px 18px rgba(20, 40, 70, 0.4);
}
.map-card .minimap {
  width: 140px;
  height: 90px;
  background: var(--parchment);
  border-radius: 4px;
}
.map-card .stars,
.result-stars {
  color: var(--gold);
  letter-spacing: 0.1em;
  text-shadow: 0 1px 0 var(--ink);
}
.result-stars {
  font-size: 44px;
  line-height: 1;
}
.help {
  margin: 0;
  max-width: 420px;
  font: 700 15px / 1.3 var(--small-font);
}

/* The buttons of the screens: a red one for what to do, and a plain one for the rest. */
.screen button.play,
.screen button.plain {
  padding: 12px 28px;
  border: 3px solid var(--ink);
  border-radius: 10px;
  font: 700 20px / 1 var(--title-font);
  letter-spacing: 0.04em;
  cursor: pointer;
  touch-action: manipulation;
}
.screen button.play {
  background: var(--banner);
  color: #fff;
}
.screen button.play:hover {
  background: var(--banner-dark);
}
.screen button.plain {
  background: var(--parchment);
  color: var(--ink);
}
.screen button.plain:hover {
  background: var(--parchment-dark);
}

/* The pause and the result are cards. */
#pause-screen,
#result-screen {
  padding: 24px;
}
#pause-screen h2,
#result-screen h2 {
  color: #fff;
  text-shadow: 0 3px 0 var(--ink), 0 0 12px rgba(0, 0, 0, 0.5);
}
#result-screen[data-result="won"] h2 {
  color: #ffd35a;
}
#result-screen[data-result="lost"] h2 {
  color: #ff9a8a;
}
.result-text {
  color: #fff;
  text-shadow: 0 1px 0 var(--ink);
}
.result-text,
.record {
  margin: 0;
  font: 700 16px / 1.3 var(--small-font);
}
.record {
  color: #ffd35a;
  text-shadow: 0 1px 0 var(--ink);
}
.result-rows {
  display: grid;
  grid-template-columns: auto auto;
  gap: 4px 24px;
  margin: 0;
  padding: 12px 20px;
  background: var(--parchment);
  border: 3px solid var(--ink);
  border-radius: 10px;
  font: 700 16px / 1.2 var(--small-font);
  text-align: left;
}
.result-rows dd {
  margin: 0;
  text-align: right;
}

/* The button that pauses, under the hint at the top on the right. */
#pause-button {
  position: fixed;
  top: 52px;
  right: 12px;
  z-index: 12;
  padding: 8px 14px;
  background: var(--parchment);
  color: var(--ink);
  border: 3px solid var(--ink);
  border-radius: 10px;
  font: 700 15px / 1 var(--small-font);
  cursor: pointer;
  touch-action: manipulation;
}
#pause-button[hidden] {
  display: none;
}

@media (max-width: 640px), (max-height: 520px) {
  #title-screen .logo {
    max-height: 18vh;
  }
  .map-card .minimap {
    width: 110px;
    height: 70px;
  }
  .screen button.play,
  .screen button.plain {
    padding: 10px 22px;
    font-size: 17px;
  }
  #pause-button {
    top: 8px;
    right: 8px;
  }
  .result-stars {
    font-size: 34px;
  }
}
```

and its tests:

```js
QUnit.module("gameUrl", () => {
  QUnit.test("says which map, and keeps the rest of the address", (assert) => {
    assert.strictEqual(gameUrl("http://localhost:3000/samples/x/index.html", 1), "http://localhost:3000/samples/x/index.html?map=1");
  });

  QUnit.test("asks to begin at once, if it is told to", (assert) => {
    const url = new URL(gameUrl("http://localhost/a/index.html", 0, true));

    assert.strictEqual(url.searchParams.get("map"), "0");
    assert.strictEqual(url.searchParams.get("go"), "1");
  });

  QUnit.test("a map that is not the one that was there replaces it, and a go that was there goes if it isn't asked for", (assert) => {
    const url = new URL(gameUrl("http://localhost/a/index.html?map=1&go=1&dev=1", 0));

    assert.strictEqual(url.searchParams.get("map"), "0");
    assert.false(url.searchParams.has("go"));
    assert.strictEqual(url.searchParams.get("dev"), "1", "and what else was asked for stays");
  });
});

QUnit.module("starText", () => {
  QUnit.test("is the stars that are earned and the ones that are not, three in all", (assert) => {
    assert.strictEqual(starText(0), "☆☆☆");
    assert.strictEqual(starText(2), "★★☆");
    assert.strictEqual(starText(3), "★★★");
  });
});

QUnit.module("Screens", (hooks) => {
  let parts, screens, records, heard;
  const maps = [
    { name: "First", rows: ["S##G"] },
    { name: "Second", rows: ["S.#G", "..#."] },
  ];
  hooks.beforeEach(() => {
    const fixture = document.getElementById("qunit-fixture");
    const make = (tag, hidden = false) => {
      const node = fixture.appendChild(document.createElement(tag));
      node.hidden = hidden;
      return node;
    };
    parts = { title: make("div"), pause: make("div", true), result: make("div", true), pauseButton: make("button", true) };
    const storage = { data: {}, getItem(key) { return this.data[key] ?? null; }, setItem(key, value) { this.data[key] = value; } };
    records = new Records(storage);
    screens = new Screens(parts, document, maps, records, "logo.webp");
    heard = [];
    for (const name of ["play", "resume", "restart", "menu", "pause"]) screens.on(name, (...args) => heard.push([name, ...args]));
  });

  const buttons = (part, text) => [...part.querySelectorAll("button")].find((button) => button.textContent === text);

  QUnit.test("the title has the logo, a card for each map with its picture and name, and a play button", (assert) => {
    assert.strictEqual(parts.title.querySelector("img").getAttribute("src"), "logo.webp");
    const cards = parts.title.querySelectorAll(".map-card");

    assert.strictEqual(cards.length, 2);
    assert.strictEqual(cards[1].querySelector(".map-name").textContent, "Second");
    assert.strictEqual(cards[0].querySelector("canvas").width, 140);
    assert.true(!!buttons(parts.title, "Play"));
  });

  QUnit.test("the first map is chosen, and tapping a card chooses it, and only that one is marked", (assert) => {
    const cards = [...parts.title.querySelectorAll(".map-card")];
    assert.deepEqual(cards.map((card) => card.classList.contains("selected")), [true, false]);
    cards[1].click();

    assert.strictEqual(screens.selected, 1);
    assert.deepEqual(cards.map((card) => card.classList.contains("selected")), [false, true]);
  });

  QUnit.test("play says which map is chosen", (assert) => {
    buttons(parts.title, "Play").click();
    parts.title.querySelectorAll(".map-card")[1].click();
    buttons(parts.title, "Play").click();

    assert.deepEqual(heard, [["play", 0], ["play", 1]]);
  });

  QUnit.test("a card shows the stars that the map has earned, from the record", (assert) => {
    records.update("Second", { stars: 2, wave: 10 });
    screens.selectMap(0);
    const stars = [...parts.title.querySelectorAll(".stars")].map((node) => node.textContent);

    assert.deepEqual(stars, ["☆☆☆", "★★☆"]);
  });

  QUnit.test("each state shows its own screen, and the others are hidden", (assert) => {
    const shown = () => [parts.title, parts.pause, parts.result, parts.pauseButton].map((part) => !part.hidden);
    screens.show("title");
    assert.deepEqual(shown(), [true, false, false, false]);
    screens.show("playing");
    assert.deepEqual(shown(), [false, false, false, true], "only the button to pause");
    screens.show("paused");
    assert.deepEqual(shown(), [false, true, false, false]);
    screens.show("won");
    assert.deepEqual(shown(), [false, false, true, false]);
    screens.show("lost");
    assert.deepEqual(shown(), [false, false, true, false]);
  });

  QUnit.test("the pause screen has a button to go on, to start again and to choose a map, and each says so", (assert) => {
    buttons(parts.pause, "Resume").click();
    buttons(parts.pause, "Start again").click();
    buttons(parts.pause, "Choose map").click();

    assert.deepEqual(heard.map((entry) => entry[0]), ["resume", "restart", "menu"]);
  });

  QUnit.test("the button that pauses says so", (assert) => {
    parts.pauseButton.click();

    assert.deepEqual(heard, [["pause"]]);
  });

  QUnit.test("a win shows its title, its stars, and a line for each number", (assert) => {
    screens.showResult({ result: "won", stars: 3, rows: [["Waves", "10 of 10"], ["Lives left", "20"]], improved: false });

    assert.strictEqual(parts.result.querySelector("h2").textContent, RESULTS.won.title);
    assert.strictEqual(parts.result.querySelector(".result-stars").textContent, "★★★");
    assert.deepEqual([...parts.result.querySelectorAll("dt")].map((n) => n.textContent), ["Waves", "Lives left"]);
    assert.deepEqual([...parts.result.querySelectorAll("dd")].map((n) => n.textContent), ["10 of 10", "20"]);
    assert.strictEqual(parts.result.dataset.result, "won");
    assert.strictEqual(parts.result.querySelector(".record").textContent, "");
  });

  QUnit.test("a loss shows no stars and a different title, and a new best says so", (assert) => {
    screens.showResult({ result: "lost", stars: 0, rows: [], improved: true });

    assert.strictEqual(parts.result.querySelector("h2").textContent, RESULTS.lost.title);
    assert.strictEqual(parts.result.querySelector(".result-stars").textContent, "");
    assert.strictEqual(parts.result.querySelector(".record").textContent, "A new best on this map!");
  });

  QUnit.test("a second result replaces the first: its lines do not pile up", (assert) => {
    screens.showResult({ result: "won", stars: 1, rows: [["A", "1"], ["B", "2"]], improved: false });
    screens.showResult({ result: "lost", stars: 0, rows: [["C", "3"]], improved: false });

    assert.strictEqual(parts.result.querySelectorAll("dt").length, 1);
  });

  QUnit.test("the result has buttons to play again and to choose a map", (assert) => {
    buttons(parts.result, "Play again").click();
    buttons(parts.result, "Choose map").click();

    assert.deepEqual(heard.map((entry) => entry[0]), ["restart", "menu"]);
  });

  QUnit.test("a pointer let go on any screen does not go on to the board, where the game would take it for a tap on a cell", (assert) => {
    let reached = 0;
    document.getElementById("qunit-fixture").addEventListener("pointerup", () => reached++);
    for (const part of [parts.title, parts.pause, parts.result, parts.pauseButton]) part.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

    assert.strictEqual(reached, 0);
  });
});
```

- **"Each state shows its own screen, and the others are hidden"** goes through every state and says which screens are showing: the one test that would notice a pause that leaves the title up.
- **"A pointer let go on any screen does not go on to the board"** is the test of the line above.

The result is a screen now, so the readout of the game loses its banner. The comment at the top, and what a `Hud` is made from:

In `js/hud.js`, **replace** lines 1 to 3:

```js
// The readouts of a game of waves: the lives, which wave it is and how long until the next, a button to
// start the next one early, and a banner for when the game is won or lost. Like the tray, it is made from a page,
// has no game in it, and is told what to show. See ../tests/hud.tests.js.
```

with:

```js
// The readouts of a game of waves: the lives, which wave it is and how long until the next, and a button to
// start the next one early. Like the tray, it is made from a page, has no game in it, and is told what to show. See ../tests/hud.tests.js.
```

In `js/hud.js`, **replace** lines 12 to 19:

```js
// What the banner says when the game is over.
const BANNERS = {
  won: { title: "The island is safe!", text: "Every wave has been beaten." },
  lost: { title: "The island has fallen", text: "Too many got through." },
};

class Hud {
  // `parts` is { lives, wave, next, banner, title, text, again }: the elements of the page that this fills in.
```

with:

```js
class Hud {
  // `parts` is { lives, wave, next }: the elements of the page that this fills in.
```

In `js/hud.js`, **replace** lines 17 to 25:

```js
    this.restarted = [];
    // A press on one of these buttons is for the button, and is not for the board behind it: the game listens for
    // a pointer let go anywhere, and would take it for a tap on a cell.
    for (const button of [parts.next, parts.again]) button.addEventListener("pointerup", (event) => event.stopPropagation());
    parts.next.addEventListener("click", () => this.started.forEach((listener) => listener()));
    parts.again.addEventListener("click", () => this.restarted.forEach((listener) => listener()));
  }

  // Asks to be told when the button for the next wave is pressed, and when the game is to be played again.
```

with:

```js
    // A press on the button is for the button, and is not for the board behind it: the game listens for
    // a pointer let go anywhere, and would take it for a tap on a cell.
    parts.next.addEventListener("pointerup", (event) => event.stopPropagation());
    parts.next.addEventListener("click", () => this.started.forEach((listener) => listener()));
  }

  // Asks to be told when the button for the next wave is pressed.
```

In `js/hud.js`, **delete** lines 28 to 31:

```js
  onAgain(listener) {
    this.restarted.push(listener);
  }

```

In `js/hud.js`, **delete** lines 39 to 48:

```js

  // Shows the banner for a game that is won or lost, or hides it.
  banner(kind) {
    const shown = kind in BANNERS;
    this.parts.banner.hidden = !shown;
    if (!shown) return;
    this.parts.title.textContent = BANNERS[kind].title;
    this.parts.text.textContent = BANNERS[kind].text;
    this.parts.banner.dataset.result = kind;
  }
```

In `js/hud.js`, **replace** lines 45 to 47:

```js
  module.exports = { waveText, BANNERS, Hud };
} else {
  Object.assign(window, { waveText, BANNERS, Hud });
```

with:

```js
  module.exports = { waveText, Hud };
} else {
  Object.assign(window, { waveText, Hud });
```

and its style, and its tests:

In `css/hud.css`, **replace** lines 1 to 3:

```css
/* The readouts of a game of waves: lives and the wave, at the top on the left, a button to start the next wave early,
   and a banner for the end. Nothing here is over the middle of the board except the banner, and that is only there
   when the game is over. */
```

with:

```css
/* The readouts of a game of waves: lives and the wave, at the top on the left, and a button to start the next wave early.
   Nothing here is over the middle of the board. */
```

In `css/hud.css`, **replace** lines 36 to 37:

```css
#next-wave,
#again {
```

with:

```css
#next-wave {
```

In `css/hud.css`, **replace** lines 47 to 48:

```css
#next-wave:hover,
#again:hover {
```

with:

```css
#next-wave:hover {
```

In `css/hud.css`, **delete** lines 57 to 87:

```css
#banner {
  position: fixed;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  z-index: 25;
  width: min(420px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 24px 28px;
  text-align: center;
  background: var(--parchment);
  color: var(--ink);
  border: 4px solid var(--ink);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(20, 40, 70, 0.5);
}
#banner[data-result="won"] {
  border-color: var(--gold);
}
#banner[data-result="lost"] {
  border-color: var(--banner);
}
#banner h2 {
  margin: 0 0 8px;
  font: 700 28px / 1.1 var(--title-font);
}
#banner p {
  margin: 0 0 18px;
  font: 700 16px / 1.3 var(--small-font);
}

```

In `tests/hud.tests.js`, **replace** line 23:

```js
    parts = { lives: make("span"), wave: make("span"), next: make("button"), banner: make("div"), title: make("h2"), text: make("p"), again: make("button") };
```

with:

```js
    parts = { lives: make("span"), wave: make("span"), next: make("button") };
```

In `tests/hud.tests.js`, **replace** lines 69 to 77:

```js
  QUnit.test("pressing play again says so", (assert) => {
    let count = 0;
    hud.onAgain(() => count++);
    parts.again.click();

    assert.strictEqual(count, 1);
  });

  QUnit.test("a pointer let go on either button does not go on to the page, where the game would take it for a tap on a cell", (assert) => {
```

with:

```js
  QUnit.test("a pointer let go on the button does not go on to the page, where the game would take it for a tap on a cell", (assert) => {
```

In `tests/hud.tests.js`, **delete** line 74:

```js
    parts.again.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
```

In `tests/hud.tests.js`, **delete** lines 79 to 98:

```js

  QUnit.test("the banner is hidden until it is asked for, and then says the title and the text of the result", (assert) => {
    hud.banner(null);
    assert.true(parts.banner.hidden);
    hud.banner("won");

    assert.false(parts.banner.hidden);
    assert.strictEqual(parts.title.textContent, BANNERS.won.title);
    assert.strictEqual(parts.text.textContent, BANNERS.won.text);
    assert.strictEqual(parts.banner.dataset.result, "won");
  });

  QUnit.test("a loss says something different, and the banner can be hidden again", (assert) => {
    hud.banner("lost");
    assert.strictEqual(parts.title.textContent, BANNERS.lost.title);
    assert.notStrictEqual(BANNERS.lost.title, BANNERS.won.title);
    hud.banner(null);

    assert.true(parts.banner.hidden);
  });
```

- **What the banner said is `RESULTS`, in `stats.js`,** which is where the result screen reads it.

**Check:** open `tests.html`. 801 tests pass.

---

## Step 5: The game

`main.js` puts the screens in the game. First what it is made from: the address says which map, and whether to skip the title, and the game has a flow, the numbers of this game and the records:

In `js/main.js`, **replace** lines 14 to 16:

```js
// Which map to play: the first, unless the address says `?map=1` (or 2, and so on, round the list).
const mapNumber = Number(new URLSearchParams(window.location.search).get("map")) || 0;
const map = MAPS[mapNumber % MAPS.length];
```

with:

```js
// Which map to play: the first, unless the address says `?map=1` (or 2, and so on, round the list). An address with `go=1` skips the
// title and begins at once, which is how a game is started again, or a different map is chosen.
const params = new URLSearchParams(window.location.search);
const mapNumber = (Number(params.get("map")) || 0) % MAPS.length;
const map = MAPS[mapNumber];

// Which screen the game is on, and the numbers of this game, and the best that the player has done (if the browser lets it be kept).
const flow = new Flow();
const stats = new Stats();
const records = new Records(safeStorage(window));
```

The hand is given the stats to count into:

In `js/main.js`, after line 92, add:

```js
    stats,
```

and it listens only while the game is going. The title, the pause and the result are over the board, and a tray that was pressed under a pause must not pick up a podium:

In `js/main.js`, **replace** lines 101 to 112:

```js
  tray.onPress((kind, point) => hand.press(kind, point));
  panel.onUpgrade(() => hand.upgrade());
  panel.onSell(() => hand.sell());
  window.addEventListener("pointermove", (event) => hand.move(event));
  window.addEventListener("pointerup", (event) => hand.release(event));
  window.addEventListener("pointercancel", () => hand.cancel());
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hand.cancel();
  });

  
  // The rules, and what shows them. The wave button starts the next wave early, and Play again starts the whole game again.
```

with:

```js
  // The hand only listens while the game is going: the title, the pause and the result are over the board.
  tray.onPress((kind, point) => flow.running && hand.press(kind, point));
  panel.onUpgrade(() => flow.running && hand.upgrade());
  panel.onSell(() => flow.running && hand.sell());
  window.addEventListener("pointermove", (event) => flow.running && hand.move(event));
  window.addEventListener("pointerup", (event) => flow.running && hand.release(event));
  window.addEventListener("pointercancel", () => hand.cancel());

  
  // The rules, and what shows them. The wave button starts the next wave early.
```

Then the screens and what they say. The map is chosen by the address, a screen's buttons are wired to the flow or to a new page, and the flow tells the screens what to show (and, when a game ends, works out what it came to and puts it on the record):

In `js/main.js`, **replace** lines 116 to 122:

```js
    banner: document.getElementById("banner"),
    title: document.getElementById("banner-title"),
    text: document.getElementById("banner-text"),
    again: document.getElementById("again"),
  });
  hud.onStartWave(() => director.callNext());
  hud.onAgain(() => window.location.reload());
```

with:

```js
  });
  hud.onStartWave(() => flow.running && director.callNext());

  // The screens. A different map, or a game again, is a new page, from the address.
  const screens = new Screens(
    {
      title: document.getElementById("title-screen"),
      pause: document.getElementById("pause-screen"),
      result: document.getElementById("result-screen"),
      pauseButton: document.getElementById("pause-button"),
    },
    document,
    MAPS,
    records,
    "../assets/images/tower_defense_logo_small.webp"
  );
  screens.selectMap(mapNumber);
  const goTo = (number, go) => window.location.assign(gameUrl(window.location.href, number, go));
  screens.on("play", (number) => (number === mapNumber ? flow.start() : goTo(number, true)));
  screens.on("resume", () => flow.resume());
  screens.on("pause", () => flow.pause());
  screens.on("restart", () => goTo(mapNumber, true));
  screens.on("menu", () => goTo(mapNumber, false));

  // Whatever the screen is, it is shown; and when the game ends, what it came to is worked out and put on the record.
  flow.onChange((now) => {
    scene.animationsEnabled = flow.running; // the enemies' walk and the benders' moves stop when the game does
    if (flow.over) {
      const total = director.waves.length;
      const stars = starsFor(now, director.lives, RULES.lives);
      const wave = now === "won" ? total : director.number;
      const improved = records.update(map.name, { stars, wave });
      screens.showResult({ result: now, stars, rows: summarize(stats, { wave, total, lives: director.lives, gold: state.wallet.earned }), improved });
    }
    if (!flow.running) hand.cancel();
    screens.show(now);
  });
  screens.show(flow.state);
  if (params.get("go")) flow.start();

  // P, and Escape when there is nothing in the hand to put down, pause and resume. So does leaving the page.
  window.addEventListener("keydown", (event) => {
    if (event.key === "p" || event.key === "P") flow.toggle();
    if (event.key === "Escape") {
      if (flow.running && (hand.builder.holding || hand.selected)) hand.cancel();
      else flow.toggle();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flow.pause();
  });
```

Things to notice:

- **`play` on the map that is already there just starts the game.** On another map it is a new page with `go=1`. The page loads the models, the scene is built, and then it begins; the player sees the splash, and then the game, and not the title again.
- **`scene.animationsEnabled` is how a pause stops the walking.** The scene has a clock for animations that the game's `advance` does not drive, so stopping `advance` is not enough: the enemies would go on swinging their arms in place. This is one line, and the one that is easy to forget.
- **A pause puts down what is in the hand** (`hand.cancel()`), so that a podium that was being carried is not left on the board over a paused game.
- **Escape does the nearer thing.** If there is a podium in the hand, or a tower chosen, it puts that down; if not, it pauses. P always pauses.
- **Leaving the page pauses it** (`visibilitychange`). A player who switches to another tab comes back to a game that is waiting, and not to one that has been lost.
- **The result is worked out where the game ends,** in the flow's listener: the stars from the lives that were left, the wave that it got to, the rows, and whether it is a best. The screens are only given them.

The stats are given to the world, so that the frame of the game keeps them:

In `js/main.js`, after line 175, add:

```js
    stats,
```

the end of the game is the flow's, and not a banner's:

In `js/main.js`, **replace** line 182:

```js
    ended: (result) => hud.banner(result),
```

with:

```js
    ended: (result) => flow.finish(result),
```

and the frame is only advanced while the game is going (the readouts, the clouds and the markers go on, so that the title has a living board behind it):

In `js/main.js`, **replace** lines 189 to 191:

```js
    advance(world, dt);
    hud.show({ lives: director.lives, phase: director.phase, number: Math.min(director.number, director.waves.length), total: director.waves.length, countdown: director.countdown });
    hand.update(dt);
```

with:

```js
    if (flow.running) {
      advance(world, dt);
      hand.update(dt);
    }
    hud.show({ lives: director.lives, phase: director.phase, number: Math.min(director.number, director.waves.length), total: director.waves.length, countdown: director.countdown });
```

**Check:** open `tests.html`. 801 tests pass. Then open `index.html` through the web server. The title comes up over the board, with a card for each map. Choose the second, press Play, and the page loads again and the game begins at once. Press the Pause button, or P: the board dims and everything stops, enemies in mid-stride. Resume. Lose a game (build nothing and start the waves) and the result comes up with its numbers, and on a game that you win, its stars. Reload the page: the title shows the stars that you earned.

---

## Step 6: Try it

Things to look for, and things to change. Change one, save, and refresh.

- **A harder three stars.** Change `threeStars` in `RATING` to `1`: only a game with every life left earns three. The test of the stars says where the lines are.
- **A third map.** Add a map to `MAPS` (copy one, and move a piece of road). It is on the title, with its picture, and the tests that check every map check it.
- **Clear the records.** In the browser's console, `localStorage.removeItem("tower_defense_records")`, and reload: no stars.
- **Block storage.** In a private window, or with the site's storage blocked, the game plays and has no stars, and there is no error in the console.
- **A longer pause.** Pause, and wait a minute, and resume: the *time* on the result is the time played, and does not count the pause.
- **Switch tabs.** Start a wave, go to another tab and come back: the game is paused.
- **No pause button on a phone.** Make the window narrow: the button moves to the corner, and the cards get smaller.

---

## Troubleshooting

- **The splash never goes and the console says `Flow is not defined`, `Screens is not defined` or `safeStorage is not defined`:** the new file is missing from `index.html`, or has no export block, or the name is missing from it.
- **`Cannot read properties of null (reading 'addEventListener')` at the start:** `main.js` is still looking for the banner. Step 5 replaces that code, and `index.html` has no banner.
- **The title never goes away:** `flow.start()` is not called by the `play` event, or the screens' `show` is not told the new state (the listener of `flow.onChange`).
- **The game goes on behind the pause:** `advance` is not inside `if (flow.running)`. And if the *enemies' arms* move but they don't walk: `scene.animationsEnabled` is not set.
- **A press on Resume puts a tower down behind it:** the screen's `pointerup` handlers don't stop the event, or the hand's listeners don't check `flow.running`.
- **There are no stars on the cards after a win:** `records.update` isn't called when the game ends, or the name that it is given is not the same as the name on the card (they are both `map.name`).
- **The game runs at double speed, or goes on behind the pause:** the old `advance(world, dt);` and `hud.show(...)` lines are still above the new `if (flow.running)` block. The last change of Step 5 *replaces* them: the frame has one `advance`, inside the `if`, and one `hud.show`, after it.
- **`Cannot read properties of undefined (reading 'count')` or the result says 0 enemies defeated:** `stats` is not in the world (`world.stats`), or the hand wasn't given it.
- **`Cannot read properties of undefined (reading 'addEventListener')` in the tests of the hud:** `Hud` still looks for `parts.again`. Step 4 takes the banner and the Play again button out of it.
- **The result says 0 waves:** `wave` is the number of the wave that is on, and a game that is won is all of them.
- **`SecurityError` or a blank page in a private window:** `Records` was given `window.localStorage` directly: it has to be `safeStorage(window)`.

---

## What you have

A game with a front and a back: a title with a picture and stars for each map, a pause that stops everything, a result that says what happened, a best that is remembered, all of it behind a flow of five states, with a test suite of 801 tests.

**Next up:** polish. The [next tutorial](../tower_defense_polish/TUTORIAL.md) gives the game its finishing touches: a **speed button**, a limit to how many enemies are drawn, a **detail setting** for slower devices, and a `?dev` panel for tuning.
