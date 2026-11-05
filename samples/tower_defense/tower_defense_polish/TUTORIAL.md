# Tutorial: Tower Defense Polish -- Speed, Limits, Detail, Sound and a Dev Panel

This is the tenth tutorial in the Tower Defense series. The game is complete: it has a title, a pause and a result. This tutorial is for what makes it good to *play* for someone who isn't you: a **speed button** for the player who has built and is waiting for the wave, a **limit** to how many enemies can be on the board so that a big wave can't be too much for a phone, a **detail setting** that is remembered and that the game lowers by itself when it is running slowly, **sound** (effects made in code, and three tracks of music that change with the game), and a **dev panel** (`?dev`) of sliders for tuning the numbers of the game while you play it. You write the code; this document tells you what to write and why.

By the end you'll have:

- **A speed**: ×1, ×2 and ×3, made by taking more steps of the game in a frame and never a longer step
- **A limit**: a table of the most that there may be of anything, and enemies that wait for room
- **A detail setting**: low, medium and high, in a table; a choice that is kept; and a meter of frames that lowers the detail of a game that is running slowly
- **Sound effects**, made in code from a table of recipes, each a few notes, tested by rendering them into numbers
- **Music**: three tracks streamed from files, one for the title and the end, one for building and one for a wave, with a crossfade between them
- **The settings in the game**: a speed button, and the detail and the sound on the pause screen, remembered
- **A dev panel**: one table of numbers, one slider for each, that change the very numbers that the game reads
- Unit tests for all of it: **907 passing tests**, 106 of them new

**What you'll learn:** why a faster game is more steps and not longer ones, how a limit that is a table can be tested against the game that it limits, how to decide a game is *slow* without being fooled by one long frame, what to do when your own default (on this device) is a guess, how to make a sound from nothing and test that it is heard, how a browser's rule that a page may not make a noise until it has been touched shapes the code, how to crossfade streamed music, and how to build a tuning panel from a table so that adding a number is a line.

**Before you start:** do the [Screens tutorial](../tower_defense_screens/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Screens sample, plus placeholders for the new files:

```
tower_defense_polish/
├── index.html, tests.html   (already list the new scripts, and the page has the speed button and the dev panel in it)
├── css/
│   ├── dev.css               (placeholder -- Step 7)
│   └── screens.css           (a change -- Step 6)
├── js/
│   ├── speed.js              (placeholder -- Step 1)
│   ├── detail.js             (placeholder -- Step 3)
│   ├── audio.js              (placeholder -- Step 4)
│   ├── music.js              (placeholder -- Step 5)
│   ├── dev.js                (placeholder -- Step 7)
│   ├── battle.js             (changes -- Steps 2 and 6)
│   ├── sky.js                (a change -- Step 3)
│   ├── screens.js, hand.js, main.js   (changes -- Step 6; main.js again in Step 7)
│   └── everything else, from the Screens sample
└── tests/
    ├── speed.tests.js        (placeholder -- Step 1)
    ├── detail.tests.js       (placeholder -- Step 3)
    ├── audio.tests.js        (placeholder -- Step 4)
    ├── music.tests.js        (placeholder -- Step 5)
    ├── dev.tests.js          (placeholder -- Step 7)
    ├── battle, balance, sky, screens and hand tests   (additions)
    └── everything else, from the Screens sample
```

Open `tests.html` before you change anything, through the web server. You should see **801 passing tests**, the Screens sample's.

### Serving the page

Like the earlier samples, this one loads models from files, so it needs a web server. In the repo's root folder run `npx serve` and open `http://localhost:3000/samples/tower_defense/tower_defense_polish/` (the command prints the exact address), or use the *Live Server* extension in VS Code.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the tutorial

1. **Speed**: a faster game.
2. **Limits**: the most that there may be.
3. **Detail**: how much to draw, and when to draw less.
4. **Sound effects**: recipes, and how to hear that they work.
5. **Music**: three tracks, one at a time.
6. **In the game**: the buttons, and what the game hears.
7. **The dev panel**: sliders from a table.

---

## Step 1: Speed

A player who has built everything they can afford and is waiting for the wave would like it to come faster, and so would anyone who has played the first four waves a few times. The way to make a game faster is *not* to make a step of the game longer. The whole of the game is written for steps of a fiftieth of a second at the longest: a bolt that flies nine units a second takes a step of a hundredth of a second to go less than its own width, and one of a whole second would go clean through the enemy it was thrown at. So a game at twice the speed takes **twice as many steps** in a frame, and each is as short as it ever was.

Open `js/speed.js` (the placeholder) and **replace the TODO line** with:

```js
// The speed of the game: a button that makes it go twice as fast, or three times, for a player who has built and is waiting
// for the wave. Time goes faster by taking more steps of the game in a frame, and not by taking a longer step: a step that is
// too long would let an enemy walk through a bolt, so every step is at most as long as it always was. See ../tests/speed.tests.js.

const SPEEDS = [1, 2, 3]; // the speeds that the button goes through, as how many times as fast as usual
const MAX_STEP = 0.05; // the longest step of the game, in seconds

// Cuts `seconds` of the game's time into steps that are none longer than `maxStep` and that are all the same.
function stepsOf(seconds, maxStep = MAX_STEP) {
  if (seconds <= 0) return [];
  const count = Math.ceil(seconds / maxStep - 1e-9);
  return Array.from({ length: count }, () => seconds / count);
}

class GameSpeed {
  constructor(speeds = SPEEDS) {
    this.speeds = speeds;
    this.index = 0;
  }

  // How many times as fast as usual it is now.
  get value() {
    return this.speeds[this.index];
  }

  // What the button says: ×2.
  get label() {
    return `×${this.value}`;
  }

  // The next speed, and back to the first after the last.
  cycle() {
    this.index = (this.index + 1) % this.speeds.length;
    return this.value;
  }

  // The steps of the game for a frame that took `dt` seconds, at this speed.
  steps(dt) {
    return stepsOf(Math.min(dt, MAX_STEP) * this.value);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SPEEDS, MAX_STEP, stepsOf, GameSpeed };
} else {
  Object.assign(window, { SPEEDS, MAX_STEP, stepsOf, GameSpeed });
}
```

Things to notice:

- **`stepsOf` cuts a time into equal steps, none longer than the longest.** A tenth of a second is two steps of a twentieth, and 0.15 is three. It takes as few as will do, and all the steps are the same, so that the game does not do a short step after a long one.
- **`steps(dt)` takes the frame's time first and caps it at the longest step,** as the game always did (so that a tab that has been in the background does not make everything jump) and *then* multiplies by the speed. At the fastest speed a frame is at most three of the longest steps.
- **The speeds are a table,** `SPEEDS`, and the button goes through them and round again. A fourth speed is a number in the list.

Open `tests/speed.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("stepsOf", () => {
  QUnit.test("no time is no steps", (assert) => {
    assert.deepEqual(stepsOf(0), []);
    assert.deepEqual(stepsOf(-1), []);
  });

  QUnit.test("a time that is short enough is one step", (assert) => {
    assert.deepEqual(stepsOf(0.03), [0.03]);
    assert.deepEqual(stepsOf(MAX_STEP), [MAX_STEP]);
  });

  QUnit.test("a longer one is cut into steps that are all the same, and none is longer than the longest", (assert) => {
    for (const seconds of [0.06, 0.1, 0.15, 0.2, 1]) {
      const steps = stepsOf(seconds);

      assert.true(steps.every((step) => step <= MAX_STEP + 1e-12), `${seconds}: ${steps.length} steps`);
      assert.true(Math.abs(steps.reduce((a, b) => a + b, 0) - seconds) < 1e-9, `${seconds} adds up`);
      assert.true(steps.every((step) => step === steps[0]), `${seconds} are the same`);
    }
  });

  QUnit.test("it takes as few as will do", (assert) => {
    assert.strictEqual(stepsOf(0.1).length, 2);
    assert.strictEqual(stepsOf(0.15).length, 3);
  });
});

QUnit.module("GameSpeed", () => {
  QUnit.test("begins at the usual speed, and says so", (assert) => {
    const speed = new GameSpeed();

    assert.strictEqual(speed.value, 1);
    assert.strictEqual(speed.label, "×1");
  });

  QUnit.test("cycle goes through the speeds of the table, and round again", (assert) => {
    const speed = new GameSpeed();
    const seen = [speed.value];
    for (let i = 0; i < SPEEDS.length; i++) seen.push(speed.cycle());

    assert.deepEqual(seen, [...SPEEDS, SPEEDS[0]]);
  });

  QUnit.test("the speeds begin with the usual, and each is faster than the one before", (assert) => {
    assert.strictEqual(SPEEDS[0], 1);
    for (let i = 1; i < SPEEDS.length; i++) assert.true(SPEEDS[i] > SPEEDS[i - 1]);
  });

  QUnit.test("a faster game takes as much more time in a frame, in as many steps as it needs", (assert) => {
    const speed = new GameSpeed();
    speed.cycle();
    const steps = speed.steps(0.016);

    assert.true(Math.abs(steps.reduce((a, b) => a + b, 0) - 0.016 * SPEEDS[1]) < 1e-9);
    assert.true(steps.every((step) => step <= MAX_STEP));
  });

  QUnit.test("the biggest frame, at the fastest speed, is steps that are none too long", (assert) => {
    const speed = new GameSpeed();
    for (let i = 0; i < SPEEDS.length - 1; i++) speed.cycle();
    const steps = speed.steps(1);

    assert.true(steps.every((step) => step <= MAX_STEP + 1e-12));
    assert.true(Math.abs(steps.reduce((a, b) => a + b, 0) - MAX_STEP * SPEEDS[SPEEDS.length - 1]) < 1e-9, "a frame is no more than the longest step, as it always was, times the speed");
  });

  QUnit.test("a game at twice the speed gets to the same place in half the frames: the same as a game played twice as long", (assert) => {
    const route = routeFor(parseMap(MAPS[0]));
    const walkers = [new Walker(route, 2), new Walker(route, 2)];
    const fast = new GameSpeed();
    fast.cycle();
    const slow = new GameSpeed();
    for (let frame = 0; frame < 100; frame++) {
      for (const step of slow.steps(0.016)) walkers[0].update(step);
    }
    for (let frame = 0; frame < 50; frame++) {
      for (const step of fast.steps(0.016)) walkers[1].update(step);
    }

    assert.true(Math.abs(walkers[0].distance - walkers[1].distance) < 1e-9);
  });
});
```

- **"A game at twice the speed gets to the same place in half the frames"** is the whole idea as a test: a walker, walked by the steps of a slow game for a hundred frames and by those of a fast one for fifty, is in the same place.

**Check:** open `tests.html`. 811 tests pass.

---

## Step 2: Limits

The waves are tables, and a table can say anything: a wave of a hundred, in a game made with the editor of a later tutorial, would put a hundred skinned and animated enemies on a phone. So there is a limit to how many can be on the board at once, in a table of its own, and an enemy that has *come on* but finds the board full **waits**, and comes on when there is room.

The limit is in the file of the frame of the game:

In `js/battle.js`, after line 28, add:

```js
// The most that there may be of anything at once, so that a game that is made (a wave of a hundred, by an editor) can't be a game that
// is too much for a phone. An enemy that comes on when the board is full waits, and comes on when there is room.
const LIMITS = {
  enemies: 40, // enemies on the board, which includes the ones that have fallen and are sinking away
};

```

and the frame uses it. The director says that an enemy comes on, and it is put in a line of those that wait. Then, each frame, as many as there is room for come on:

In `js/battle.js`, **replace** lines 44 to 47:

```js
  // The director says what happens: a wave begins, an enemy comes on, a wave is beaten (and paid for), the game is won.
  const alive = world.enemies.filter((enemy) => !enemy.finished).length;
  for (const event of director.update(dt, alive)) {
    if (event.type === "spawn") world.enemies.push(world.spawn(event.kind, event.healthScale));
```

with:

```js
  // The director says what happens: a wave begins, an enemy comes on, a wave is beaten (and paid for), the game is won. An enemy
  // that has come on but has no room waits, and is not yet on the board, but it is not gone either: the wave is not beaten while one waits.
  if (!world.waiting) world.waiting = [];
  const alive = world.enemies.filter((enemy) => !enemy.finished).length + world.waiting.length;
  for (const event of director.update(dt, alive)) {
    if (event.type === "spawn") world.waiting.push(event);
```

In `js/battle.js`, after line 53, add:

```js
  while (world.waiting.length > 0 && world.enemies.length < LIMITS.enemies) {
    const next = world.waiting.shift();
    world.enemies.push(world.spawn(next.kind, next.healthScale));
  }

```

In `js/battle.js`, **replace** lines 85 to 87:

```js
  module.exports = { settle, advance };
} else {
  Object.assign(window, { settle, advance });
```

with:

```js
  module.exports = { LIMITS, settle, advance };
} else {
  Object.assign(window, { LIMITS, settle, advance });
```

- **A wave is not beaten while one waits.** The director is told how many enemies are on the board, and decides that a wave is beaten when there are none and nothing is left to come on; the enemies that wait count as being on the board, or the wave would be beaten (and paid for) with some of it still to come.
- **The limit counts what is in the scene,** the fallen bodies that are sinking into the ground as well as the ones that are walking, since they cost as much to draw.
- **It is made lazily:** `world.waiting` is made by the frame, if the world doesn't have one, so that every world that was ever made (the page's, and the tests') works as it did.

The tests: a world with a limit of two and a wave of eight never has more than two, has two at some time (the limit is reached, and not far above what is needed), all of them come on in the end, and a wave is not beaten with one waiting:

In `tests/battle.tests.js`, after line 278, add:

```js

  // Plays a wave of grunts, and says the most that were ever on the board at once.
  const peak = (world, seconds) => {
    let most = 0;
    for (let t = 0; t < seconds && !world.director.over; t += 0.05) {
      advance(world, 0.05);
      most = Math.max(most, world.enemies.length);
    }
    return most;
  };

  QUnit.test("the board is never fuller than the limit, even when a wave has more than that", (assert) => {
    const saved = LIMITS.enemies;
    LIMITS.enemies = 2;
    const { world } = makeWorld([]);
    world.director = new Director([{ groups: [{ kind: "grunt", count: 8, gap: 0.1 }] }], { lives: 100, firstWait: 0, pause: 1, bonus: 0 });
    const most = peak(world, 10);
    LIMITS.enemies = saved;

    assert.true(most <= 2, `${most} at once`);
    assert.true(most === 2, "and the board was as full as it could be");
    world.enemies.forEach((enemy) => enemy.dispose());
  });

  QUnit.test("the enemies that had to wait come on when there is room: all of them come, in the end", (assert) => {
    const saved = LIMITS.enemies;
    LIMITS.enemies = 2;
    const { world } = makeWorld([]);
    world.director = new Director([{ groups: [{ kind: "grunt", count: 6, gap: 0.1 }] }], { lives: 100, firstWait: 0, pause: 1, bonus: 0 });
    let came = 0;
    const spawn = world.spawn;
    world.spawn = (...args) => {
      came++;
      return spawn(...args);
    };
    play(world, 200);
    LIMITS.enemies = saved;

    assert.strictEqual(came, 6);
    world.enemies.forEach((enemy) => enemy.dispose());
  });

  QUnit.test("a wave is not beaten while an enemy of it is waiting to come on", (assert) => {
    const saved = LIMITS.enemies;
    LIMITS.enemies = 1;
    const { world } = makeWorld(defense, 1000);
    world.director = new Director([{ groups: [{ kind: "grunt", count: 3, gap: 0.1 }] }], { lives: 20, firstWait: 0, pause: 1, bonus: 0 });
    const cleared = [];
    const events = world.director.update.bind(world.director);
    world.director.update = (dt, alive) => {
      const result = events(dt, alive);
      result.filter((event) => event.type === "cleared").forEach(() => cleared.push(alive));
      return result;
    };
    play(world, 200);
    LIMITS.enemies = saved;

    assert.deepEqual(cleared, [0], "cleared once, and with nobody on the board and nobody waiting");
    world.towers.forEach((tower) => tower.dispose());
  });

  QUnit.test("the limit is in a table, and is more than the most that the real waves put on the board", (assert) => {
    assert.true(LIMITS.enemies >= 20);
  });
```

- **The limit is tested against the game that it limits.** The simulation that plays the real waves, with no towers at all, finds the most that were on the board at once; it has to be well under the limit (three quarters of it), so that the limit changes *nothing* in the game as it is, and is only there for a game that is not as it is:

In `tests/balance.tests.js`, after line 276, add:

```js
  QUnit.test("the real waves never put more on the board than the limit allows, so that the limit changes nothing in them", (assert) => {
    for (const map of MAPS) {
      const route = routeFor(parseMap(map));
      WAVES.forEach((wave, index) => {
        const spawner = new Spawner(wave);
        let foes = [];
        let most = 0;
        for (let time = 0; time < 400 && !(spawner.finished && foes.length === 0); time += 0.05) {
          for (const kind of spawner.update(0.05)) foes.push(new Foe(kind, route, 1));
          foes.forEach((foe) => foe.update(0.05));
          foes = foes.filter((foe) => !foe.done);
          most = Math.max(most, foes.length);
        }

        assert.true(most <= LIMITS.enemies * 0.75, `${map.name}, wave ${index + 1}: ${most} on the board with no towers at all`);
      });
    }
  });

```

**Check:** open `tests.html`. 816 tests pass.

---

## Step 3: Detail

A phone's screen has two or three times as many pixels across as it seems to, and drawing every one is slow and hot. The game has always drawn at most twice as many as the page's units. That is the right number for most devices, and not for all: so it is a **setting**, with three levels, a choice that is remembered, and a game that lowers it by itself if it finds that it is too slow.

Open `js/detail.js` (the placeholder) and **replace the TODO line** with:

```js
// The detail of the game: how many pixels it draws, and whether it draws the clouds. A phone that draws every pixel of
// a screen that is three times as sharp as it looks is hot and slow, and a game that is slow is lost on a player who
// did nothing wrong. So the player can choose, the choice is remembered, and a game that is running slowly lowers its own detail
// once, and says so. None of it needs a screen: the choices are a table and the rest is arithmetic. See ../tests/detail.tests.js.

// The levels, lowest first. `pixelRatio` is the most pixels across that are drawn for each of the page's, and `clouds` whether
// the clouds are there.
const DETAIL = {
  low: { name: "Low", pixelRatio: 1, clouds: false },
  medium: { name: "Medium", pixelRatio: 1.5, clouds: true },
  high: { name: "High", pixelRatio: 2, clouds: true },
};
const DETAIL_ORDER = ["low", "medium", "high"];

const FRAMES = {
  seconds: 3, // how long a stretch of frames is looked at
  slowFps: 28, // below this many frames a second, over that long, the game is slow
};

// Whether a name is one of the levels (and not something that every object has, like `toString`).
function isLevel(name) {
  return Object.hasOwn(DETAIL, name);
}

// The level to start at. The address can ask for one (`?detail=low`); if it doesn't, the player's choice from before; if there is
// none, a phone starts on medium and anything else on high. `touch` is whether the device has a touch screen.
function startingDetail({ query = null, stored = null, touch = false }) {
  if (isLevel(query)) return query;
  if (isLevel(stored)) return stored;
  return touch ? "medium" : "high";
}

// The level after this one, going round: low, medium, high, low.
function nextDetail(level) {
  return DETAIL_ORDER[(DETAIL_ORDER.indexOf(level) + 1) % DETAIL_ORDER.length];
}

// The level one below this one, or this one if there is none.
function lowerDetail(level) {
  return DETAIL_ORDER[Math.max(0, DETAIL_ORDER.indexOf(level) - 1)];
}

// How much to scale the drawing by for a level, on a screen of a given pixel ratio: the engine's hardware scaling level, which is
// the *size* of a pixel (one is a pixel for each of the page's, and a half is four for each).
function scalingFor(level, devicePixelRatio) {
  return 1 / Math.min(devicePixelRatio || 1, DETAIL[level].pixelRatio);
}

// Watches how long frames take, and says when the game is slow: when the frames of the last few seconds came to fewer a second than
// they should. A short stutter (a frame that was a second long, as the page comes back) is not slow, since it is one frame in many.
class FrameMeter {
  constructor(frames = FRAMES) {
    this.frames = frames;
    this.times = [];
    this.total = 0;
  }

  // Adds a frame that took `dt` seconds.
  add(dt) {
    this.times.push(dt);
    this.total += dt;
    while (this.total - this.times[0] >= this.frames.seconds) this.total -= this.times.shift();
  }

  // Whether there are enough frames to say, and the frames of them were slow.
  get slow() {
    return this.total >= this.frames.seconds * 0.9 && this.times.length / this.total < this.frames.slowFps;
  }

  // Starts again (when the level has been changed, or the game was paused).
  reset() {
    this.times = [];
    this.total = 0;
  }
}

// What the player chose (the detail, and whether the sound is off), kept in the browser's storage (which can fail, and then nothing is kept).
class Preferences {
  constructor(storage, key = "tower_defense_preferences") {
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

  get detail() {
    return isLevel(this.data.detail) ? this.data.detail : null;
  }

  set detail(level) {
    if (!isLevel(level)) return;
    this.data.detail = level;
    this.save();
  }

  // Whether the sound is off: a player who turned it off does not want it back on the next time.
  get muted() {
    return this.data.muted === true;
  }

  set muted(muted) {
    this.data.muted = muted === true;
    this.save();
  }

  save() {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.data));
    } catch (error) {
      // Not saved; it is kept until the page is closed.
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DETAIL, DETAIL_ORDER, FRAMES, isLevel, startingDetail, nextDetail, lowerDetail, scalingFor, FrameMeter, Preferences };
} else {
  Object.assign(window, { DETAIL, DETAIL_ORDER, FRAMES, isLevel, startingDetail, nextDetail, lowerDetail, scalingFor, FrameMeter, Preferences });
}
```

Things to notice:

- **The levels are a table:** what each draws (`pixelRatio`, the most pixels across for each of the page's) and whether it has the clouds. A level is a row, and a fourth is another.
- **A default is a guess, and the guess is said once.** `startingDetail` takes the address first (`?detail=low`, for trying it), then what the player chose before, then the device: a phone is medium and anything else is high. It is a function of three things that are given to it, so a test can try every combination without a phone.
- **`isLevel` and not `in`.** The word `toString` is `in` every object, and so `"toString" in DETAIL` is true. A level that came from an address or from storage is checked with `Object.hasOwn`; a test says so.
- **`scalingFor` is the engine's own number.** Babylon's hardware scaling level is the *size* of a pixel (a half is four pixels for each one that is drawn), so it is the reciprocal of the ratio, and a screen that is less sharp than the level asks for is drawn pixel for pixel, never at more than it has.
- **`FrameMeter` says a game is slow, and is hard to fool.** It looks at the last three seconds of frames and says *slow* if there were fewer than 28 a second. One long frame (the page coming back after a pause) is one frame among a hundred and eighty, and is a stutter and not a slow game; a game that was slow and is now quick forgets it in three seconds. `reset` forgets everything, for when the detail has just been changed or the game was paused.
- **`Preferences` is the same idea as `Records`:** storage that can fail, a choice that is validated when it is read and when it is written, and a game that goes on without it. It keeps two choices, the detail and whether the sound is off (the sound comes in Step 4, and the choice is kept here so that all the player's choices are in one place).

Open `tests/detail.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("the DETAIL table", () => {
  QUnit.test("there are three levels, lowest first, and each is named", (assert) => {
    assert.deepEqual(DETAIL_ORDER, ["low", "medium", "high"]);
    for (const level of DETAIL_ORDER) assert.true(DETAIL[level].name.length > 0, level);
  });

  QUnit.test("each level draws at least as many pixels as the one below it, and has at least its clouds", (assert) => {
    for (let i = 1; i < DETAIL_ORDER.length; i++) {
      const below = DETAIL[DETAIL_ORDER[i - 1]];
      const level = DETAIL[DETAIL_ORDER[i]];

      assert.true(level.pixelRatio >= below.pixelRatio, DETAIL_ORDER[i]);
      assert.true(level.clouds || !below.clouds, DETAIL_ORDER[i]);
    }
  });

  QUnit.test("the lowest draws a pixel for each of the page's, and the highest is as sharp as the old game was", (assert) => {
    assert.strictEqual(DETAIL.low.pixelRatio, 1);
    assert.strictEqual(DETAIL.high.pixelRatio, 2);
  });
});

QUnit.module("choosing a level", () => {
  QUnit.test("the address comes first, then what the player chose before, then the device", (assert) => {
    assert.strictEqual(startingDetail({ query: "low", stored: "high", touch: false }), "low");
    assert.strictEqual(startingDetail({ query: null, stored: "medium", touch: false }), "medium");
    assert.strictEqual(startingDetail({ touch: true }), "medium");
    assert.strictEqual(startingDetail({ touch: false }), "high");
  });

  QUnit.test("something that isn't a level is not one", (assert) => {
    assert.strictEqual(startingDetail({ query: "ultra", stored: "bogus", touch: false }), "high");
    assert.strictEqual(startingDetail({ query: "toString" }), "high", "and a name that an object has is not a level either");
  });

  QUnit.test("nextDetail goes round: low, medium, high, low", (assert) => {
    assert.strictEqual(nextDetail("low"), "medium");
    assert.strictEqual(nextDetail("medium"), "high");
    assert.strictEqual(nextDetail("high"), "low");
  });

  QUnit.test("lowerDetail goes down one, and stops at the bottom", (assert) => {
    assert.strictEqual(lowerDetail("high"), "medium");
    assert.strictEqual(lowerDetail("medium"), "low");
    assert.strictEqual(lowerDetail("low"), "low");
  });
});

QUnit.module("scalingFor", () => {
  QUnit.test("a screen that is sharper than the level draws is drawn at the level's ratio", (assert) => {
    assert.strictEqual(scalingFor("high", 3), 0.5);
    assert.strictEqual(scalingFor("medium", 3), 1 / 1.5);
    assert.strictEqual(scalingFor("low", 3), 1);
  });

  QUnit.test("a screen that is less sharp than the level is drawn pixel for pixel, and never at more than it has", (assert) => {
    assert.strictEqual(scalingFor("high", 1), 1);
    assert.strictEqual(scalingFor("high", 1.25), 1 / 1.25);
    assert.strictEqual(scalingFor("high", undefined), 1);
  });

  QUnit.test("a lower level is never sharper", (assert) => {
    for (const ratio of [1, 1.5, 2, 3]) {
      for (let i = 1; i < DETAIL_ORDER.length; i++) assert.true(scalingFor(DETAIL_ORDER[i - 1], ratio) >= scalingFor(DETAIL_ORDER[i], ratio), `${DETAIL_ORDER[i]} at ${ratio}`);
    }
  });
});

QUnit.module("FrameMeter", () => {
  const feed = (meter, seconds, dt) => {
    for (let t = 0; t < seconds; t += dt) meter.add(dt);
  };

  QUnit.test("says nothing is slow until it has seen enough frames to say", (assert) => {
    const meter = new FrameMeter();
    feed(meter, 1, 0.1);

    assert.false(meter.slow);
  });

  QUnit.test("a game at sixty frames a second is not slow, and one at fifteen is", (assert) => {
    const quick = new FrameMeter();
    const slow = new FrameMeter();
    feed(quick, 5, 1 / 60);
    feed(slow, 5, 1 / 15);

    assert.false(quick.slow);
    assert.true(slow.slow);
  });

  QUnit.test("the line is the one in the table", (assert) => {
    const above = new FrameMeter();
    const below = new FrameMeter();
    feed(above, 6, 1 / (FRAMES.slowFps + 3));
    feed(below, 6, 1 / (FRAMES.slowFps - 3));

    assert.false(above.slow);
    assert.true(below.slow);
  });

  QUnit.test("one long frame among many is a stutter, and not a slow game", (assert) => {
    const meter = new FrameMeter();
    feed(meter, 4, 1 / 60);
    meter.add(0.8);
    feed(meter, 1, 1 / 60);

    assert.false(meter.slow);
  });

  QUnit.test("it only remembers the last few seconds: a game that was slow and is not, is not", (assert) => {
    const meter = new FrameMeter();
    feed(meter, 5, 1 / 10);
    assert.true(meter.slow);
    feed(meter, 8, 1 / 60);

    assert.false(meter.slow);
    assert.true(meter.total < FRAMES.seconds + 0.2, "and it has not kept them all");
  });

  QUnit.test("reset forgets what it has seen", (assert) => {
    const meter = new FrameMeter();
    feed(meter, 5, 1 / 10);
    meter.reset();

    assert.false(meter.slow);
    assert.strictEqual(meter.total, 0);
  });
});

QUnit.module("Preferences", () => {
  const memory = () => {
    const data = {};
    return { getItem: (key) => (key in data ? data[key] : null), setItem: (key, value) => (data[key] = value) };
  };

  QUnit.test("have no detail until one is chosen", (assert) => {
    assert.strictEqual(new Preferences(memory()).detail, null);
  });

  QUnit.test("keep a choice, and a new set on the same storage has it", (assert) => {
    const storage = memory();
    new Preferences(storage).detail = "low";

    assert.strictEqual(new Preferences(storage).detail, "low");
  });

  QUnit.test("whether the sound is off is kept too, and is on until it is turned off", (assert) => {
    const storage = memory();
    const preferences = new Preferences(storage);
    assert.false(preferences.muted);
    preferences.muted = true;

    assert.true(new Preferences(storage).muted);
    preferences.muted = false;
    assert.false(new Preferences(storage).muted);
  });

  QUnit.test("the two choices do not undo each other", (assert) => {
    const storage = memory();
    const preferences = new Preferences(storage);
    preferences.detail = "low";
    preferences.muted = true;

    const again = new Preferences(storage);
    assert.strictEqual(again.detail, "low");
    assert.true(again.muted);
  });

  QUnit.test("a choice that isn't a level is not kept", (assert) => {
    const preferences = new Preferences(memory());
    preferences.detail = "medium";
    preferences.detail = "ultra";

    assert.strictEqual(preferences.detail, "medium");
  });

  QUnit.test("storage that has nonsense in it, or can't be written to, is no preferences and no error", (assert) => {
    const broken = { getItem: () => "{nope", setItem: () => {} };
    const full = { getItem: () => null, setItem: () => { throw new Error("full"); } };
    const stale = { getItem: () => JSON.stringify({ detail: "ultra" }), setItem: () => {} };

    assert.strictEqual(new Preferences(broken).detail, null);
    assert.strictEqual(new Preferences(stale).detail, null);
    const preferences = new Preferences(full);
    preferences.detail = "low";
    assert.strictEqual(preferences.detail, "low", "it is kept until the page is closed");
  });
});
```

- **"One long frame among many is a stutter, and not a slow game"** is the test that would catch a meter that lowers the detail every time the player switches tabs.
- **"The line is the one in the table"** feeds it frames at three over and three under the limit.

The clouds can be put away, for the lowest level. They are made once, and `setVisible` shows or hides them all:

In `js/sky.js`, **replace** line 68:

```js
// Makes the clouds in a scene. `update(dt)` drifts them all.
```

with:

```js
// Makes the clouds in a scene. `update(dt)` drifts them all, and `setVisible(false)` puts them away.
```

In `js/sky.js`, **replace** line 93:

```js
  return { planes, update };
```

with:

```js
  // Shows the clouds, or puts them away (for a game on a slow device).
  const setVisible = (visible) => planes.forEach((plane) => plane.setEnabled(visible));
  return { planes, update, setVisible };
```

and a test:

In `tests/sky.tests.js`, after line 122, add:

```js

  QUnit.test("the clouds can be put away and brought back", (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const clouds = buildClouds(scene, seededRandom(1));
    clouds.setVisible(false);
    assert.true(clouds.planes.every((plane) => !plane.isEnabled()));
    clouds.setVisible(true);
    assert.true(clouds.planes.every((plane) => plane.isEnabled()));
    scene.dispose();
    engine.dispose();
  });
```

**Check:** open `tests.html`. 839 tests pass.

---

## Step 4: Sound effects

The game has been silent. Sound is half of what makes a tower defense game feel like something happened: the bolt leaves, the enemy falls, the wave starts, the gold arrives. And the sounds need no files at all: each is a *recipe* for the sound card (a tone that glides from one pitch to another, or a burst of filtered noise, shaped by a rise and a fall), written as a table, and played through the Web Audio graph that every browser has.

Open `js/audio.js` (the placeholder) and **replace the TODO line** with:

```js
// Sound effects, made in code: no sound files. Each effect is a short list of notes (a tone that glides from one pitch to another, or a
// burst of noise), shaped by an envelope and played through the Web Audio graph. A table says what each is made of, so a sound is changed
// or added by a line; the notes are scheduled by a function that works on any audio context, so a test can render an effect into a buffer
// and look at the numbers. The music (music.js) goes through the same graph, so that one master volume and one mute reach everything.
// See ../tests/audio.tests.js.

const AUDIO = {
  master: 0.8, // the loudness of everything
  sfx: 0.7, // of the effects, before the master
  music: 0.5, // of the music, before the master
  voices: 20, // the most effects that may be sounding at once
  ramp: 0.05, // seconds that the master takes to go to a new volume (a click is heard if it jumps)
};

// What each effect is made of. `gap` is how soon after it was last played it may be played again (a combo of six flames is not six
// bangs). A note is `{ wave, from, to, at, seconds, volume, attack }`: a tone of that wave (`sine`, `triangle`, `square` or `sawtooth`) or `noise`,
// that starts at `at` seconds, lasts `seconds`, and glides from the pitch `from` to the pitch `to` (for noise they are the two ends of
// the pitches that are let through). `attack` is how long it takes to get to its volume, which is a little for a click and a long time for
// a horn.
const SOUNDS = {
  build: { gap: 0.05, notes: [{ wave: "sine", from: 170, to: 70, at: 0, seconds: 0.14, volume: 0.9 }, { wave: "noise", from: 1800, to: 900, at: 0, seconds: 0.06, volume: 0.4 }] },
  upgrade: { gap: 0.05, notes: [{ wave: "triangle", from: 523, to: 523, at: 0, seconds: 0.12, volume: 0.5 }, { wave: "triangle", from: 659, to: 659, at: 0.07, seconds: 0.12, volume: 0.5 }, { wave: "triangle", from: 784, to: 784, at: 0.14, seconds: 0.28, volume: 0.5 }] },
  sell: { gap: 0.05, notes: [{ wave: "square", from: 988, to: 1318, at: 0, seconds: 0.07, volume: 0.25 }, { wave: "square", from: 1318, to: 1318, at: 0.07, seconds: 0.18, volume: 0.25 }] },
  refuse: { gap: 0.15, notes: [{ wave: "sawtooth", from: 120, to: 85, at: 0, seconds: 0.2, volume: 0.35 }] },
  click: { gap: 0.03, notes: [{ wave: "noise", from: 2500, to: 2500, at: 0, seconds: 0.03, volume: 0.35 }] },
  shot_push: { gap: 0.08, notes: [{ wave: "noise", from: 700, to: 2600, at: 0, seconds: 0.3, volume: 0.5, attack: 0.1 }] },
  shot_slow: { gap: 0.08, notes: [{ wave: "sine", from: 650, to: 280, at: 0, seconds: 0.22, volume: 0.5 }, { wave: "noise", from: 900, to: 400, at: 0, seconds: 0.12, volume: 0.2 }] },
  shot_stun: { gap: 0.08, notes: [{ wave: "sine", from: 95, to: 55, at: 0, seconds: 0.22, volume: 0.9 }, { wave: "noise", from: 400, to: 200, at: 0, seconds: 0.08, volume: 0.35 }] },
  shot_burn: { gap: 0.1, notes: [{ wave: "noise", from: 2400, to: 700, at: 0, seconds: 0.2, volume: 0.3 }, { wave: "sawtooth", from: 240, to: 110, at: 0, seconds: 0.14, volume: 0.12 }] },
  defeated: { gap: 0.04, notes: [{ wave: "sine", from: 520, to: 880, at: 0, seconds: 0.1, volume: 0.4 }] },
  leaked: { gap: 0.2, notes: [{ wave: "triangle", from: 330, to: 200, at: 0, seconds: 0.4, volume: 0.6 }] },
  wave: { gap: 1, notes: [{ wave: "sawtooth", from: 196, to: 196, at: 0, seconds: 0.9, volume: 0.35, attack: 0.15 }, { wave: "sawtooth", from: 294, to: 294, at: 0, seconds: 0.9, volume: 0.25, attack: 0.15 }] },
  cleared: { gap: 0.5, notes: [{ wave: "triangle", from: 660, to: 660, at: 0, seconds: 0.2, volume: 0.5 }, { wave: "triangle", from: 880, to: 880, at: 0.12, seconds: 0.4, volume: 0.5 }] },
  won: { gap: 1, notes: [{ wave: "triangle", from: 523, to: 523, at: 0, seconds: 0.2, volume: 0.55 }, { wave: "triangle", from: 659, to: 659, at: 0.18, seconds: 0.2, volume: 0.55 }, { wave: "triangle", from: 784, to: 784, at: 0.36, seconds: 0.2, volume: 0.55 }, { wave: "triangle", from: 1047, to: 1047, at: 0.54, seconds: 0.8, volume: 0.55 }] },
  lost: { gap: 1, notes: [{ wave: "sawtooth", from: 392, to: 196, at: 0, seconds: 1.1, volume: 0.35, attack: 0.05 }] },
};

// What the game says happened (an event, and perhaps what kind) as the name of a sound: a shot is the sound of the nation that threw
// it, which is the effect that it carries (a shot with none is the sound of the nation that has none: there isn't one, and it is silent).
function soundFor(event, detail = null) {
  if (event === "shot") return detail ? `shot_${detail}` : null;
  return Object.hasOwn(SOUNDS, event) ? event : null;
}

// The notes of an effect, with every pitch multiplied by `factor` (so that the same effect, heard again, is a little different, and a
// hundred of them are not a machine). A note that is not noise is made higher or lower; noise is made brighter or darker.
function soundPlan(name, factor = 1) {
  return SOUNDS[name].notes.map((note) => ({ attack: 0.005, ...note, from: note.from * factor, to: note.to * factor }));
}

// How long an effect lasts, in seconds: the end of its last note.
function soundLength(name) {
  return Math.max(...SOUNDS[name].notes.map((note) => note.at + note.seconds));
}

// One second of white noise, made once and used by every effect that has noise in it.
function makeNoise(context) {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

// Puts a note into an audio context, to start at `when` (the context's own time), going to `destination`. It says when the note ends.
function scheduleNote(context, destination, note, when, noise = null) {
  const start = when + note.at;
  const end = start + note.seconds;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(note.volume, start + Math.min(note.attack, note.seconds / 2));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  gain.connect(destination);
  if (note.wave === "noise") {
    const source = context.createBufferSource();
    source.buffer = noise || makeNoise(context);
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(note.from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, note.to), end);
    source.connect(filter);
    filter.connect(gain);
    source.start(start);
    source.stop(end + 0.02);
    return end;
  }
  const oscillator = context.createOscillator();
  oscillator.type = note.wave;
  oscillator.frequency.setValueAtTime(note.from, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, note.to), end);
  oscillator.connect(gain);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
  return end;
}

class Sound {
  // `makeContext` makes the audio context: a normal one (a page can only make one that plays after the person has touched it), or an
  // offline one in a test.
  constructor(makeContext = () => new (window.AudioContext || window.webkitAudioContext)(), table = AUDIO) {
    this.makeContext = makeContext;
    this.table = table;
    this.context = null;
    this.muted = false;
    this.active = 0; // effects that are sounding now
    this.last = {}; // name -> when it was last played
    this.noise = null;
  }

  // Makes the context and the three volumes (the master, and one each for the effects and the music). Call it from a tap or a key. It says
  // when the context is running.
  start() {
    if (!this.context) {
      this.context = this.makeContext();
      this.master = this.context.createGain();
      this.sfx = this.context.createGain();
      this.musicBus = this.context.createGain();
      this.sfx.connect(this.master);
      this.musicBus.connect(this.master);
      this.master.connect(this.context.destination);
      this.noise = makeNoise(this.context);
      this.update();
    }
    return this.context.state === "suspended" ? this.context.resume() : Promise.resolve();
  }

  get started() {
    return this.context !== null;
  }

  // Turns the sound off, or on again. It goes to the new volume in a moment, and not at once.
  setMuted(muted) {
    this.muted = muted;
    this.update();
  }

  // Puts the volumes of the table into the graph (every frame, so that a slider that changes the table is heard).
  update() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.table.master, now, this.table.ramp);
    this.sfx.gain.value = this.table.sfx;
    this.musicBus.gain.value = this.table.music;
  }

  // Plays an effect by name, a little different each time. It says whether it was played: not before the page has been touched, not for a
  // name that isn't one, not too soon after the last, and not when there are too many already.
  play(name, factor = 0.94 + Math.random() * 0.12) {
    if (!this.context || !Object.hasOwn(SOUNDS, name) || this.muted) return false;
    const now = this.context.currentTime;
    if (Object.hasOwn(this.last, name) && now - this.last[name] < SOUNDS[name].gap) return false;
    if (this.active >= this.table.voices) return false;
    this.last[name] = now;
    this.active++;
    let end = now;
    for (const note of soundPlan(name, factor)) end = Math.max(end, scheduleNote(this.context, this.sfx, note, now, this.noise));
    setTimeout(() => this.active--, (end - now) * 1000 + 50);
    return true;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AUDIO, SOUNDS, soundFor, soundPlan, soundLength, makeNoise, scheduleNote, Sound };
} else {
  Object.assign(window, { AUDIO, SOUNDS, soundFor, soundPlan, soundLength, makeNoise, scheduleNote, Sound });
}
```

Things to notice:

- **An effect is a list of notes, and the list is a table.** `SOUNDS` says, for each name, what it is made of: a `wave` (`sine`, `triangle`, `square`, `sawtooth` or `noise`), when it starts (`at`), how long it lasts, how loud it is and its pitch at the start and at the end. A sound is changed, or added, with a line, and no code. The four nations' shots are four recipes: air is a whoosh (noise that rises), water a drop (a sine that falls), earth a thud (low and short), and fire a hiss (noise that falls with a crackle under it).
- **`gap` is how soon the same sound may come again.** The fire nation throws six flames in a combo; six bangs at the same moment is a bang, and not six flames. The table says how close together the same effect may be, and a test says the fire nation's gap is at least a tenth of a second.
- **`scheduleNote` works on any audio context.** It makes an oscillator (or a loop of noise through a band-pass filter, which is what makes noise *sound* like something: it is the filter that is swept, from `from` to `to`), a gain that rises over `attack` (a click is instant and a horn takes its time) and falls away exponentially to nothing, and tells the context when to start and stop them. It is given the context, so the page gives it a real one and a test gives it an **offline** one, which can be *rendered* into an array of numbers that the test reads.
- **The noise is the same every time.** `makeNoise` fills a second of buffer with numbers from a little generator (a linear congruential one) that is started from the same place, so that a test that renders a sound twice gets the same numbers.
- **`soundPlan` makes the same sound a little different each time.** Every pitch is multiplied by a factor, and the game picks one near 1 each time. A hundred defeats in a row that were exactly the same sound would be a machine; a few percent of difference is a crowd.
- **`soundFor` turns something the game says into a sound's name.** A `shot` is the sound of the nation whose effect it carries (the shot already says), and an event that has no sound (or a name that every object has, like `toString`: `Object.hasOwn`, as in the detail table) is nothing.
- **`Sound` is the graph:** a master volume, one for the effects and one for the music, and the `play` method. It says whether it played: not before the page has been touched (a browser makes no sound until the person has used the page, so the context is made by the first tap or key, and `start()` is called from there), not for a name that isn't one, not when muted, not too soon after the last, and not when there are already too many (`voices`). **Muting goes to the new volume in a moment** (`setTargetAtTime`), since a volume that jumps is heard as a click.

Open `tests/audio.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("the SOUNDS table", () => {
  QUnit.test("every effect has notes, and a gap, and every note is a tone or noise with a time, a volume and pitches", (assert) => {
    for (const [name, sound] of Object.entries(SOUNDS)) {
      assert.true(sound.notes.length >= 1 && sound.gap >= 0, name);
      for (const note of sound.notes) {
        assert.true(["sine", "triangle", "square", "sawtooth", "noise"].includes(note.wave), `${name} ${note.wave}`);
        assert.true(note.seconds > 0 && note.at >= 0 && note.volume > 0 && note.volume <= 1, name);
        assert.true(note.from > 20 && note.to > 20 && note.from < 20000 && note.to < 20000, `${name}: ${note.from} to ${note.to}`);
      }
    }
  });

  QUnit.test("none is long: an effect is a moment, and the longest is a second or so", (assert) => {
    for (const name of Object.keys(SOUNDS)) assert.true(soundLength(name) <= 1.5, `${name}: ${soundLength(name).toFixed(2)}`);
  });

  QUnit.test("there is an effect for what the player does, for what the game does, and for each nation's shot", (assert) => {
    for (const name of ["build", "upgrade", "sell", "refuse", "wave", "defeated", "leaked", "cleared", "won", "lost"]) assert.true(name in SOUNDS, name);
    for (const spec of Object.values(BENDERS)) assert.true(`shot_${spec.effect}` in SOUNDS, spec.effect);
  });

  QUnit.test("a shot that comes four times in a combo is not four bangs: the fire nation's has a gap that is at least a tenth of a second", (assert) => {
    assert.true(SOUNDS.shot_burn.gap >= 0.1);
  });
});

QUnit.module("soundFor", () => {
  QUnit.test("is the name of the sound of an event, and the shot is the sound of the effect that it carries", (assert) => {
    assert.strictEqual(soundFor("build"), "build");
    assert.strictEqual(soundFor("shot", "slow"), "shot_slow");
  });

  QUnit.test("is nothing for an event that has no sound, or a shot with no effect", (assert) => {
    assert.strictEqual(soundFor("flood"), null);
    assert.strictEqual(soundFor("shot", null), null);
    assert.strictEqual(soundFor("shot"), null);
    assert.strictEqual(soundFor("toString"), null, "and a name that every object has is not a sound");
  });

  QUnit.test("every event that the game says is one that has a sound", (assert) => {
    for (const name of ["build", "upgrade", "sell", "refuse", "wave", "defeated", "leaked", "cleared", "won", "lost"]) assert.strictEqual(soundFor(name), name);
  });
});

QUnit.module("soundPlan", () => {
  QUnit.test("is the notes of the effect, with every pitch multiplied by the factor, and a quick attack for a note that says none", (assert) => {
    const plan = soundPlan("build", 2);

    assert.strictEqual(plan.length, SOUNDS.build.notes.length);
    assert.strictEqual(plan[0].from, SOUNDS.build.notes[0].from * 2);
    assert.strictEqual(plan[0].attack, 0.005);
    assert.strictEqual(soundPlan("wave")[0].attack, 0.15, "a horn takes its time");
  });

  QUnit.test("does not change the table", (assert) => {
    const before = JSON.stringify(SOUNDS);
    soundPlan("upgrade", 1.5);

    assert.strictEqual(JSON.stringify(SOUNDS), before);
  });
});

QUnit.module("rendering the effects", () => {
  const RATE = 22050;
  // Plays an effect into an offline context, and gives back what it sounds like as numbers.
  const render = async (name, factor = 1) => {
    const seconds = soundLength(name) + 0.3;
    const context = new OfflineAudioContext(1, Math.ceil(RATE * seconds), RATE);
    const noise = makeNoise(context);
    for (const note of soundPlan(name, factor)) scheduleNote(context, context.destination, note, 0, noise);
    const buffer = await context.startRendering();
    return buffer.getChannelData(0);
  };
  const peak = (data, from = 0, to = data.length) => {
    let most = 0;
    for (let i = from; i < to; i++) most = Math.max(most, Math.abs(data[i]));
    return most;
  };

  QUnit.test("every effect is heard: it has a peak that is well above nothing", async (assert) => {
    for (const name of Object.keys(SOUNDS)) assert.true(peak(await render(name)) > 0.05, name);
  });

  QUnit.test("and none is too loud: no effect on its own goes over the top", async (assert) => {
    for (const name of Object.keys(SOUNDS)) assert.true(peak(await render(name)) <= 1, `${name}: ${peak(await render(name)).toFixed(2)}`);
  });

  QUnit.test("and each is over when it should be: it is quiet after its last note", async (assert) => {
    for (const name of Object.keys(SOUNDS)) {
      const data = await render(name);

      assert.true(peak(data, Math.floor((soundLength(name) + 0.08) * RATE)) < 0.01, name);
    }
  });

  QUnit.test("a note that starts later is quiet until it starts", async (assert) => {
    const data = await render("upgrade");

    assert.true(peak(data, 0, Math.floor(0.05 * RATE)) > 0.05, "the first note is at once");
    assert.true(peak(data, Math.floor(0.45 * RATE), Math.floor(0.6 * RATE)) < 0.05, "and by the time that the last has gone, nothing");
  });

  QUnit.test("a higher factor is a higher pitch: it crosses zero more often", async (assert) => {
    const crossings = (data) => {
      let n = 0;
      for (let i = 1; i < data.length; i++) if (data[i - 1] < 0 !== data[i] < 0) n++;
      return n;
    };

    assert.true(crossings(await render("upgrade", 1.5)) > crossings(await render("upgrade", 1)));
  });

  QUnit.test("a horn rises slowly, and a click does not: the first hundredth of a second of each", async (assert) => {
    const horn = await render("wave");
    const click = await render("click");

    assert.true(peak(horn, 0, Math.floor(0.01 * RATE)) < 0.05);
    assert.true(peak(click, 0, Math.floor(0.02 * RATE)) > 0.05);
  });

  QUnit.test("the noise is the same every time, and has no hum in it: it is centered on nothing", (assert) => {
    const context = new OfflineAudioContext(1, 100, RATE);
    const a = makeNoise(context).getChannelData(0);
    const b = makeNoise(context).getChannelData(0);
    let sum = 0;
    for (const value of a) sum += value;

    assert.deepEqual(Array.from(a.slice(0, 20)), Array.from(b.slice(0, 20)));
    assert.true(Math.abs(sum / a.length) < 0.05, `mean ${(sum / a.length).toFixed(3)}`);
  });
});

QUnit.module("Sound", (hooks) => {
  let sound;
  const make = () => {
    const context = new OfflineAudioContext(1, 22050 * 4, 22050);
    context.resume = () => Promise.resolve(); // an offline context can't be resumed; a page's can
    return context;
  };
  hooks.beforeEach(() => {
    sound = new Sound(make);
  });

  QUnit.test("makes no sound, and says so, before the page has been touched", (assert) => {
    assert.false(sound.started);
    assert.false(sound.play("build"));
  });

  QUnit.test("start makes the context and the three volumes, and says when it is running", async (assert) => {
    await sound.start();

    assert.true(sound.started);
    assert.true(!!sound.master && !!sound.sfx && !!sound.musicBus);
    await sound.start();
    assert.true(sound.started, "and starting it again does no harm");
  });

  QUnit.test("plays an effect once it has started, and says it did", async (assert) => {
    await sound.start();

    assert.true(sound.play("build"));
    assert.strictEqual(sound.active, 1);
  });

  QUnit.test("does not play what isn't an effect", async (assert) => {
    await sound.start();

    assert.false(sound.play("flood"));
    assert.false(sound.play(null));
    assert.false(sound.play("toString"));
  });

  QUnit.test("does not play the same effect again too soon, and does when the gap has gone by", async (assert) => {
    await sound.start();

    assert.true(sound.play("defeated"));
    assert.false(sound.play("defeated"), "at once");
    sound.last.defeated = -10;
    assert.true(sound.play("defeated"), "later");
  });

  QUnit.test("does not play more at once than the table allows", async (assert) => {
    const table = { ...AUDIO, voices: 2 };
    const small = new Sound(make, table);
    await small.start();

    assert.true(small.play("build"));
    assert.true(small.play("upgrade"));
    assert.false(small.play("sell"), "a third");
  });

  QUnit.test("muted, it plays nothing, and goes quiet; and on again, it plays", async (assert) => {
    await sound.start();
    sound.setMuted(true);
    assert.true(sound.muted);
    assert.false(sound.play("build"));
    sound.setMuted(false);

    assert.true(sound.play("build"));
  });

  QUnit.test("update puts the volumes of the table into the graph, so that a slider is heard", async (assert) => {
    await sound.start();
    AUDIO.sfx = 0.2;
    AUDIO.music = 0.3;
    sound.update();
    const sfx = sound.sfx.gain.value;
    const music = sound.musicBus.gain.value;
    AUDIO.sfx = 0.7;
    AUDIO.music = 0.5;

    assert.true(Math.abs(sfx - 0.2) < 1e-6 && Math.abs(music - 0.3) < 1e-6);
  });

  QUnit.test("update before it is started does nothing and does not throw", (assert) => {
    sound.update();

    assert.false(sound.started);
  });

  QUnit.test("the volumes are in the table, and are not too loud to begin with", (assert) => {
    for (const key of ["master", "sfx", "music"]) assert.true(AUDIO[key] > 0 && AUDIO[key] <= 1, key);
    assert.true(AUDIO.music <= AUDIO.sfx, "the music is under the effects");
  });
});
```

- **"Rendering the effects"** is where the tests *listen*. Each effect is rendered, with an offline context, into numbers, and the tests say that every one is heard (it has a peak well above nothing), none is too loud (nothing goes over 1: that would be a crackle), each is over when it should be (quiet after its last note), a note that starts later is silent until it does, a higher factor crosses zero more often (it is a higher pitch), and a horn rises slowly where a click does not.
- **"Does not play the same effect again too soon"** sets the time that the effect was last played back, to say that after the gap it plays.

**Check:** open `tests.html`. 865 tests pass.

---

## Step 5: Music

Three tracks of music, one for each part of the game: a **theme** for the title and the end, a calm track for the **time to build** between waves, and the one with the most in it for **a wave**. They are the files in `assets/music/` (see the credits at the end), and which is for what is a table, so the order can be changed by ear.

Music is different from an effect in three ways. It is **long** (a track is a couple of minutes and a megabyte or two as a file, and decoded into memory it is ten times that or more), so it is *streamed* from an audio element and not decoded. It is **one at a time**, so changing from one to the next is a long **crossfade**: a change that jumps is heard as a mistake. And it is **wanted or not**: a track that is faded out should stop, and not be streaming for nothing.

Open `js/music.js` (the placeholder) and **replace the TODO line** with:

```js
// The music: three tracks, one for each part of the game, and one at a time. The title and the end have a theme; the time to build
// between waves has a calm track; and a wave has the one with the most in it. Which is playing is a function of where the game is (`musicFor`),
// the change from one to the next is a long crossfade (a change that jumps is heard as a mistake), and a game that is paused turns the music
// down and does not stop it. The tracks are streamed from files, and are only played while they are wanted. They go through the
// same graph as the effects (audio.js), so the master volume and the mute reach them. See ../tests/music.tests.js.

const MUSIC = {
  fade: 2.5, // seconds for the music to follow where it is told to go
  duck: 0.35, // the share of the volume while the game is paused
  silent: 0.002, // below this a track is as good as out, and is stopped
  tracks: {
    theme: { url: "../assets/music/china.mp3", volume: 0.9 }, // the title, and the end
    build: { url: "../assets/music/japan-calm.mp3", volume: 0.8 }, // the time between waves
    battle: { url: "../assets/music/japan.mp3", volume: 0.9 }, // a wave
  },
};

// Which track should be playing, and how loud, for where the game is: `flow` is the screen (title, playing, paused, won, lost) and `phase`
// is the director's (preparing, running, won or lost). The title and the end have the theme. While it is going, a wave has the battle track and
// the time before one has the build track. While it is paused it is the one that was playing, turned down.
function musicFor({ flow, phase }, table = MUSIC) {
  if (flow === "title" || flow === "won" || flow === "lost") return { track: "theme", level: 1 };
  return { track: phase === "running" ? "battle" : "build", level: flow === "paused" ? table.duck : 1 };
}

// A number that goes towards where it is told to go, a little each frame, and gets there in about `time` seconds: it eases, and never
// overshoots.
function approach(current, target, seconds, time) {
  if (time <= 0) return target;
  return current + (target - current) * (1 - Math.exp((-3 * seconds) / time));
}

class Music {
  // `sound` is the sound of the game (audio.js). `makeElement` makes the thing that plays a file: a streaming <audio> element, which is
  // not all decoded into memory at once (three tracks of a couple of minutes would be a hundred and fifty megabytes decoded).
  constructor(sound, table = MUSIC, makeElement = (url) => { const element = new Audio(url); element.loop = true; element.preload = "none"; return element; }) {
    this.sound = sound;
    this.table = table;
    this.makeElement = makeElement;
    this.tracks = {}; // name -> { element, gain, level }
    this.started = false;
    this.suspended = false;
  }

  // Puts the tracks into the sound graph, silent and not yet playing. The sound has to have been started (by a tap).
  start() {
    if (this.started || !this.sound.started) return;
    const context = this.sound.context;
    for (const [name, track] of Object.entries(this.table.tracks)) {
      const element = this.makeElement(track.url);
      const source = context.createMediaElementSource(element);
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(this.sound.musicBus);
      this.tracks[name] = { element, gain, level: 0 };
    }
    this.started = true;
  }

  // Every frame: the mix, as the state of the game says, eased. A track that is wanted starts playing, and one that has gone quiet stops.
  update(seconds, state) {
    if (!this.started || this.suspended) return;
    const want = musicFor(state, this.table);
    for (const [name, track] of Object.entries(this.tracks)) {
      const target = name === want.track ? want.level * this.table.tracks[name].volume : 0;
      track.level = approach(track.level, target, seconds, this.table.fade);
      track.gain.gain.value = track.level;
      if (target > 0 && track.element.paused) this.play(track);
      if (target === 0 && track.level < this.table.silent && !track.element.paused) track.element.pause();
    }
  }

  // Starts a track. A phone can refuse (the page has not been touched): then the next frame tries again.
  play(track) {
    const playing = track.element.play();
    if (playing && playing.catch) playing.catch(() => {});
  }

  // The page is hidden: the files are paused, so that a phone in a pocket is not playing; and it goes on when the page is back.
  suspend() {
    this.suspended = true;
    for (const track of Object.values(this.tracks)) track.element.pause();
  }

  resume() {
    this.suspended = false;
  }

  // The loudness of each track now.
  levels() {
    return Object.fromEntries(Object.entries(this.tracks).map(([name, track]) => [name, track.level]));
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MUSIC, musicFor, approach, Music };
} else {
  Object.assign(window, { MUSIC, musicFor, approach, Music });
}
```

Things to notice:

- **Which track is a function of where the game is.** `musicFor` takes the flow (the screen) and the director's phase, and says a track and a level. The title and the end are the theme; a game that is going has the battle track while a wave is on and the build track otherwise; and a game that is **paused** is the track that was playing, **turned down** (the duck), and not stopped. It is a plain function, and a test goes through every combination.
- **A track is only played when it is wanted.** The elements are made with `preload = "none"`, so nothing is downloaded at the start; a track that has a level above nothing is told to play; a track that has faded to nothing is paused. At the title, only the theme has been asked for; the build track starts to download when the game begins.
- **Each element goes into the sound graph** (`createMediaElementSource`, then a gain of its own, then the music volume). That is how the master volume and the mute reach the music, and how a crossfade is two gains going opposite ways. (An element can only be made into a source *once*, which is why `start` does nothing the second time.)
- **`approach` eases, and never overshoots.** It is the same function that the Ghost Hunter tutorials used to bring music in and out: a share of what is left each frame, so it goes quickly at first and slows as it arrives, and gets near in about the time that it is given.
- **A page that is hidden suspends the music** (`suspend`), so that a phone in a pocket is not playing; when the page is back, `resume`, and the next frame plays whatever is wanted.
- **A browser can refuse to play** (the page has not been touched); the promise that `play()` gives back is caught, and the next frame tries again.

Open `tests/music.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("the MUSIC table", () => {
  QUnit.test("there is a track for the title, for the time between waves, and for a wave, each a file that is there, and the three are different files", (assert) => {
    assert.deepEqual(Object.keys(MUSIC.tracks).sort(), ["battle", "build", "theme"]);
    for (const [name, track] of Object.entries(MUSIC.tracks)) assert.true(track.url.endsWith(".mp3") && track.volume > 0 && track.volume <= 1, name);
    assert.strictEqual(new Set(Object.values(MUSIC.tracks).map((track) => track.url)).size, 3);
  });

  QUnit.test("the files are in the assets, and are tracks (they are megabytes, and begin like an mp3)", async (assert) => {
    for (const [name, track] of Object.entries(MUSIC.tracks)) {
      const response = await fetch(track.url.replace("../assets/", "../assets/"));
      const bytes = new Uint8Array(await response.arrayBuffer());

      assert.true(response.ok && bytes.length > 500000, `${name}: ${bytes.length} bytes`);
      const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
      const frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
      assert.true(id3 || frame, `${name} looks like an mp3`);
    }
  });

  QUnit.test("the fade is slow, and the pause turns the music down and not off", (assert) => {
    assert.true(MUSIC.fade >= 1);
    assert.true(MUSIC.duck > 0 && MUSIC.duck < 1);
  });
});

QUnit.module("musicFor", () => {
  QUnit.test("the title and the end have the theme, at full", (assert) => {
    for (const flow of ["title", "won", "lost"]) assert.deepEqual(musicFor({ flow, phase: "preparing" }), { track: "theme", level: 1 }, flow);
  });

  QUnit.test("playing, the time before a wave has the build track and a wave has the battle track", (assert) => {
    assert.strictEqual(musicFor({ flow: "playing", phase: "preparing" }).track, "build");
    assert.strictEqual(musicFor({ flow: "playing", phase: "running" }).track, "battle");
  });

  QUnit.test("paused, it is the track that was playing, turned down", (assert) => {
    assert.deepEqual(musicFor({ flow: "paused", phase: "running" }), { track: "battle", level: MUSIC.duck });
    assert.deepEqual(musicFor({ flow: "paused", phase: "preparing" }), { track: "build", level: MUSIC.duck });
  });

  QUnit.test("it is always one of the tracks of the table", (assert) => {
    for (const flow of ["title", "playing", "paused", "won", "lost"]) {
      for (const phase of ["preparing", "running", "won", "lost"]) assert.true(musicFor({ flow, phase }).track in MUSIC.tracks, `${flow} ${phase}`);
    }
  });
});

QUnit.module("approach", () => {
  QUnit.test("goes towards the target and never past it, and gets near in about the time that it is given", (assert) => {
    let value = 0;
    for (let i = 0; i < 100; i++) value = approach(value, 1, 0.025, 2.5);

    assert.true(value > 0.9 && value <= 1, `${value.toFixed(3)} after 2.5 seconds`);
    assert.strictEqual(approach(0.5, 1, 1, 0), 1, "no time is at once");
  });

  QUnit.test("goes down as well as up", (assert) => {
    assert.true(approach(1, 0, 0.1, 2) < 1);
  });
});

QUnit.module("Music", (hooks) => {
  let played, paused, elements, sound, music, nodes;
  // A page's audio, in a few lines: the things that Music asks of it.
  const fakeElement = (url) => {
    const element = {
      url,
      paused: true,
      play() {
        this.paused = false;
        played.push(url);
        return Promise.resolve();
      },
      pause() {
        this.paused = true;
        paused.push(url);
      },
    };
    elements.push(element);
    return element;
  };
  const fakeContext = () => ({
    createMediaElementSource: () => ({ connect: () => {} }),
    createGain: () => {
      const node = { gain: { value: 1 }, connect: () => {} };
      nodes.push(node);
      return node;
    },
  });
  hooks.beforeEach(() => {
    played = [];
    paused = [];
    elements = [];
    nodes = [];
    sound = { started: true, context: fakeContext(), musicBus: {} };
    music = new Music(sound, MUSIC, fakeElement);
  });
  const run = (seconds, state) => {
    for (let t = 0; t < seconds; t += 0.05) music.update(0.05, state);
  };

  QUnit.test("makes a source for each track when it is started, and plays none of them yet", (assert) => {
    music.start();

    assert.strictEqual(elements.length, 3);
    assert.deepEqual(played, []);
    assert.deepEqual(music.levels(), { theme: 0, build: 0, battle: 0 });
  });

  QUnit.test("does nothing until the sound has been started, and starts only once", (assert) => {
    sound.started = false;
    music.start();
    assert.strictEqual(elements.length, 0);
    sound.started = true;
    music.start();
    music.start();

    assert.strictEqual(elements.length, 3);
  });

  QUnit.test("plays the track for where the game is, and only that one, and brings it up over the fade", (assert) => {
    music.start();
    run(MUSIC.fade * 1.2, { flow: "title", phase: "preparing" });

    assert.deepEqual(played, [MUSIC.tracks.theme.url]);
    const levels = music.levels();
    assert.true(levels.theme > MUSIC.tracks.theme.volume * 0.9);
    assert.strictEqual(levels.build, 0);
  });

  QUnit.test("changes from one track to another by a crossfade: both are heard in the middle of it, and then only the new one", (assert) => {
    music.start();
    run(MUSIC.fade * 1.5, { flow: "playing", phase: "preparing" });
    run(MUSIC.fade * 0.3, { flow: "playing", phase: "running" });
    const middle = music.levels();
    run(MUSIC.fade * 3, { flow: "playing", phase: "running" });
    const after = music.levels();

    assert.true(middle.build > 0.05 && middle.battle > 0.05, `both: ${middle.build.toFixed(2)} and ${middle.battle.toFixed(2)}`);
    assert.true(after.battle > MUSIC.tracks.battle.volume * 0.9 && after.build < 0.01);
  });

  QUnit.test("a track that has faded out is stopped, so that it is not streaming for nothing", (assert) => {
    music.start();
    run(MUSIC.fade * 1.5, { flow: "playing", phase: "preparing" });
    run(MUSIC.fade * 4, { flow: "playing", phase: "running" });

    assert.true(elements.find((e) => e.url === MUSIC.tracks.build.url).paused);
    assert.false(elements.find((e) => e.url === MUSIC.tracks.battle.url).paused);
  });

  QUnit.test("paused, the music goes down and goes on", (assert) => {
    music.start();
    run(MUSIC.fade * 1.5, { flow: "playing", phase: "running" });
    const loud = music.levels().battle;
    run(MUSIC.fade * 3, { flow: "paused", phase: "running" });
    const quiet = music.levels().battle;

    assert.true(quiet < loud * 0.5 && quiet > 0.05, `${loud.toFixed(2)} to ${quiet.toFixed(2)}`);
  });

  QUnit.test("suspended (the page is hidden), every file is paused and nothing changes; and when it is back it plays again", (assert) => {
    music.start();
    run(MUSIC.fade, { flow: "title", phase: "preparing" });
    music.suspend();
    assert.true(elements.every((e) => e.paused));
    const level = music.levels().theme;
    run(1, { flow: "title", phase: "preparing" });
    assert.strictEqual(music.levels().theme, level);
    music.resume();
    run(0.2, { flow: "title", phase: "preparing" });

    assert.false(elements.find((e) => e.url === MUSIC.tracks.theme.url).paused);
  });

  QUnit.test("a file that the browser refuses to play does not throw: it is tried again", (assert) => {
    music = new Music(sound, MUSIC, (url) => ({ url, paused: true, play: () => Promise.reject(new Error("blocked")), pause() {} }));
    music.start();

    music.update(0.05, { flow: "title", phase: "preparing" });
    assert.true(true, "it did not throw");
  });
});
```

- **"The files are in the assets, and are tracks"** fetches each file and says that it is megabytes and begins like an mp3 (an ID3 tag, or a frame header). It is the test that says the file name in the table is the name of a file.
- **"Changes from one track to another by a crossfade"** runs a title's worth of frames, and says that in the middle both are heard and at the end only the new one is.
- **"A track that has faded out is stopped"** and **"suspended ... every file is paused"** are the tests of the two ways that a track stops.

**Check:** open `tests.html`. 882 tests pass.

---

## Step 6: In the game

Everything is there but a way to ask for it. This step puts the speed, the detail and the sound into the game: three buttons, the things that the game *says it hears*, and the code that makes it all go.

### The screens' buttons

The screens say what was pressed, as they do for the others, and show the speed button only while the game is going. The sound and the detail are **settings**, and a setting is for a moment when nothing else is going on, so they are on the pause screen. First what the screens are made from and say:

In `js/screens.js`, **replace** line 21:

```js
  // `parts` is { title, pause, result, pauseButton }: the elements of the page that this fills in, and the ones it shows and
```

with:

```js
  // `parts` is { title, pause, result, pauseButton, speedButton }: the elements of the page that this fills in, and the ones it shows and
```

In `js/screens.js`, **replace** line 29:

```js
    this.listeners = { play: [], resume: [], restart: [], menu: [], pause: [] };
```

with:

```js
    this.listeners = { play: [], resume: [], restart: [], menu: [], pause: [], speed: [], detail: [], mute: [] };
```

In `js/screens.js`, **replace** lines 34 to 35:

```js
    for (const part of [parts.title, parts.pause, parts.result, parts.pauseButton]) part.addEventListener("pointerup", (event) => event.stopPropagation());
    parts.pauseButton.addEventListener("click", () => this.say("pause"));
```

with:

```js
    for (const part of [parts.title, parts.pause, parts.result, parts.pauseButton, parts.speedButton]) part.addEventListener("pointerup", (event) => event.stopPropagation());
    parts.pauseButton.addEventListener("click", () => this.say("pause"));
    parts.speedButton.addEventListener("click", () => this.say("speed"));
```

the buttons for the detail and the sound, on the pause screen, between *Resume* and *Start again*:

In `js/screens.js`, after line 86, add:

```js
    this.detailButton = this.button("Detail", "plain", () => this.say("detail"));
    this.soundButton = this.button("Sound", "plain", () => this.say("mute"));
```

In `js/screens.js`, after line 91, add:

```js
      this.detailButton,
      this.soundButton,
```

the speed button is there while the game is going, and the three buttons say what they are now:

In `js/screens.js`, after line 130, add:

```js
    this.parts.speedButton.hidden = state !== "playing";
```

In `js/screens.js`, after line 134, add:

```js
  // Says on the buttons what the speed and the detail are now.
  setSpeed(label) {
    this.parts.speedButton.textContent = label;
  }

  setDetail(name) {
    this.detailButton.textContent = `Detail: ${name}`;
  }

  setSound(on) {
    this.soundButton.textContent = `Sound: ${on ? "On" : "Off"}`;
  }

```

and the style of the speed button:

In `css/screens.css`, **replace** line 184:

```css
#pause-button[hidden] {
```

with:

```css
#speed-button {
  position: fixed;
  top: 52px;
  right: 96px;
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
#pause-button[hidden],
#speed-button[hidden] {
```

In `css/screens.css`, after line 219, add:

```css
  #speed-button {
    top: 8px;
    right: 82px;
  }
```

The tests of the screens: the new button is in the parts that the tests make, the new things are said, and each state shows the buttons that it should:

In `tests/screens.tests.js`, **replace** line 43:

```js
    parts = { title: make("div"), pause: make("div", true), result: make("div", true), pauseButton: make("button", true) };
```

with:

```js
    parts = { title: make("div"), pause: make("div", true), result: make("div", true), pauseButton: make("button", true), speedButton: make("button", true) };
```

In `tests/screens.tests.js`, **replace** line 48:

```js
    for (const name of ["play", "resume", "restart", "menu", "pause"]) screens.on(name, (...args) => heard.push([name, ...args]));
```

with:

```js
    for (const name of ["play", "resume", "restart", "menu", "pause", "speed", "detail", "mute"]) screens.on(name, (...args) => heard.push([name, ...args]));
```

In `tests/screens.tests.js`, **replace** lines 89 to 99:

```js
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
```

with:

```js
    const shown = () => [parts.title, parts.pause, parts.result, parts.pauseButton, parts.speedButton].map((part) => !part.hidden);
    screens.show("title");
    assert.deepEqual(shown(), [true, false, false, false, false]);
    screens.show("playing");
    assert.deepEqual(shown(), [false, false, false, true, true], "only the buttons to pause and to change the speed");
    screens.show("paused");
    assert.deepEqual(shown(), [false, true, false, false, false]);
    screens.show("won");
    assert.deepEqual(shown(), [false, false, true, false, false]);
    screens.show("lost");
    assert.deepEqual(shown(), [false, false, true, false, false]);
```

In `tests/screens.tests.js`, after line 115, add:

```js
  QUnit.test("the button for the speed says so when it is pressed, and says what the speed is", (assert) => {
    parts.speedButton.click();
    screens.setSpeed("×2");

    assert.deepEqual(heard, [["speed"]]);
    assert.strictEqual(parts.speedButton.textContent, "×2");
  });

  QUnit.test("the pause screen has a button for the detail, which says what it is now and asks for the next when it is pressed", (assert) => {
    screens.setDetail("High");
    buttons(parts.pause, "Detail: High").click();

    assert.deepEqual(heard, [["detail"]]);
    screens.setDetail("Low");
    assert.true(!!buttons(parts.pause, "Detail: Low"));
  });

  QUnit.test("the pause screen has a button for the sound, which says whether it is on and asks to turn it over when it is pressed", (assert) => {
    screens.setSound(true);
    buttons(parts.pause, "Sound: On").click();

    assert.deepEqual(heard, [["mute"]]);
    screens.setSound(false);
    assert.true(!!buttons(parts.pause, "Sound: Off"));
  });

```

In `tests/screens.tests.js`, **replace** line 178:

```js
    for (const part of [parts.title, parts.pause, parts.result, parts.pauseButton]) part.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
```

with:

```js
    for (const part of [parts.title, parts.pause, parts.result, parts.pauseButton, parts.speedButton]) part.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
```

### What the player does

The hand says what it hears when the player builds, upgrades, sells, or is refused. It is *given* a function (it has no sound in it), and a hand that is given none is as it was:

In `js/hand.js`, after line 40, add:

```js
  // The player did something that has a sound.
  hear(name) {
    if (this.sound) this.sound(name);
  }

```

In `js/hand.js`, after line 123, add:

```js
    this.hear(result.ok ? "upgrade" : "refuse");
```

In `js/hand.js`, after line 137, add:

```js
      this.hear("sell");
```

In `js/hand.js`, after line 173, add:

```js
      if (refusal.reason) this.hear("refuse");
```

In `js/hand.js`, after line 183, add:

```js
        this.hear("refuse");
```

In `js/hand.js`, after line 196, add:

```js
    this.hear(result.ok ? "build" : "refuse");
```

and the tests of the hand:

In `tests/hand.tests.js`, after line 528, add:

```js
  QUnit.test("it says what it hears: a build, an upgrade, a sale", (assert) => {
    const heard = [];
    hand.sound = (name) => heard.push(name);
    build("water", GRASS);
    tap(at(GRASS));
    hand.upgrade();
    hand.sell();

    assert.deepEqual(heard, ["build", "upgrade", "sell"]);
  });

  QUnit.test("and a refusal: a podium put down where it can't be, and an upgrade that can't be paid for", (assert) => {
    const heard = [];
    hand.sound = (name) => heard.push(name);
    drag("water", at(ROAD));
    hand.release(at(ROAD));
    build("fire", GRASS);
    state.wallet.gold = 0;
    tap(at(GRASS));
    hand.upgrade();

    assert.deepEqual(heard, ["refuse", "build", "refuse"]);
  });

  QUnit.test("a hand with no sound is as it was", (assert) => {
    build("water", GRASS);
    tap(at(GRASS));
    hand.upgrade();

    assert.strictEqual(state.towers.length, 1);
  });

```

### What the game does

The frame of the game says what it hears: an enemy defeated, one that got through, and every shot (a shot is of the kind of its effect, which is how the nations sound different). Like the stats, it is *given* what to say it to, and a world that has none is played as it was:

In `js/battle.js`, **replace** line 10:

```js
function settle(enemies, wallet, director, stats = null) {
```

with:

```js
function settle(enemies, wallet, director, stats = null, heard = null) {
```

In `js/battle.js`, after line 17, add:

```js
      if (heard) heard("defeated");
```

In `js/battle.js`, after line 22, add:

```js
      if (heard) heard("leaked");
```

In `js/battle.js`, after line 42, add:

```js
  const heard = world.sound || (() => {}); // what the game hears, as it happens: `sound(name, detail)` of the world, if it has one
```

In `js/battle.js`, **replace** line 67:

```js
  const { events, gone } = settle(world.enemies, wallet, director, world.stats);
```

with:

```js
  const { events, gone } = settle(world.enemies, wallet, director, world.stats, heard);
```

In `js/battle.js`, **replace** line 74:

```js
    for (const shot of tower.update(dt, world.enemies)) world.bolts.push(world.shoot(shot));
```

with:

```js
    for (const shot of tower.update(dt, world.enemies)) {
      world.bolts.push(world.shoot(shot));
      heard("shot", shot.effect);
    }
```

- **A world with no sound plays as it did.** `heard` is the world's function if it has one, and a function that does nothing if not, so every test of a game that was ever written goes on passing.
- **The start of a wave, and the end of one, are not heard here.** The director's *phase* changes, and the page, which sees it change, plays them (below). It keeps the frame of the game to what the frame itself does, and out of the way of the limit that you wrote in Step 2.

and the tests, which play a whole game and write down what it hears:

In `tests/battle.tests.js`, after line 151, add:

```js
  // A world that writes down what it hears.
  const listening = (defense, gold) => {
    const made = makeWorld(defense, gold);
    made.heard = [];
    made.world.sound = (name, detail) => made.heard.push(detail ? `${name} ${detail}` : name);
    return made;
  };

  QUnit.test("a game is heard: every enemy that is defeated, and the shots, each of the kind of the nation that threw it", (assert) => {
    const { world, heard } = listening(defense, 1000);
    play(world, 200);

    assert.strictEqual(heard.filter((h) => h === "defeated").length, 6);
    assert.true(heard.some((h) => h === "shot stun"), "earth shoots a stun");
    assert.true(heard.every((h) => h === "defeated" || h.startsWith("shot ")), "and nothing else: the rest is heard by the page");
    world.towers.forEach((tower) => tower.dispose());
  });

  QUnit.test("an enemy that gets through is heard, once for each", (assert) => {
    const { world, heard } = listening([]);
    play(world, 200);

    assert.strictEqual(heard.filter((h) => h === "leaked").length, rules.lives);
  });

  QUnit.test("a world that has no sound is played as it was, and a game that is over says nothing more", (assert) => {
    const { world, heard } = listening([]);
    play(world, 200);
    const count = heard.length;
    advance(world, 1);

    assert.strictEqual(heard.length, count);
  });

```

### The game

In `main.js` the fixed pixel ratio goes, and the choices are made from the address and the storage, as is the sound that the page makes:

In `js/main.js`, **replace** lines 6 to 10:

```js
// A phone's screen has two or three times as many pixels across as it seems to, and drawing
// every one is slow and hot. Drawing at most twice as many as the page's units looks sharp
// and keeps the game smooth. (A hardware scaling level of 0.5 draws twice as many pixels.)
const MAX_PIXEL_RATIO = 2;
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
```

with:

```js
// A phone's screen has two or three times as many pixels across as it seems to, and drawing every one is slow and hot. How many are
// drawn is the detail setting (see detail.js), which is chosen by the address, or by the player's last choice, or by the device;
// it is put into effect below, when the game starts.
```

In `js/main.js`, after line 21, add:

```js
const preferences = new Preferences(safeStorage(window));
let detail = startingDetail({ query: params.get("detail"), stored: preferences.detail, touch: navigator.maxTouchPoints > 0 });
const speed = new GameSpeed();
const meter = new FrameMeter();

// The sound of the game: the effects, and the music that goes through the same volume. A browser makes no sound until the page has been
// touched, so they are begun by the first touch or key (see below).
const sound = new Sound();
const music = new Music(sound);
sound.muted = preferences.muted;
```

The hand is given a function to say what it hears to, and the screens are given the new button:

In `js/main.js`, after line 101, add:

```js
    sound: (name) => sound.play(name),
```

In `js/main.js`, after line 133, add:

```js
      speedButton: document.getElementById("speed-button"),
```

The screens say what to do when each button is pressed. The first touch of the page or key starts the sound (and the music with it), since a browser makes no noise until the person has used the page:

In `js/main.js`, after line 145, add:

```js
  screens.on("speed", () => {
    speed.cycle();
    scene.animationTimeScale = speed.value; // the enemies' walk and the benders' moves go as fast as the game does
    screens.setSpeed(speed.label);
  });
  screens.on("detail", () => setDetail(nextDetail(detail)));
  const toggleSound = () => {
    sound.setMuted(!sound.muted);
    preferences.muted = sound.muted;
    screens.setSound(!sound.muted);
  };
  screens.on("mute", toggleSound);
  screens.setSound(!sound.muted);

  // The first touch or key starts the sound (a browser only lets a page make a noise after the person has used it), and the music with it.
  const unlock = () => sound.start().then(() => music.start());
  for (const type of ["pointerdown", "keydown"]) window.addEventListener(type, unlock, { once: true });
```

- **`scene.animationTimeScale` makes the *animations* as fast as the game.** The steps of the game are taken faster, but the enemies' walk cycles and the benders' attacks are played by the scene's own clock, and would go on at their old speed (an enemy that crosses the board twice as fast with its legs at the old pace looks as if it skates). One line, and it is the one to remember.
- **The sound's choice is kept, and is the same as the detail's:** `preferences.muted`. A player who turns the sound off does not want it back on the next time.
- **The title is silent until the first touch.** That is the browser's rule, not ours: a page that has not been used can't make a noise. The first tap on a map card, or on *Play*, starts the sound, and the theme comes in.

When the game ends, its sound is the name of the state (`won` and `lost` are both sounds):

In `js/main.js`, after line 169, add:

```js
      sound.play(now); // the sound of a win, or of a loss
```

When the game is not running, the meter of frames is cleared, so that the time on a pause screen is not counted as slow frames:

In `js/main.js`, **replace** line 177:

```js
    if (!flow.running) hand.cancel();
```

with:

```js
    if (!flow.running) {
      hand.cancel();
      meter.reset();
    }
```

M turns the sound off and on, from the keyboard:

In `js/main.js`, after line 188, add:

```js
    if (event.key === "m" || event.key === "M") toggleSound();
```

and a page that is hidden pauses the music, and brings it back:

In `js/main.js`, **replace** line 196:

```js
    if (document.hidden) flow.pause();
```

with:

```js
    if (document.hidden) {
      flow.pause();
      music.suspend();
    } else {
      music.resume();
    }
```

Then putting a level of detail into effect. It is the one place that knows what a level does: the pixels, the clouds, the button's words, a choice that is kept, and the meter begun again:

In `js/main.js`, after line 208, add:

```js

  // Puts a level of detail into effect: how many pixels are drawn, and whether the clouds are. A level that the player chose (or the game
  // chose for them) is remembered, and the frames are looked at afresh.
  const setDetail = (level, remember = true) => {
    detail = level;
    if (remember) preferences.detail = level;
    engine.setHardwareScalingLevel(scalingFor(level, window.devicePixelRatio));
    clouds.setVisible(DETAIL[level].clouds);
    screens.setDetail(DETAIL[level].name);
    meter.reset();
  };
  setDetail(detail, false);
```

The world says what it hears to the sound, by a name, with `soundFor` working out which:

In `js/main.js`, after line 230, add:

```js
    sound: (name, detail) => sound.play(soundFor(name, detail)),
```

and the frame takes the steps of the game for the speed, and watches itself. A game that is slow lowers its own detail, once, and says so on the line above the tray. The director's phase is looked at before and after, and a change is a sound: a wave begins, a wave is beaten:

In `js/main.js`, **replace** lines 238 to 240:

```js
    if (flow.running) {
      advance(world, dt);
      hand.update(dt);
```

with:

```js
    sound.update();
    music.update(dt, { flow: flow.state, phase: director.phase });
    if (flow.running) {
      const before = { phase: director.phase, index: director.index };
      for (const step of speed.steps(dt)) advance(world, step);
      // What the director did that has a sound: a wave begins, a wave is beaten (not the last, which is a win, and has a sound of its own).
      if (director.phase === "running" && before.phase !== "running") sound.play("wave");
      if (director.phase === "preparing" && director.index > before.index) sound.play("cleared");
      hand.update(dt);
      // A game that is slow lowers its own detail, once, and says so: a player who finds it slow need not find the setting.
      meter.add(dt);
      if (meter.slow && detail !== lowerDetail(detail)) {
        setDetail(lowerDetail(detail));
        hand.say("The game was running slowly, so the detail is lower.", 4);
      }
```

- **The player's own choice of detail is saved,** and so is the game's: a device that was too slow once is probably too slow next time, and starts lower.
- **The first level is put in without being saved** (`setDetail(detail, false)`): a level that is only a default for this device is not a choice, and should not stop the next default from being a better guess.
- **The sound and the music are updated every frame,** and not only when something happens: the music eases a little each frame, and the master volume follows the table, so that a slider in the dev panel of the next step is heard as it moves.

**Check:** open `tests.html`. 891 tests pass. Then open `index.html` through the web server. Tap a map card: the theme comes in, over a few seconds. Press Play, and the build music comes in as the theme goes out. Build a tower (a clunk), upgrade it (three notes going up), start the wave (a horn) and watch the bolts: each nation has a sound of its own. Press ×2 and the enemies' legs keep up. Pause, and the music goes down and the buttons *Detail: High* and *Sound: On* are on the card. Press M.

---

## Step 7: The dev panel

A game is tuned by playing it, and the numbers that need tuning are in tables (the speed of a bolt, how long a slow lasts, how long between waves, how loud the music is). Editing a table and reloading loses the game that you were playing. So with `?dev` in the address the game has a panel of sliders, each of which changes **the very number that the game reads**, and a button to log them so that they can be pasted back into the tables.

Open `js/dev.js` (the placeholder) and **replace the TODO line** with:

```js
// The developer panel: sliders for the numbers of the game, so that a game can be tuned by playing it, and not by editing a
// table and reloading. It is there only when the address says `?dev`. Every slider is a row of a table (an object and the name of one
// of its numbers), so a number is added to it with one line, and a slider changes the very number that the game reads. The
// values can be logged, to be pasted back into the tables. See ../tests/dev.tests.js.

// Whether the address asks for the panel: `?dev`, or `?dev=1`, anywhere in the query.
function devEnabled(search) {
  return new URLSearchParams(search).has("dev");
}

// The sliders. `group` is what they are listed under. Made when it is asked for, and not when the script is loaded, so that it doesn't
// matter which file was loaded first.
function devTable() {
  return [
    { group: "Bolts and towers", label: "bolt speed", object: BOLT, key: "speed", min: 3, max: 25, step: 0.5 },
    { group: "Bolts and towers", label: "turn rate", object: BRAIN, key: "turnRate", min: 1, max: 15, step: 0.5 },
    { group: "Effects", label: "slow: share of speed", object: EFFECTS.slow, key: "speed", min: 0.1, max: 1, step: 0.05 },
    { group: "Effects", label: "slow: seconds", object: EFFECTS.slow, key: "seconds", min: 0.5, max: 8, step: 0.5 },
    { group: "Effects", label: "slow: radius", object: EFFECTS.slow, key: "radius", min: 0, max: 4, step: 0.2 },
    { group: "Effects", label: "burn: damage a second", object: EFFECTS.burn, key: "damage", min: 0, max: 12, step: 0.5 },
    { group: "Effects", label: "burn: seconds", object: EFFECTS.burn, key: "seconds", min: 0.5, max: 8, step: 0.5 },
    { group: "Effects", label: "stun: seconds", object: EFFECTS.stun, key: "seconds", min: 0.2, max: 4, step: 0.1 },
    { group: "Effects", label: "push: distance", object: EFFECTS.push, key: "distance", min: 0, max: 8, step: 0.5 },
    { group: "Rules", label: "seconds between waves", object: RULES, key: "pause", min: 2, max: 40, step: 1 },
    { group: "Rules", label: "refund share", object: ECONOMY, key: "refund", min: 0, max: 1, step: 0.05 },
    { group: "Sound", label: "master volume", object: AUDIO, key: "master", min: 0, max: 1, step: 0.05 },
    { group: "Sound", label: "effects volume", object: AUDIO, key: "sfx", min: 0, max: 1, step: 0.05 },
    { group: "Sound", label: "music volume", object: AUDIO, key: "music", min: 0, max: 1, step: 0.05 },
    { group: "Limits", label: "most enemies on the board", object: LIMITS, key: "enemies", min: 5, max: 80, step: 1 },
    { group: "Enemies", label: "grunt speed", object: ENEMIES.grunt, key: "speed", min: 0.5, max: 5, step: 0.1 },
    { group: "Enemies", label: "scout speed", object: ENEMIES.scout, key: "speed", min: 0.5, max: 6, step: 0.1 },
    { group: "Enemies", label: "heavy speed", object: ENEMIES.heavy, key: "speed", min: 0.5, max: 5, step: 0.1 },
  ];
}

// A value kept inside the slider's range, and on its steps.
function clampDev(row, value) {
  const stepped = Math.round((value - row.min) / row.step) * row.step + row.min;
  const rounded = Math.round(stepped * 1e6) / 1e6;
  return Math.min(row.max, Math.max(row.min, rounded));
}

// The numbers now, by label: what to paste back into the tables.
function devValues(rows) {
  return Object.fromEntries(rows.map((row) => [row.label, row.object[row.key]]));
}

// Puts every number back to what it was when the panel was made.
function resetDev(rows) {
  for (const row of rows) row.object[row.key] = row.initial;
}

class DevPanel {
  // `parts` is { panel }: an empty element of the page. `rows` is the table. `log` says what to do with the values when they are wanted.
  constructor(parts, document, rows = devTable(), log = (values) => console.table(values)) {
    this.parts = parts;
    this.rows = rows.map((row) => ({ ...row, initial: row.object[row.key] }));
    this.log = log;
    this.inputs = [];
    this.collapsed = false;
    const { panel } = parts;
    // A press on the panel is for the panel, and is not for the board behind it.
    for (const type of ["pointerdown", "pointerup"]) panel.addEventListener(type, (event) => event.stopPropagation());

    const header = element(document, "div", "dev-header");
    this.body = element(document, "div", "dev-body");
    const fold = element(document, "button", "dev-fold", "Dev ▾");
    fold.type = "button";
    fold.addEventListener("click", () => this.fold());
    header.append(fold);
    let group = null;
    this.rows.forEach((row, i) => {
      if (row.group !== group) {
        group = row.group;
        this.body.append(element(document, "h4", "", group));
      }
      const label = element(document, "label", "dev-row");
      const input = element(document, "input");
      input.type = "range";
      input.min = String(row.min);
      input.max = String(row.max);
      input.step = String(row.step);
      input.value = String(row.initial);
      const value = element(document, "span", "dev-value", String(row.initial));
      input.addEventListener("input", () => this.set(i, Number(input.value)));
      label.append(element(document, "span", "dev-label", row.label), input, value);
      this.body.append(label);
      this.inputs.push({ input, value });
    });
    const reset = element(document, "button", "dev-button", "Reset");
    reset.type = "button";
    reset.addEventListener("click", () => this.reset());
    const logButton = element(document, "button", "dev-button", "Log values");
    logButton.type = "button";
    logButton.addEventListener("click", () => this.log(devValues(this.rows)));
    this.body.append(reset, logButton);
    panel.append(header, this.body);
    panel.hidden = true;
  }

  // Sets the number of a row, kept in its range, and moves its slider and its text.
  set(index, value) {
    const row = this.rows[index];
    const clamped = clampDev(row, value);
    row.object[row.key] = clamped;
    this.inputs[index].input.value = String(clamped);
    this.inputs[index].value.textContent = String(clamped);
  }

  reset() {
    resetDev(this.rows);
    this.rows.forEach((row, i) => this.set(i, row.initial));
  }

  // Shows the panel, or hides it (the key does this).
  toggle() {
    this.parts.panel.hidden = !this.parts.panel.hidden;
  }

  // Folds the sliders away and brings them back, so that the panel can stay up and not be in the way.
  fold() {
    this.collapsed = !this.collapsed;
    this.body.hidden = this.collapsed;
  }

  get visible() {
    return !this.parts.panel.hidden;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { devEnabled, devTable, clampDev, devValues, resetDev, DevPanel };
} else {
  Object.assign(window, { devEnabled, devTable, clampDev, devValues, resetDev, DevPanel });
}
```

Things to notice:

- **A slider is a row of a table:** a label, a group, *an object and the name of one of its numbers*, and a range. The row doesn't hold a value; it holds where the value is, so the slider changes `BOLT.speed` itself and the next bolt that is thrown goes at the new speed. The volumes of the sound are in it too (`AUDIO.master`, `AUDIO.sfx` and `AUDIO.music`), and because the frame puts the table's volumes into the graph, they are heard as the slider moves.
- **The table is a function, `devTable()`,** and not a constant. A constant would be made when the script is loaded, and would need every table that it names (`BOLT`, `EFFECTS`, `RULES`, `LIMITS`, `AUDIO`) to have been loaded before it; a function is called when the page wants it, and so the order of the script tags does not matter.
- **Every slider knows what it was at the start** (`initial`), so that **Reset** puts the game back as it was written, and **Log values** gives `console.table` the numbers by label.
- **Values are kept in range and on their steps** (`clampDev`), and rounded so that `0.1 + 0.2` is `0.3` and not a long number.
- **The panel can be folded away and hidden** with the \` key, so that it can stay up and not be in the way, and its presses do not go on to the board behind it.
- **Only some tables are in it, and the ones that are, are the ones that need tuning:** the effects (the numbers of the Elements tutorial), the pace of the waves, the volumes, the limit, and the speeds of three kinds of enemy (which take effect on the enemies that come on *after* the change, since a walker is made with its speed).

Its style:

```css
/* The developer panel, only there for ?dev: a narrow column of sliders at the top on the left, under the readouts, that can be folded
   away and hidden with the ` key. It is kept small so that it hides as little of the board as it can. */
#dev-panel {
  position: fixed;
  top: 92px;
  left: 12px;
  z-index: 27;
  width: 250px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 8px 10px;
  background: rgba(29, 17, 11, 0.88);
  color: #fff;
  border: 2px solid var(--gold);
  border-radius: 10px;
  font: 700 12px / 1.2 var(--small-font);
}
#dev-panel[hidden],
#dev-panel .dev-body[hidden] {
  display: none;
}
#dev-panel h4 {
  margin: 10px 0 4px;
  color: var(--gold);
  font: 700 12px / 1 var(--title-font);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
#dev-panel .dev-fold,
#dev-panel .dev-button {
  padding: 4px 8px;
  background: var(--parchment);
  color: var(--ink);
  border: 2px solid var(--ink);
  border-radius: 6px;
  font: 700 12px / 1 var(--small-font);
  cursor: pointer;
}
#dev-panel .dev-button {
  margin: 10px 6px 0 0;
}
#dev-panel .dev-row {
  display: grid;
  grid-template-columns: 1fr 44px;
  grid-template-areas: "label value" "slider slider";
  gap: 0 6px;
  margin: 4px 0;
}
#dev-panel .dev-label {
  grid-area: label;
}
#dev-panel .dev-value {
  grid-area: value;
  text-align: right;
  color: var(--gold);
}
#dev-panel input[type="range"] {
  grid-area: slider;
  width: 100%;
  margin: 2px 0 0;
}
```

and its tests, which make a table of two rows of an object of their own, and a panel from it:

```js
QUnit.module("devEnabled", () => {
  QUnit.test("is there for ?dev, with or without a value, and with other things in the address", (assert) => {
    assert.true(devEnabled("?dev"));
    assert.true(devEnabled("?dev=1"));
    assert.true(devEnabled("?map=1&dev"));
  });

  QUnit.test("is not there without it", (assert) => {
    assert.false(devEnabled(""));
    assert.false(devEnabled("?map=1"));
    assert.false(devEnabled("?device=1"), "and a name that begins with it is not it");
  });
});

QUnit.module("the dev table", () => {
  QUnit.test("every row has a number to change, in its range, with a label and a group", (assert) => {
    for (const row of devTable()) {
      assert.true(typeof row.object[row.key] === "number", row.label);
      assert.true(row.min < row.max && row.step > 0, row.label);
      assert.true(row.object[row.key] >= row.min && row.object[row.key] <= row.max, `${row.label}: ${row.object[row.key]} is in ${row.min} to ${row.max}`);
      assert.true(row.label.length > 0 && row.group.length > 0, row.label);
    }
  });

  QUnit.test("no two rows have the same label", (assert) => {
    const labels = devTable().map((row) => row.label);

    assert.strictEqual(new Set(labels).size, labels.length);
  });

  QUnit.test("the numbers that are in it are the ones that the game reads: they are the tables themselves", (assert) => {
    const rows = devTable();

    assert.true(rows.some((row) => row.object === BOLT && row.key === "speed"));
    assert.true(rows.some((row) => row.object === EFFECTS.slow));
    assert.true(rows.some((row) => row.object === LIMITS));
  });
});

QUnit.module("clampDev", () => {
  const row = { min: 1, max: 5, step: 0.5 };

  QUnit.test("keeps a value in the range", (assert) => {
    assert.strictEqual(clampDev(row, 0), 1);
    assert.strictEqual(clampDev(row, 9), 5);
  });

  QUnit.test("puts it on a step, from the least", (assert) => {
    assert.strictEqual(clampDev(row, 2.3), 2.5);
    assert.strictEqual(clampDev(row, 2.2), 2);
    assert.strictEqual(clampDev({ min: 0.1, max: 1, step: 0.1 }, 0.3), 0.3, "and a number that isn't exact in a computer is made right");
  });
});

QUnit.module("a DevPanel", (hooks) => {
  let parts, rows, thing, panel, logged;
  hooks.beforeEach(() => {
    const fixture = document.getElementById("qunit-fixture");
    parts = { panel: fixture.appendChild(document.createElement("div")) };
    thing = { a: 2, b: 10 };
    rows = [
      { group: "One", label: "a", object: thing, key: "a", min: 0, max: 4, step: 0.5 },
      { group: "Two", label: "b", object: thing, key: "b", min: 5, max: 20, step: 5 },
    ];
    logged = [];
    panel = new DevPanel(parts, document, rows, (values) => logged.push(values));
  });

  const sliders = () => [...parts.panel.querySelectorAll("input[type=range]")];
  const move = (slider, value) => {
    slider.value = String(value);
    slider.dispatchEvent(new Event("input"));
  };

  QUnit.test("it is out of sight until it is asked for, and the key shows it and puts it away", (assert) => {
    assert.false(panel.visible);
    panel.toggle();
    assert.true(panel.visible);
    panel.toggle();
    assert.false(panel.visible);
  });

  QUnit.test("it has a slider for each row, at the number now, with a heading for each group", (assert) => {
    assert.strictEqual(sliders().length, 2);
    assert.strictEqual(sliders()[0].value, "2");
    assert.strictEqual(sliders()[1].max, "20");
    assert.deepEqual([...parts.panel.querySelectorAll("h4")].map((h) => h.textContent), ["One", "Two"]);
  });

  QUnit.test("a slider changes the number that it is for, in the table itself, and shows it", (assert) => {
    move(sliders()[0], 3.5);

    assert.strictEqual(thing.a, 3.5);
    assert.strictEqual(parts.panel.querySelectorAll(".dev-value")[0].textContent, "3.5");
  });

  QUnit.test("a number is kept to its steps", (assert) => {
    move(sliders()[1], 12);

    assert.strictEqual(thing.b, 10);
  });

  QUnit.test("reset puts every number back to what it was when the panel was made", (assert) => {
    move(sliders()[0], 4);
    move(sliders()[1], 20);
    panel.reset();

    assert.deepEqual(thing, { a: 2, b: 10 });
    assert.strictEqual(sliders()[0].value, "2");
  });

  QUnit.test("the buttons reset and log the values, by label", (assert) => {
    move(sliders()[0], 1);
    const buttons = [...parts.panel.querySelectorAll(".dev-button")];
    buttons.find((b) => b.textContent === "Log values").click();
    buttons.find((b) => b.textContent === "Reset").click();

    assert.deepEqual(logged, [{ a: 1, b: 10 }]);
    assert.strictEqual(thing.a, 2);
  });

  QUnit.test("it can be folded away and brought back, and still be there", (assert) => {
    panel.toggle();
    panel.fold();
    assert.true(panel.visible);
    assert.true(panel.body.hidden);
    panel.fold();
    assert.false(panel.body.hidden);
  });

  QUnit.test("a press on the panel does not go on to the board behind it", (assert) => {
    let reached = 0;
    document.getElementById("qunit-fixture").addEventListener("pointerup", () => reached++);
    document.getElementById("qunit-fixture").addEventListener("pointerdown", () => reached++);
    for (const type of ["pointerup", "pointerdown"]) parts.panel.dispatchEvent(new PointerEvent(type, { bubbles: true }));

    assert.strictEqual(reached, 0);
  });
});

QUnit.module("devValues and resetDev", () => {
  QUnit.test("values are by label, and reset puts back what was there at the start", (assert) => {
    const thing = { x: 3 };
    const rows = [{ label: "x", object: thing, key: "x", initial: 3 }];
    thing.x = 9;

    assert.deepEqual(devValues(rows), { x: 9 });
    resetDev(rows);
    assert.strictEqual(thing.x, 3);
  });
});
```

- **"Every row has a number to change, in its range"** checks the real table: a number that moved out of its range (you made a bolt too fast to be a number a slider could have) is found here.
- **"The numbers that are in it are the ones that the game reads: they are the tables themselves"** is the test of the idea: the row's object *is* `BOLT`.

and in the game, one more block, at the end of `createScene`, makes the panel if the address asks for it and shows it with the key:

In `js/main.js`, after line 258, add:

```js
  // Developer mode: sliders for the numbers of the game, with `?dev` in the address, and the ` key to show them and put them away.
  if (devEnabled(window.location.search)) {
    const devPanel = new DevPanel({ panel: document.getElementById("dev-panel") }, document);
    window.addEventListener("keydown", (event) => {
      if (event.key === "`") devPanel.toggle();
    });
    devPanel.toggle();
  }

```

**Check:** open `tests.html`. 907 tests pass. Then open `index.html?go=1&dev`. The panel is at the left. Move *push: distance* all the way up and start a wave with a podium of air: it throws the enemies a long way back. Move *music volume* and hear it change. Reset puts it right. Press \` and it goes, and again and it is back.

---

## Step 8: Try it

Things to look for, and things to change. Change one, save, and refresh.

- **×3.** Start a wave at the fastest speed. Everything still hits what it aims at: the steps are as short as ever.
- **A tiny limit.** In the dev panel, set *most enemies on the board* to 5: the enemies come on a few at a time and the wave takes longer. Set it to 80 and nothing changes.
- **A slow phone.** Open the game with `?detail=high` in a window that is made very big (or with the browser's throttling on): after a few seconds it says that it has lowered the detail.
- **A choice that is kept.** Set the detail to *Low* on the pause screen, and reload: it is still low. Clear `tower_defense_preferences` in the browser's storage and it isn't. The sound is kept the same way.
- **Swap the music.** In `MUSIC.tracks`, swap the files of `build` and `battle`: the game is the same, and feels different. The files are a table because the order is a matter of ear.
- **A new sound.** Add a row to `SOUNDS` (a `crack`: `{ gap: 0.1, notes: [{ wave: "noise", from: 3000, to: 500, at: 0, seconds: 0.08, volume: 0.6 }] }`) and, in the hand, `this.hear("crack")` where you like: the table has it, `soundFor` finds it, and the test that says every effect is heard checks it.
- **Silence the fire nation.** Set the `volume` of both notes of `shot_burn` to `0.001`: the flames are silent, and the test that says every effect is heard fails and says which.
- **Tune something.** Play a wave with *slow: share of speed* at 0.2 and then at 0.8, and decide which you like. *Log values*, and put the number in `EFFECTS`.
- **A new slider.** Add a row for `RULES.lives` (`{ group: "Rules", label: "lives", object: RULES, key: "lives", min: 1, max: 50, step: 1 }`) and reload with `?dev`: it is in the panel. (It only takes effect for a game that is begun after the change.)
- **A fourth speed.** Add `4` to `SPEEDS`. The button goes ×1, ×2, ×3, ×4.

---

## Troubleshooting

- **The splash never goes and the console says `GameSpeed is not defined`, `Sound is not defined`, `startingDetail is not defined` or `devEnabled is not defined`:** the new file is missing from `index.html`, or has no export block, or the name is missing from it.
- **There is no sound at all:** nothing has been touched yet (tap the page once); or the sound is muted (*Sound: Off* on the pause screen, or `tower_defense_preferences` in the browser's storage says so); or `sound.start()` wasn't called from the first touch.
- **The effects work and the music doesn't:** the files aren't where `MUSIC.tracks` says (the page and the music are served from the same server, and the test that fetches them says which one is missing), or `music.start()` is only called before `sound.start()` has finished (it begins with `.then`).
- **`Failed to execute 'createMediaElementSource' ... already connected`:** `Music.start` ran twice. It has to do nothing the second time.
- **A track is cut off when it changes:** the fade is `0`, or `update` is not called every frame with the time that the frame took.
- **A fire nation tower sounds like a machine gun:** `gap` of `shot_burn` is `0`, so the six flames of a combo are six sounds.
- **`ReferenceError: setDetail is not defined`, or the speed button never appears:** a block of `main.js` went in the wrong place. The detail block (`const setDetail = ...`) goes right after `let comeOn = 0;`, the `sound:` line is a line *of the `world` object* (not of the frame), and the `?dev` block goes inside `createScene`, before `return { scene };`. In `screens.js`, `show` has a line for the speed button next to the line for the pause button.
- **Only some of the tests run, and `tests.html` finishes in a blink:** a `});` is in the wrong place in a test file (the last test of `balance.tests.js` before the one that you added has to be closed before the new one starts), so that the new test is *inside* another and the tests after it never run. The count of tests is the thing to check.
- **The game goes at the same speed with the button at ×3:** `advance` is called once with `dt`, and not once for each of `speed.steps(dt)`.
- **A faster game, and the bolts miss, or go through enemies:** the steps are longer, and not more: `dt * speed` is given to `advance` in one go.
- **The enemies' legs don't keep up at ×2:** `scene.animationTimeScale` isn't set when the speed changes.
- **The clouds don't go on Low:** `clouds.setVisible` isn't called by `setDetail`, or the clouds are made after it (the order in `main.js`: the clouds are made first).
- **The game says it has lowered the detail the moment the page comes back:** the meter isn't cleared when the game is paused (`meter.reset()` in the flow's listener), so the time on the pause screen was counted.
- **`ReferenceError: setDetail is not defined` when the detail button is pressed:** the screens' `detail` listener is registered before `setDetail` is made. It is fine for it to be *written* before, since it only runs when it is pressed, but the constant has to be made in the same function.
- **No panel with `?dev`:** `devEnabled` is given `window.location.href` and not `window.location.search`, or the page has no `dev-panel` element.
- **A slider does nothing:** its row names a key that is not a number of that object, or the game copied the number when it started (a `const` made from `BOLT.speed` at the top of a file) and doesn't read the table.

---

## What you have

A game that is good to play for someone else: it can be made faster, it can't be overloaded by a big wave, it draws as much as the device can bear (and chooses for itself when it can't), it makes its own sound effects from a table of recipes and plays three tracks of music that change with the game, and the numbers that you tuned by feel are one panel and one table away, behind a test suite of 907 tests.

**Credits:** the music is by Mykola Odnoroh and Tunetank, from Pixabay (see the [assets README](../assets/README.md)).

**Next up:** the editor. The [last tutorial](../tower_defense_editor/TUTORIAL.md) lets the player build a map: drop pieces of road and scenery on the board, have the route checked, and save it and share it.
