# Tutorial: Adding Waves to Asteroids

In this tutorial you'll turn "four new rocks appear when you clear the screen" into real, escalating **waves**. You write the code; this document tells you what to write and why.

By the end you'll have:

- Waves that get **bigger** (more rocks) and **faster** (rocks drift quicker) the longer you survive, with sensible caps
- A short **breather** between waves, with a centered **"WAVE 2"** announcement
- A **Wave** counter on the HUD
- **More varied rocks**: each one gets its own number of corners and its own roughness, so no two look alike
- A `Waves` class that holds the progression rules, with tests
- Unit tests for all of it

**What you'll learn:** a pure "director" class that is told what's happening and says what to do next, difficulty curves with caps, a countdown driven by `dt`, adding configurable behavior to an existing class and updating the tests that its change breaks, and how fixed `random()` sequences keep randomized code testable.

## Where you're starting

This folder is a copy of the finished Lives sample, plus two empty placeholder files for the new code:

```
asteroids_waves/
├── index.html
├── tests.html
├── js/
│   ├── wrap.js, collision.js, ship.js, bullets.js, rocks.js,
│   │   hud.js, game.js, main.js          (from the Lives sample)
│   └── waves.js                          (placeholder -- Step 1)
└── tests/
    ├── wrap / collision / ship / bullets / rocks / hud / game .tests.js   (from the Lives sample)
    └── waves.tests.js                    (placeholder -- Step 1)
```

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `js/` and `tests/` with a fresh copy of the Lives sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` is never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Open `index.html` in a browser now to confirm the game still works. Open `tests.html` too and note how many tests pass; you'll watch that number grow. Keep the developer console open (F12) as you work.

---

## Step 1: The progression rules

Right now `main.js` says: "if there are no rocks, spawn four." That has no pause, no difficulty curve, and no memory of which wave you're on. All of that is *rules*, so, as with `Game` in the last tutorial, it gets a small class of its own that knows nothing about rocks or the screen.

The design is a **director**: every frame, `main.js` tells it how many rocks are left, and it answers one question, "should a new wave start now?". `main.js` does the actual spawning.

Put this in `js/waves.js`:

```js
// Wave progression: when the next wave starts, and how hard it is. A wave is
// "all the rocks on screen"; shoot them all, get a short breather, and the next
// wave arrives with more rocks that move faster.
//
// Like Game, this knows nothing about rocks, ships, or the screen. It's fed the
// number of rocks left each frame and says when it's time to start a wave;
// main.js does the spawning. See ../tests/waves.tests.js.
class Waves {
  constructor({ breather = 2 } = {}) {
    this.breather = breather; // seconds between clearing a wave and the next one starting
    this.wave = 0; // 0 until the first wave starts
    this.countdown = 0; // seconds until the next wave, while waiting
    this.waiting = false;
  }

  // How many large rocks a wave starts with: four in wave 1, one more each
  // wave, and never more than nine so the screen stays playable.
  rocksFor(wave) {
    return Math.min(3 + wave, 9);
  }

  // How much faster than normal the rocks drift in a wave: normal in wave 1,
  // 12% faster each wave after, and never more than double.
  speedScaleFor(wave) {
    return Math.min(1 + 0.12 * (wave - 1), 2);
  }

  // True during the pause between waves, including the pause before wave 1.
  get between() {
    return this.waiting;
  }

  // Call once a frame with how many rocks are left. Returns true on the frame
  // a new wave should be spawned (and has already been counted in `wave`).
  update(dt, rocksLeft) {
    if (rocksLeft > 0) {
      this.waiting = false;
      return false;
    }

    // The screen is clear: start the breather the first time we notice.
    if (!this.waiting) {
      this.waiting = true;
      this.countdown = this.breather;
    }

    this.countdown -= dt;
    if (this.countdown > 0) return false;

    this.waiting = false;
    this.wave += 1;
    return true;
  }

  // Back to before wave 1.
  reset() {
    this.wave = 0;
    this.countdown = 0;
    this.waiting = false;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Waves;
} else {
  window.Waves = Waves;
}
```

Things to notice:

- **The difficulty curve is two tiny functions.** `rocksFor` and `speedScaleFor` take a wave number and return a number. Both use `Math.min(...)` to put a **cap** on growth: without it, wave 30 would have 33 rocks moving at 4x speed, which is unplayable, and the curve is easy to change in one place.
- **`update` is a small state machine** with two states, `waiting` or not. Rocks on screen means "not waiting". An empty screen starts a countdown *once* (the `if (!this.waiting)`), then each frame it counts down by `dt`. When the countdown runs out it bumps `wave`, stops waiting, and returns `true` for exactly one frame.
- **Why does the first wave also get a breather?** At the start there are no rocks, so the same rule fires: two seconds of "WAVE 1", then the rocks come in. Starting the game needs no special case.
- **A pause for the player.** Clearing the last rock and instantly being swamped is stressful in the wrong way. The breather gives a beat to recover, and a place for the announcement.
- `between` is a getter, a fact the HUD will read, while `update` and `reset` change state, the same split as in `Game`.

Test it. Put this in `tests/waves.tests.js`:

```js
QUnit.module("Waves difficulty", () => {
  QUnit.test("wave 1 starts with four rocks, then one more each wave", (assert) => {
    const waves = new Waves();

    assert.strictEqual(waves.rocksFor(1), 4);
    assert.strictEqual(waves.rocksFor(2), 5);
    assert.strictEqual(waves.rocksFor(3), 6);
  });

  QUnit.test("the number of rocks stops growing at nine", (assert) => {
    const waves = new Waves();

    assert.strictEqual(waves.rocksFor(6), 9);
    assert.strictEqual(waves.rocksFor(7), 9);
    assert.strictEqual(waves.rocksFor(50), 9);
  });

  QUnit.test("wave 1 runs at normal speed and each wave after is faster", (assert) => {
    const waves = new Waves();

    assert.strictEqual(waves.speedScaleFor(1), 1);
    assert.true(waves.speedScaleFor(2) > waves.speedScaleFor(1));
    assert.true(Math.abs(waves.speedScaleFor(2) - 1.12) < 1e-9);
    assert.true(Math.abs(waves.speedScaleFor(3) - 1.24) < 1e-9);
  });

  QUnit.test("rocks never get more than twice as fast", (assert) => {
    const waves = new Waves();

    assert.strictEqual(waves.speedScaleFor(20), 2);
    assert.strictEqual(waves.speedScaleFor(500), 2);
  });
});

QUnit.module("Waves progression", () => {
  QUnit.test("starts before wave 1, not waiting", (assert) => {
    const waves = new Waves();

    assert.strictEqual(waves.wave, 0);
    assert.false(waves.between);
  });

  QUnit.test("rocks on screen means nothing happens", (assert) => {
    const waves = new Waves();

    assert.false(waves.update(5, 3));
    assert.strictEqual(waves.wave, 0);
    assert.false(waves.between);
  });

  QUnit.test("an empty screen starts the breather", (assert) => {
    const waves = new Waves({ breather: 2 });

    assert.false(waves.update(0.1, 0), "not yet");
    assert.true(waves.between);
  });

  QUnit.test("the next wave starts once the breather has run out", (assert) => {
    const waves = new Waves({ breather: 2 });

    assert.false(waves.update(1, 0), "1s into a 2s breather");
    assert.false(waves.update(0.9, 0), "1.9s");
    assert.true(waves.update(0.2, 0), "2.1s: time to start");
    assert.strictEqual(waves.wave, 1);
    assert.false(waves.between, "the breather is over");
  });

  QUnit.test("a new wave is only announced once", (assert) => {
    const waves = new Waves({ breather: 1 });
    waves.update(1.5, 0); // starts wave 1

    // The caller spawns rocks, so the next frame there are some.
    assert.false(waves.update(0.016, 4));
    assert.strictEqual(waves.wave, 1);
  });

  QUnit.test("clearing a wave leads to the next, and the count keeps climbing", (assert) => {
    const waves = new Waves({ breather: 1 });

    waves.update(1.5, 0);
    assert.strictEqual(waves.wave, 1);

    waves.update(0.016, 4); // wave 1 is underway
    assert.true(waves.update(1.5, 0), "cleared, then the breather passes");
    assert.strictEqual(waves.wave, 2);
  });

  QUnit.test("shooting a rock during the breather cancels it", (assert) => {
    const waves = new Waves({ breather: 2 });
    waves.update(1, 0);
    assert.true(waves.between);

    waves.update(0.1, 1); // something is on screen again

    assert.false(waves.between);
  });

  QUnit.test("reset() goes back to before wave 1", (assert) => {
    const waves = new Waves({ breather: 1 });
    waves.update(1.5, 0);
    waves.update(0.5, 0);

    waves.reset();

    assert.strictEqual(waves.wave, 0);
    assert.false(waves.between);
    assert.false(waves.update(0.5, 0), "the breather starts over from the full length");
  });
});
```

Add the script and its tests to `tests.html`, next to the others:

```html
  <script src="js/waves.js"></script>
```
```html
  <script src="tests/waves.tests.js"></script>
```

Reload `tests.html`: **12 more** tests, all green.

---

## Step 2: More varied rocks, and a speed multiplier

`RockField` needs two things: rocks that **don't all look alike**, and a **speed scale** so later waves can drift faster.

> You might have expected a "safe spawn distance" step here. It's already done: `populate()` has kept new rocks at least `safeDistance` from the ship since the Rocks tutorial, and every wave now goes through it.

Open `js/rocks.js`.

### 2a. New options

In the constructor's option list, keep `scene = null,` and replace the four lines after it (`vertices = 10, ...`, `maxSpin = 1.5, ...`, `color = "#bbbbbb",` and `random = Math.random,`) with:

```js
    minVertices = 8, // fewest corners a rock's outline can have
    maxVertices = 13, // most corners
    minRoughness = 0.1, // how far a corner may be pulled in: 0 would be a perfect polygon
    maxRoughness = 0.35,
    maxSpin = 1.5, // rad/s, in either direction
    color = "#bbbbbb",
    speedScale = 1, // multiplies every random speed; main.js raises it each wave
    random = Math.random,
```

Then, in the constructor body, replace these three lines:

```js
    this.vertices = vertices;
    this.maxSpin = maxSpin;
    this.color = color;
```

with the matching fields:

```js
    this.minVertices = minVertices;
    this.maxVertices = maxVertices;
    this.minRoughness = minRoughness;
    this.maxRoughness = maxRoughness;
    this.maxSpin = maxSpin;
    this.color = color;
    this.speedScale = speedScale;
```

(Keep `this.scene = scene;` above them and `this.rocks = [];` / `this._random = random;` below them.)

### 2b. Give every rock its own shape

In `spawn()`, find this block:

```js
    // Each corner sits between 80% and 100% of the rock's radius from its
    // center, so the outline is lumpy but never pokes outside the circle used
    // for collisions.
    const shape = [];
    for (let i = 0; i < this.vertices; i++) {
      shape.push(0.8 + this._random() * 0.2);
    }
```

and replace it with:

```js
    // Every rock gets its own number of corners and its own roughness, so no
    // two outlines look alike. Each corner sits between (1 - roughness) and
    // 100% of the rock's radius from its center, so the outline is lumpy but
    // never pokes outside the circle used for collisions.
    const vertexCount = this.minVertices + Math.floor(this._random() * (this.maxVertices - this.minVertices + 1));
    const roughness = this.minRoughness + this._random() * (this.maxRoughness - this.minRoughness);
    const shape = [];
    for (let i = 0; i < vertexCount; i++) {
      shape.push(1 - this._random() * roughness);
    }
```

Then store the roughness on the rock. In the `const rock = { ... }` record, add it just before `shape,`:

```js
      spin: (this._random() * 2 - 1) * this.maxSpin,
      roughness,
      shape,
```

Things to notice:

- **A random whole number in a range:** `min + Math.floor(random() * (max - min + 1))`. The `+ 1` is what makes `max` reachable, because `random()` never reaches 1.
- **Roughness is per rock.** A rock with roughness 0.1 is nearly a regular polygon; one with 0.35 is jagged. Corners are pulled in by up to `roughness`, never pushed out, so the visible outline still stays inside the collision circle, and collisions never feel unfair.
- `_attach()` already builds the outline from `rock.shape.length`, so it needs no change. The drawing code never assumed ten corners.
- The order of the `random()` calls matters to tests. It's now: corner count, roughness, each corner, spin.

### 2c. The speed scale

Two places generate a random speed. In `destroy()`, find:

```js
      const speed = childConfig.minSpeed + this._random() * (childConfig.maxSpeed - childConfig.minSpeed);
```

and replace it with:

```js
      const speed =
        (childConfig.minSpeed + this._random() * (childConfig.maxSpeed - childConfig.minSpeed)) * this.speedScale;
```

And in `_randomVelocity()`, find:

```js
    const speed = config.minSpeed + this._random() * (config.maxSpeed - config.minSpeed);
```

and replace it with:

```js
    const speed = (config.minSpeed + this._random() * (config.maxSpeed - config.minSpeed)) * this.speedScale;
```

> **Why scale the pieces too?** If only the starting rocks were faster, shooting one would produce pieces at the *old* speed and the escalation would melt away after the first hit. A wave should stay fast all the way down to the smallest piece.
>
> A velocity you pass in to `spawn()` explicitly is **not** scaled: the caller chose it, and `destroy()` already scaled the kick it computed.

### 2d. Update the tests this broke

Reload `tests.html`. Two tests now **fail**, because they describe the old behavior:

- *"spawn() gives each rock a lumpy outline…"*: it asked for `vertices: 12`, an option that no longer exists.
- *"each rock gets a closed outline mesh"*: it asked for `vertices: 8`, so it no longer gets 9 points.

A third test, *"spin ranges from -maxSpin to +maxSpin"*, still passes, but **only by accident**. It also passes the removed `vertices` option, so `spawn()` now makes a random number of corners and the scripted `random()` sequence lands on the right value by coincidence. It describes the wrong number of calls, so update it too. A test that passes for the wrong reason is worse than one that fails, because it will break mysteriously later.

In `tests/rocks.tests.js`, replace the outline test:

```js
  QUnit.test("spawn() gives each rock a lumpy outline that stays inside its collision circle", (assert) => {
    const rock = new RockField({ minVertices: 12, maxVertices: 12 }).spawn("large", 0, 0);

    assert.strictEqual(rock.shape.length, 12);
    assert.true(
      rock.shape.every((f) => f >= 1 - rock.roughness && f <= 1),
      "every corner is between (1 - roughness) and 100% of the radius"
    );
  });
```

Replace the three lines that build `negative`, `positive` and `still` in the spin test (and the comment above them) with:

```js
    // With a velocity supplied and a single corner, spawn() calls random() four
    // times: the corner count, the roughness, the corner itself, then the spin.
    const one = { minVertices: 1, maxVertices: 1, maxSpin: 2 };
    const negative = new RockField({ ...one, random: sequence([0.5, 0.5, 0.5, 0]) });
    const positive = new RockField({ ...one, random: sequence([0.5, 0.5, 0.5, 1]) });
    const still = new RockField({ ...one, random: sequence([0.5, 0.5, 0.5, 0.5]) });
```

(The `const velocity = ...` line and the three assertions below it stay as they are.)

And in the rendering tests, change the one line that creates the field:

```js
    const field = new RockField({ scene: {}, minVertices: 8, maxVertices: 8, color: "#ff0000" });
```

Reload `tests.html`: all green again.

### 2e. New tests

Add this to the **end** of `tests/rocks.tests.js`:

```js
QUnit.module("RockField variety", () => {
  QUnit.test("rocks get different numbers of corners, always within the range", (assert) => {
    const field = new RockField({ minVertices: 8, maxVertices: 13 });
    const counts = new Set();

    for (let i = 0; i < 200; i++) {
      const count = field.spawn("large", 0, 0).shape.length;
      assert.true(count >= 8 && count <= 13, `${count} corners is in range`);
      counts.add(count);
    }

    assert.true(counts.size > 1, "not every rock has the same number of corners");
  });

  QUnit.test("each rock gets its own roughness within the range", (assert) => {
    const field = new RockField({ minRoughness: 0.1, maxRoughness: 0.35 });
    const values = new Set();

    for (let i = 0; i < 100; i++) {
      const { roughness } = field.spawn("large", 0, 0);
      assert.true(roughness >= 0.1 && roughness <= 0.35, `${roughness} is in range`);
      values.add(roughness);
    }

    assert.true(values.size > 1, "not every rock is equally rough");
  });

  QUnit.test("the random source picks the corner count and roughness", (assert) => {
    const velocity = { vx: 0, vy: 0 };
    const lowest = new RockField({ random: sequence([0]) }).spawn("large", 0, 0, velocity);
    const highest = new RockField({ random: sequence([0.999999]) }).spawn("large", 0, 0, velocity);

    assert.strictEqual(lowest.shape.length, 8, "random() = 0 gives the minimum corners");
    assert.strictEqual(lowest.roughness, 0.1);
    assert.strictEqual(highest.shape.length, 13, "random() just under 1 gives the maximum");
    assert.true(Math.abs(highest.roughness - 0.35) < 1e-3);
  });
});

QUnit.module("RockField speed scale", () => {
  QUnit.test("a random velocity is multiplied by the speed scale", (assert) => {
    // random() = 0 gives heading 0 (straight right) and the size's slowest speed.
    const normal = new RockField({ random: sequence([0]) }).spawn("large", 0, 0);
    const doubled = new RockField({ speedScale: 2, random: sequence([0]) }).spawn("large", 0, 0);

    assert.true(Math.abs(normal.vx - RockField.SIZES.large.minSpeed) < 1e-9);
    assert.true(Math.abs(doubled.vx - 2 * RockField.SIZES.large.minSpeed) < 1e-9);
  });

  QUnit.test("a velocity you supply is never scaled", (assert) => {
    const rock = new RockField({ speedScale: 3 }).spawn("large", 0, 0, { vx: 1, vy: 2 });

    assert.strictEqual(rock.vx, 1);
    assert.strictEqual(rock.vy, 2);
  });

  QUnit.test("the speed scale can be changed between waves", (assert) => {
    const field = new RockField({ random: sequence([0]) });
    const first = field.spawn("small", 0, 0);

    field.speedScale = 2;
    const second = field.spawn("small", 0, 0);

    assert.true(Math.abs(second.vx - 2 * first.vx) < 1e-9);
  });

  QUnit.test("the pieces of a destroyed rock are scaled too", (assert) => {
    const field = new RockField({ speedScale: 2, random: sequence([0]) });
    const rock = field.spawn("large", 0, 0, { vx: 0, vy: 0 });

    const [a, b] = field.destroy(rock).children;

    // random() = 0: one piece goes straight right, the other straight left,
    // at the medium size's slowest speed, doubled.
    const expected = 2 * RockField.SIZES.medium.minSpeed;
    assert.true(Math.abs(a.vx - expected) < 1e-9);
    assert.true(Math.abs(b.vx + expected) < 1e-9);
  });
});
```

Reload `tests.html`: **7 more** tests, all green.

> **The trick with `sequence([0])`.** A `random()` that always returns 0 makes every "random" choice take its minimum: slowest speed, heading 0 (straight right), fewest corners. That turns a random process into a predictable one you can do arithmetic on. This is what injecting the random source (`random = Math.random`) buys you.

---

## Step 3: A wave counter and an announcement

The HUD needs two more labels: a `Wave:` counter under the lives, and a centered message ("WAVE 2") for the breather.

Open `js/hud.js`.

### 3a. State

In the constructor, add the wave and the two new label fields. The block becomes:

```js
    this.score = 0;
    this.lives = lives;
    this.wave = 0;

    this.ui = null;
    this.scoreLabel = null;
    this.livesLabel = null;
    this.waveLabel = null;
    this.gameOverLabel = null;
    this.announcementLabel = null;
```

### 3b. The wave label

In `attachTo()`, directly after `this.ui.addControl(this.livesLabel);`, add:

```js

    this.waveLabel = new BABYLON.GUI.TextBlock();
    this.waveLabel.height = "30px";
    this.waveLabel.color = "white";
    this.waveLabel.fontSize = 24;
    this.waveLabel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.waveLabel.top = "116px"; // just below the lives
    this.waveLabel.isHitTestVisible = false;
    this.ui.addControl(this.waveLabel);
```

### 3c. The announcement label

Still in `attachTo()`, directly after `this.ui.addControl(this.gameOverLabel);`, add:

```js

    // "WAVE 2" and the like, shown in the middle of the screen between waves.
    this.announcementLabel = new BABYLON.GUI.TextBlock();
    this.announcementLabel.color = "white";
    this.announcementLabel.fontSize = 40;
    this.announcementLabel.outlineWidth = 5;
    this.announcementLabel.outlineColor = "#050508";
    this.announcementLabel.isVisible = false;
    this.announcementLabel.isHitTestVisible = false;
    this.ui.addControl(this.announcementLabel);
```

### 3d. Dispose, and the new methods

Two small changes in `dispose()`: the list of labels in the `for` loop gains the two new ones, and the fields get nulled for the two new labels as well. When you're done the whole method should read like this. Check yours against it, especially the `this.ui = null;` and `this.scoreLabel = null;` lines, which are easy to lose while editing:

```js
  // Removes and disposes the labels, if attached.
  dispose() {
    if (!this.scoreLabel) return;
    for (const label of [this.scoreLabel, this.livesLabel, this.waveLabel, this.gameOverLabel, this.announcementLabel]) {
      this.ui.removeControl(label);
      label.dispose();
    }
    this.ui = null;
    this.scoreLabel = null;
    this.livesLabel = null;
    this.waveLabel = null;
    this.gameOverLabel = null;
    this.announcementLabel = null;
  }
```

> **Why the early `return`?** `if (!this.scoreLabel) return;` is what makes a second `dispose()` safe. It only works because the method sets `scoreLabel` to `null` at the end, which is why the "dispose() removes and disposes the label" test checks for exactly that.

Add these methods just above `showGameOver()`:

```js
  // Shows which wave the player is on. Wave 0 (before the first starts) shows nothing.
  setWave(wave) {
    this.wave = wave;
    this._syncLabel();
  }

  // Shows a message in the middle of the screen, such as "WAVE 2".
  showAnnouncement(text) {
    if (!this.announcementLabel) return;
    this.announcementLabel.text = text;
    this.announcementLabel.isVisible = true;
  }

  hideAnnouncement() {
    if (this.announcementLabel) this.announcementLabel.isVisible = false;
  }
```

And in `_syncLabel()`, add one line after the lives line:

```js
    this.livesLabel.text = `Lives: ${this.lives}`;
    this.waveLabel.text = this.wave > 0 ? `Wave: ${this.wave}` : "";
```

Things to notice:

- The announcement's **text isn't fixed**; `showAnnouncement(text)` takes it. The same label can announce "WAVE 2" now and something else in a later step (a bonus, a boss).
- It has no `top` or `verticalAlignment`, so it keeps the GUI's default centering, like the Game Over message. The two never show together, because `main.js` will hide the announcement when the game ends.
- Before wave 1 the counter would say `Wave: 0`, which reads oddly, so wave 0 shows an empty string.

### 3e. Tests (and the control count, again)

The HUD now creates **five** controls. Reload `tests.html` and you'll see the same test fail as last time. Edit it in place (don't paste a second copy):

```js
    assert.strictEqual(ui.controls.length, 5, "score, lives, wave, game over, and announcement");
```

In the first module (`QUnit.module("Hud", ...)`), add this after the `remembers the lives it is told about` test:

```js
  QUnit.test("remembers the wave it is told about", (assert) => {
    const hud = new Hud();
    assert.strictEqual(hud.wave, 0);

    hud.setWave(4);
    assert.strictEqual(hud.wave, 4);
  });
```

The rest use `FakeUi`, which only exists *inside* the `Hud rendering` module, so they must go inside it. Add them after that module's last test and **before** the `});` that closes the module, which is the last line of the file. When you're done the file should end with your last new test followed by that one `});`:

```js
  QUnit.test("shows the wave number, and nothing before the first wave", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    assert.strictEqual(hud.waveLabel.text, "", "wave 0 shows nothing");

    hud.setWave(3);
    assert.strictEqual(hud.waveLabel.text, "Wave: 3");
  });

  QUnit.test("the announcement starts hidden, then shows the text it is given", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    assert.false(hud.announcementLabel.isVisible, "hidden to begin with");

    hud.showAnnouncement("WAVE 2");
    assert.true(hud.announcementLabel.isVisible);
    assert.strictEqual(hud.announcementLabel.text, "WAVE 2");

    hud.hideAnnouncement();
    assert.false(hud.announcementLabel.isVisible);
  });

  QUnit.test("the announcement doesn't intercept pointer events", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.false(hud.announcementLabel.isHitTestVisible);
  });

  QUnit.test("announcing without a ui does nothing", (assert) => {
    const hud = new Hud();

    hud.showAnnouncement("WAVE 1");
    hud.hideAnnouncement();

    assert.strictEqual(hud.announcementLabel, null);
  });
```

Reload `tests.html`: **5 more** tests, all green.

---

## Step 4: Wire it together

Now `main.js` hands control of the rocks to the waves.

### 4a. `index.html`

Add `waves.js` to the script list, with the other classes and before `main.js` (add the one line; don't add a second copy of the others):

```html
  <script src="js/game.js"></script>
  <script src="js/waves.js"></script>
  <script src="js/main.js"></script>
```

### 4b. `js/main.js`

**1.** Delete this constant, since the waves decide how many rocks now:

```js
const START_ROCKS = 4; // large rocks on screen at the start
```

(`SAFE_DISTANCE` stays.)

**2.** Replace the `populateRocks` definition and call:

```js
  const populateRocks = () => rocks.populate(START_ROCKS, { halfWidth, halfHeight }, ship, SAFE_DISTANCE);
  populateRocks();
```

with a `Waves` and a `startWave` function:

```js
  const waves = new Waves();

  // Brings in the rocks for the wave that just started. Each wave has more of
  // them, and they drift faster.
  const startWave = () => {
    rocks.speedScale = waves.speedScaleFor(waves.wave);
    rocks.populate(waves.rocksFor(waves.wave), { halfWidth, halfHeight }, ship, SAFE_DISTANCE);
    hud.setWave(waves.wave);
  };
```

There are no rocks at the start any more: the first frame sees an empty screen, which begins the breather for wave 1.

**3.** When the game ends, hide any announcement. In `crash`, find:

```js
      ship.setVisible(false);
      hud.showGameOver();
```

and add a line between them:

```js
      ship.setVisible(false);
      hud.hideAnnouncement();
      hud.showGameOver();
```

**4.** Make **R** restart the waves. In the `KeyR` branch of the `keydown` handler, replace the `populateRocks();` line with two:

```js
      hud.hideGameOver();
      waves.reset();
      hud.setWave(waves.wave);
      return;
```

(Everything above it in that branch stays.) `rocks.clear()` has already emptied the field, so the next frame starts the breather before wave 1 again.

**5.** Drive the waves each frame. Near the end of the `onBeforeRenderObservable` callback, find:

```js
    // Everything shot? Bring in a fresh set. (A later step turns this into
    // proper waves.)
    if (rocks.rocks.length === 0) populateRocks();
```

and replace it with:

```js
    // Wave progression: when the screen is clear, count down, then start the
    // next wave. Nothing to announce once the game is over.
    if (!game.over) {
      if (waves.update(dt, rocks.rocks.length)) startWave();
      if (waves.between) hud.showAnnouncement(`WAVE ${waves.wave + 1}`);
      else hud.hideAnnouncement();
    }
```

Things to notice:

- `waves.update` returns `true` for one frame; `startWave()` then spawns rocks, so on the same frame `between` is already false and the announcement hides.
- During the breather, `waves.wave` is still the wave that was just *cleared*, so the announcement says `waves.wave + 1`: the one that's coming.
- `main.js` is still the only code that knows about both `Waves` and `RockField`. Neither knows the other exists.

### 4c. Try it

Reload `index.html`:

- [ ] The screen starts empty with **WAVE 1** in the middle, then four rocks drift in, with **Wave: 1** on the HUD
- [ ] The rocks are visibly **not all the same shape**: different numbers of corners, some jagged, some nearly smooth
- [ ] Shoot every rock (including all the pieces); **WAVE 2** appears for about two seconds, then **five** rocks arrive
- [ ] Each wave the rocks look a little quicker, and the small pieces are too
- [ ] Crashing into rocks still costs lives; on Game Over the announcement is gone
- [ ] **R** restarts at **WAVE 1**, with the counter blank until it begins

**If something's wrong:** `Waves is not defined` means the script tag from 4a is missing. If the rocks arrive instantly or never, check that you deleted the old `populateRocks()` call and that step 5 is inside the `onBeforeRenderObservable` callback.

**Experiments** (change one, reload, then change it back):

- `new Waves({ breather: 5 })` for a long, restful pause
- In `waves.js`, change `0.12` to `0.4` and see how quickly it becomes impossible
- `minRoughness: 0.4, maxRoughness: 0.5` in `new RockField(...)` for very jagged rocks
- Set `minVertices: 5, maxVertices: 6` for chunky, almost-geometric rocks

---

## Step 5: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js"></script>
  <script src="js/wrap.js"></script>
  <script src="js/collision.js"></script>
  <script src="js/ship.js"></script>
  <script src="js/bullets.js"></script>
  <script src="js/rocks.js"></script>
  <script src="js/hud.js"></script>
  <script src="js/game.js"></script>
  <script src="js/waves.js"></script>
  <script src="tests/wrap.tests.js"></script>
  <script src="tests/collision.tests.js"></script>
  <script src="tests/ship.tests.js"></script>
  <script src="tests/bullets.tests.js"></script>
  <script src="tests/rocks.tests.js"></script>
  <script src="tests/hud.tests.js"></script>
  <script src="tests/game.tests.js"></script>
  <script src="tests/waves.tests.js"></script>
```

Open it. You should see **138 passing tests** in total (139 if you added the diagonal muzzle test in the Bullets tutorial): the 114 you started with, plus 12 for `Waves`, 7 for `RockField`, and 5 for the HUD.

> **Try breaking something.** Change `Math.min(3 + wave, 9)` to `Math.min(3 + wave, 99)` in `rocksFor`, reload `tests.html`, and see which test notices. Then put it back.

---

## Step 6: Publish the sample

**Gallery.** In the root `index.html`, find the Asteroids series and give "Asteroids Waves" a `slug` and `tutorial: true`:

```js
          { slug: "asteroids_waves", tutorial: true, title: "Asteroids Waves", description: "Escalating waves: more and faster rocks each time, a WAVE announcement, and rocks that each have their own shape." },
```

**Root README.** Add a line to the Asteroids list in the top-level `README.md`.

**Series roadmap.** In `samples/asteroids/README.md`, link row 5 of the table to `asteroids_waves/README.md` and its tutorial.

**Previous README.** In `samples/asteroids/asteroids_lives/README.md`, change the "Next up" line to link to Asteroids Waves.

**Sample README.** Add `samples/asteroids/asteroids_waves/README.md`, using the Lives README as a template. When you're ready, ask me and I'll draft it from your finished code.

---

## Recap: what you built

| Concept | Where |
|---|---|
| A rules-only "director" fed facts, answering one question | `Waves.update` |
| Difficulty curves with caps | `rocksFor`, `speedScaleFor` |
| A small state machine and a `dt` countdown | `waiting`, `countdown` |
| A random whole number in a range | `minVertices + floor(random * (max - min + 1))` |
| A multiplier that applies down the whole split chain | `speedScale` in `_randomVelocity` and `destroy` |
| Tests that break for good reasons, and one that passes for a bad one | the `vertices` option |
| Predictable "randomness" for tests | `sequence([0])` |
| A reusable on-screen message | `showAnnouncement(text)` |

## Challenges

1. **Bonus for clearing a wave.** Award points for finishing a wave, bigger for faster clears. (Hint: `Waves` could track how long the wave lasted.)
2. **Rocks from the edges.** Spawn new rocks just off the screen edge rather than anywhere, as in the arcade game. (Hint: a position of `±(halfWidth + radius)` is exactly where wrapping puts a rock that just left the screen.)
3. **A harder curve.** Replace the straight-line speed-up with one that starts slow and ramps up. (Hint: `Math.pow`, and update the tests.)
4. **Boss waves.** Every fifth wave, start with one huge rock instead of many. (Hint: `ROCK_SIZES` is a table, so a fourth, `huge` size is a new row.)

**Up next:** *Asteroids UFO* adds an enemy saucer that crosses the screen and fires back, with simple aiming math.
